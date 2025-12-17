
export enum Category {
  Breakfast = '早餐',
  MainMeal = '正餐', // Merged Lunch and Dinner
  Snack = '小食/甜点',
  Drink = '饮品',
  Other = '其他',
  Message = '留言', // Internal use for Kitchen Board
  ShoppingList = '清单数据', // Internal use for Shopping List Persistence
}

export interface Ingredient {
  name: string;
  amount: string;
  checked?: boolean; // For shopping list
}

export interface RecipeStep {
  description: string;
  image?: string; // URL or Base64
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string; // URL or Base64
  category: Category;
  tags?: string[]; // New: Multiple tags support
  ingredients: Ingredient[];
  steps: RecipeStep[];
  createdAt: number;
  isFavorite?: boolean;
  rating?: number; // 0 to 5
}

export interface MealPlanItem {
  id: string; // unique plan id
  date: string; // YYYY-MM-DD
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: string;
}

export type ViewState = 'recipes' | 'planner' | 'shopping' | 'settings';

export interface GeneratedRecipeResponse {
  title: string;
  description: string;
  category: string;
  tags?: string[];
  ingredients: { name: string; amount: string }[];
  steps: string[];
}