import { Recipe, MealPlanItem, Category } from '../types';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Configuration
// Using process.env for environment variables to avoid ImportMeta type issues.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ngaamhimxwgflkiiqbkb.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_narN8GdzpJEVTVZERb95VQ_6XAPOsgb';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface UserProfile {
  name: string;
  avatar: string;
  tagline?: string;
  householdId?: string;
  // Custom Titles
  titles?: {
    home?: string;
    planner?: string;
    plannerSubtitle?: string;
    shopping?: string;
  }
}

export interface Household {
  id: string;
  name: string;
  code: string; 
}

interface StorageService {
  loadData: () => Promise<{ recipes: Recipe[], plan: MealPlanItem[], profile: UserProfile }>;
  saveData: (key: string, data: any) => Promise<void>;
  createHousehold: (name: string) => Promise<Household>;
  joinHousehold: (code: string) => Promise<Household | null>;
  leaveHousehold: () => Promise<void>;
  updateHouseholdName: (id: string, name: string) => Promise<void>;
  getHousehold: () => Household | null;
  subscribeToChanges: (householdId: string, onChange: () => void) => { unsubscribe: () => void };
  syncLocalToCloud: (householdId: string, localRecipes: Recipe[], localPlan: MealPlanItem[]) => Promise<void>;
}

class SupabaseStorageService implements StorageService {
  
  // Helper to migrate legacy categories
  private migrateRecipe(r: any): Recipe {
    let category = r.category;
    // Migration: Map old 'Lunch'/'Dinner' strings to '正餐'
    if (category === '午餐' || category === '晚餐') {
      category = Category.MainMeal;
    }
    
    return {
      ...r,
      category,
      tags: r.tags || [] // Ensure tags exist
    };
  }

  async loadData() {
    // 1. Load Profile (Local Only)
    const savedProfile = localStorage.getItem('sharebite_profile');
    let profile: UserProfile = savedProfile 
      ? JSON.parse(savedProfile) 
      : { 
          name: '我的食堂', 
          avatar: '🐧', 
          tagline: '今天也要好好吃饭',
          titles: {
            home: '企鹅食堂',
            planner: '饮食计划',
            plannerSubtitle: 'Meal Planner',
            shopping: '购物清单'
          }
        };
    
    // Ensure tagline exists (migration)
    if (!profile.tagline) profile.tagline = '今天也要好好吃饭';
    // Ensure titles exist (migration)
    if (!profile.titles) {
      profile.titles = {
        home: '企鹅食堂',
        planner: '饮食计划',
        plannerSubtitle: 'Meal Planner',
        shopping: '购物清单'
      };
    }

    // 2. Check Household
    const household = this.getHousehold();
    let recipes: Recipe[] = [];
    let plan: MealPlanItem[] = [];

    if (household) {
      // Cloud Mode: Fetch from Supabase
      try {
        // Fetch recipes
        const { data: recipesData } = await supabase
          .from('recipes')
          .select('*')
          .eq('household_id', household.id);
        
        if (recipesData) {
          recipes = recipesData.map((row: any) => this.migrateRecipe(row.data));
        }

        // Fetch plans
        const { data: plansData } = await supabase
          .from('plans')
          .select('*')
          .eq('household_id', household.id);

        if (plansData) {
          plan = plansData.map((row: any) => ({
             id: row.id,
             date: row.date,
             type: row.type,
             recipeId: row.recipe_id
          }));
        }

        // Fetch latest household name (in case it changed remotely)
        const { data: householdData } = await supabase
           .from('households')
           .select('name')
           .eq('id', household.id)
           .single();
        
        if (householdData && householdData.name !== household.name) {
           household.name = householdData.name;
           localStorage.setItem('sharebite_household', JSON.stringify(household));
        }

      } catch (e) {
        console.error("Supabase load error:", e);
      }
    } else {
      // Local Mode: Fetch from LocalStorage
      const rawRecipes = JSON.parse(localStorage.getItem('sharebite_recipes') || '[]');
      recipes = rawRecipes.map((r: any) => this.migrateRecipe(r));
      
      plan = JSON.parse(localStorage.getItem('sharebite_plan') || '[]');
    }
    
    return { recipes, plan, profile };
  }

  // Merges local data into the cloud when joining/creating a household
  async syncLocalToCloud(householdId: string, localRecipes: Recipe[], localPlan: MealPlanItem[]) {
    try {
      console.log("Syncing local data to cloud for household:", householdId);
      
      // Upsert Recipes
      if (localRecipes.length > 0) {
        const rows = localRecipes.map(r => ({
          id: r.id,
          household_id: householdId,
          title: r.title,
          data: r
        }));
        await supabase.from('recipes').upsert(rows);
      }

      // Upsert Plans
      if (localPlan.length > 0) {
        const rows = localPlan.map(p => ({
          id: p.id,
          household_id: householdId,
          date: p.date,
          type: p.type,
          recipe_id: p.recipeId
        }));
        await supabase.from('plans').upsert(rows);
      }
    } catch (e) {
      console.error("Sync to cloud failed:", e);
      throw e;
    }
  }

  async saveData(key: string, data: any) {
    if (key === 'profile') {
      localStorage.setItem(`sharebite_${key}`, JSON.stringify(data));
      return;
    }

    const household = this.getHousehold();

    if (!household) {
      localStorage.setItem(`sharebite_${key}`, JSON.stringify(data));
      return;
    }

    try {
      if (key === 'recipes') {
        const recipes = data as Recipe[];
        const { data: remoteRows } = await supabase.from('recipes').select('id').eq('household_id', household.id);
        const remoteIds = new Set((remoteRows as any[] || []).map((r) => String(r.id)));
        const localIds = new Set(recipes.map(r => r.id));

        const toDelete = [...remoteIds].filter(id => !localIds.has(id));
        if (toDelete.length > 0) {
          await supabase.from('recipes').delete().in('id', toDelete);
        }

        if (recipes.length > 0) {
          const rows = recipes.map(r => ({
            id: r.id,
            household_id: household.id,
            title: r.title,
            data: r
          }));
          await supabase.from('recipes').upsert(rows);
        }

      } else if (key === 'plan') {
        const planItems = data as MealPlanItem[];
        const { data: remoteRows } = await supabase.from('plans').select('id').eq('household_id', household.id);
        const remoteIds = new Set((remoteRows as any[] || []).map((r) => String(r.id)));
        const localIds = new Set(planItems.map(p => p.id));

        const toDelete = [...remoteIds].filter(id => !localIds.has(id));
        if (toDelete.length > 0) {
          await supabase.from('plans').delete().in('id', toDelete);
        }

        if (planItems.length > 0) {
           const rows = planItems.map(p => ({
             id: p.id,
             household_id: household.id,
             date: p.date,
             type: p.type,
             recipe_id: p.recipeId
           }));
           await supabase.from('plans').upsert(rows);
        }
      }
    } catch (e) {
      console.error(`Supabase save error for ${key}:`, e);
    }
  }

  async createHousehold(name: string): Promise<Household> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('households')
      .insert([{ name, code }])
      .select()
      .single();

    if (error || !data) throw new Error('Failed to create household');

    const household: Household = {
      id: data.id,
      name: data.name,
      code: data.code
    };
    
    localStorage.setItem('sharebite_household', JSON.stringify(household));
    return household;
  }

  async joinHousehold(code: string): Promise<Household | null> {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !data) return null;

    const household: Household = {
      id: data.id,
      name: data.name,
      code: data.code
    };

    localStorage.setItem('sharebite_household', JSON.stringify(household));
    return household;
  }

  async updateHouseholdName(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('households')
      .update({ name })
      .eq('id', id);
    
    if (error) throw error;
    
    // Update local cache
    const current = this.getHousehold();
    if (current && current.id === id) {
      current.name = name;
      localStorage.setItem('sharebite_household', JSON.stringify(current));
    }
  }

  async leaveHousehold() {
    localStorage.removeItem('sharebite_household');
  }

  getHousehold() {
    const s = localStorage.getItem('sharebite_household');
    return s ? JSON.parse(s) : null;
  }

  subscribeToChanges(householdId: string, onChange: () => void) {
    const channel = supabase
      .channel('room-1')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter: `household_id=eq.${householdId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans', filter: `household_id=eq.${householdId}` }, onChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${householdId}` }, 
        (payload) => {
           // Specifically handle name updates in real-time
           if (payload.new && payload.new.name) {
              const current = this.getHousehold();
              if (current) {
                current.name = payload.new.name;
                localStorage.setItem('sharebite_household', JSON.stringify(current));
              }
           }
           onChange();
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  }
}

export const storage = new SupabaseStorageService();
