import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { ViewState, Recipe, MealPlanItem, Category } from './types';
import { INITIAL_RECIPES } from './constants';
import { RecipeCard } from './components/RecipeCard';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { ShoppingList } from './components/ShoppingList';
import { AddRecipeModal } from './components/AddRecipeModal';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { EditProfileModal } from './components/EditProfileModal';
import { storage, UserProfile, Household } from './services/storage';
import { Plus, Search, Heart, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Edit2, Users, Copy, LogOut, Loader2, RefreshCw, Send, MessageSquare, Utensils, ArrowDown, Coffee } from 'lucide-react';
import { EditableTitle } from './components/EditableTitle';

export default function Main() {
  const [view, setView] = useState<ViewState>('recipes');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<MealPlanItem[]>([]);
  
  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [pickingForSlot, setPickingForSlot] = useState<{date: string, type: 'breakfast'|'lunch'|'dinner'|'snack'} | null>(null);
  
  // Pull to Refresh State
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Calendar Logic
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [calendarSelectedDateStr, setCalendarSelectedDateStr] = useState<string>('');
  
  // Message Board State
  const [messageInput, setMessageInput] = useState('');

  // Profile & Household States
  const [userProfile, setUserProfile] = useState<UserProfile>({ 
    name: '我的食堂', 
    avatar: '🐧', 
    tagline: '今天也要好好吃饭',
    titles: {
      home: '企鹅食堂',
      planner: '饮食计划',
      plannerSubtitle: 'Meal Planner',
      shopping: '购物清单'
    }
  });
  const [household, setHousehold] = useState<Household | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isRenamingHousehold, setIsRenamingHousehold] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');

  // Initialize Data via Service
  const loadAllData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setSyncing(true);
    
    try {
      const data = await storage.loadData();
      
      if (data.recipes.length === 0 && !storage.getHousehold()) {
        setRecipes(INITIAL_RECIPES); 
      } else {
        setRecipes(data.recipes);
      }
      
      setPlan(data.plan);
      setUserProfile(data.profile);
      setHousehold(storage.getHousehold());
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadAllData(true);
    const now = new Date();
    const str = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    setCalendarSelectedDateStr(str);
  }, []);

  // Real-time Subscription Hook
  useEffect(() => {
    if (household) {
      const subscription = storage.subscribeToChanges(household.id, () => {
        // When cloud data changes (e.g. name update), reload
        loadAllData(false);
        // Ensure local household state reflects changes immediately if needed
        const updatedHousehold = storage.getHousehold();
        if (updatedHousehold && updatedHousehold.name !== household.name) {
           setHousehold(updatedHousehold);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [household]);

  // Persist Data Handlers
  useEffect(() => {
    if (!loading && !syncing) storage.saveData('recipes', recipes);
  }, [recipes, loading, household]);

  useEffect(() => {
    if (!loading && !syncing) storage.saveData('plan', plan);
  }, [plan, loading, household]);

  useEffect(() => {
    if (!loading) storage.saveData('profile', userProfile);
  }, [userProfile, loading]);

  // Pull to Refresh Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (view === 'recipes' && window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (view === 'recipes' && pullStartY > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - pullStartY;
      if (diff > 0) {
        setPullDistance(diff < 200 ? diff : 200); // Max pull
      }
    }
  };

  const handleTouchEnd = async () => {
    if (view === 'recipes' && pullDistance > 80) {
      setIsRefreshing(true);
      await loadAllData(false);
      setIsRefreshing(false);
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  // Actions
  const handleUpdateTitles = (key: keyof NonNullable<UserProfile['titles']>, value: string) => {
    setUserProfile(prev => ({
      ...prev,
      titles: {
        ...prev.titles,
        [key]: value
      }
    }));
  };

  const handleSaveRecipe = (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'rating' | 'isFavorite'>) => {
    if (editingRecipe) {
      setRecipes(prev => prev.map(r => r.id === editingRecipe.id ? {
        ...r,
        ...recipeData,
        createdAt: r.createdAt,
        rating: r.rating,
        isFavorite: r.isFavorite
      } : r));
      
      if (selectedRecipe && selectedRecipe.id === editingRecipe.id) {
        setSelectedRecipe(prev => prev ? { ...prev, ...recipeData } : null);
      }
      
      setEditingRecipe(null);
    } else {
      const newRecipe: Recipe = {
        ...recipeData,
        id: Date.now().toString(),
        createdAt: Date.now(),
        rating: 0,
        isFavorite: false,
      };
      setRecipes(prev => [newRecipe, ...prev]);
    }
  };

  const handleEditClick = (recipe: Recipe) => {
    setSelectedRecipe(null);
    setEditingRecipe(recipe);
    setIsAddModalOpen(true);
  };

  const handleAddToPlan = (recipe: Recipe) => {
    if (pickingForSlot) {
      const newPlanItem: MealPlanItem = {
        id: Date.now().toString(),
        date: pickingForSlot.date,
        type: pickingForSlot.type,
        recipeId: recipe.id
      };
      
      // Filter existing only if type is NOT snack (snacks can handle multiple)
      let filteredPlan = plan;
      if (pickingForSlot.type !== 'snack') {
        filteredPlan = plan.filter(p => !(p.date === pickingForSlot.date && p.type === pickingForSlot.type));
      }

      setPlan([...filteredPlan, newPlanItem]);
      setPickingForSlot(null);
      setView('planner');
    } else {
      alert("请在“计划”页面点击 + 号选择一个时间段来添加此菜谱");
      setView('planner');
    }
  };

  const handleRemovePlanItem = (id: string) => {
    setPlan(prev => prev.filter(p => p.id !== id));
  };

  const handleToggleFavorite = (id: string) => {
    setRecipes(prev => prev.map(r => 
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const handleRateRecipe = (id: string, rating: number) => {
    setRecipes(prev => prev.map(r => 
      r.id === id ? { ...r, rating } : r
    ));
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(prev => prev ? { ...prev, rating } : null);
    }
  };

  const handleIngredientClick = (ingredientName: string) => {
    setSelectedRecipe(null); 
    setSearchQuery(ingredientName); 
    setView('recipes'); 
  };

  const handleCreateHousehold = async () => {
    setIsJoining(true);
    try {
      const house = await storage.createHousehold(`${userProfile.name}的家`);
      // Sync local data to the new household
      await storage.syncLocalToCloud(house.id, recipes, plan);
      
      setHousehold(house);
      alert(`家庭“${house.name}”创建成功！您的现有数据已同步到云端。`);
    } catch (e) {
      alert('创建失败，请重试');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCodeInput) return;
    setIsJoining(true);
    try {
      const house = await storage.joinHousehold(joinCodeInput);
      if (house) {
        setLoading(true); 
        // Sync local data to the joined household
        await storage.syncLocalToCloud(house.id, recipes, plan);
        
        setHousehold(house);
        setJoinCodeInput('');
        await loadAllData(true);
        alert(`成功加入“${house.name}”！现有数据已合并。`);
      } else {
        alert('未找到该家庭代码');
      }
    } catch (e) {
      console.error(e);
      alert('加入失败，请检查网络');
    } finally {
      setIsJoining(false);
      setLoading(false);
    }
  };

  const handleLeaveHousehold = async () => {
    if (confirm('确定要退出当前共享组吗？退出后将无法查看共享数据。')) {
      setLoading(true);
      await storage.leaveHousehold();
      setHousehold(null);
      await loadAllData(true);
      setLoading(false);
    }
  };

  const handleRenameHousehold = async () => {
    if (!household || !newHouseholdName.trim()) return;
    try {
      await storage.updateHouseholdName(household.id, newHouseholdName.trim());
      setHousehold({ ...household, name: newHouseholdName.trim() });
      setIsRenamingHousehold(false);
    } catch (e) {
      alert('修改失败');
    }
  };

  const handlePostMessage = () => {
    if (!messageInput.trim()) return;
    const message: Recipe = {
      id: `msg-${Date.now()}`,
      title: messageInput,
      description: userProfile.name,
      image: userProfile.avatar,
      category: Category.Message,
      ingredients: [],
      steps: [],
      createdAt: Date.now(),
      tags: [],
    };
    setRecipes(prev => [message, ...prev]);
    setMessageInput('');
  };

  const deleteMessage = (id: string) => {
    if (confirm('删除这条留言?')) {
      setRecipes(prev => prev.filter(r => r.id !== id));
    }
  };

  const shoppingListRecipe = recipes.find(r => r.category === Category.ShoppingList);
  
  const shoppingListData = useMemo(() => {
    if (shoppingListRecipe) {
      try {
        const data = JSON.parse(shoppingListRecipe.description);
        return {
          manualItems: data.manualItems || [],
          checkedItems: Array.isArray(data.checkedItems) ? data.checkedItems : [] 
        };
      } catch (e) {
        return { manualItems: [], checkedItems: [] };
      }
    }
    return { manualItems: [], checkedItems: [] };
  }, [shoppingListRecipe]);

  const handleUpdateShoppingList = (manualItems: {id: string, name: string}[], checkedItems: string[]) => {
    const newData = JSON.stringify({
      manualItems,
      checkedItems
    });

    if (shoppingListRecipe) {
      setRecipes(prev => prev.map(r => r.id === shoppingListRecipe.id ? { ...r, description: newData } : r));
    } else {
      const newRecipe: Recipe = {
        id: `sl-${Date.now()}`,
        title: 'Shopping List Data',
        description: newData,
        category: Category.ShoppingList,
        ingredients: [],
        steps: [],
        image: '',
        createdAt: Date.now(),
        tags: []
      };
      setRecipes(prev => [...prev, newRecipe]);
    }
  };

  const daysInMonth = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const date = new Date(year, month + 1, 0);
    return date.getDate();
  }, [calendarViewDate]);

  const firstDayOfMonth = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [calendarViewDate]);

  const getCalendarDayData = (day: number) => {
    const year = calendarViewDate.getFullYear();
    const month = String(calendarViewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const str = `${year}-${month}-${d}`;
    return plan.some(p => p.date === str);
  };

  const getMealsForSelectedDate = () => {
    if (!calendarSelectedDateStr) return [];
    const items = plan.filter(p => p.date === calendarSelectedDateStr);
    const order = { breakfast: 1, lunch: 2, dinner: 3, snack: 4 };
    items.sort((a,b) => order[a.type] - order[b.type]);
    return items.map(item => ({
      item,
      recipe: recipes.find(r => r.id === item.recipeId)
    }));
  };

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
  };

  const messages = recipes.filter(r => r.category === Category.Message).sort((a,b) => b.createdAt - a.createdAt);
  const visibleRecipes = recipes.filter(r => r.category !== Category.Message && r.category !== Category.ShoppingList);

  const recipeUsageCounts = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const counts: Record<string, number> = {};
    plan.forEach(p => {
       if (p.date >= sevenDaysAgoStr) {
         counts[p.recipeId] = (counts[p.recipeId] || 0) + 1;
       }
    });
    return counts;
  }, [plan]);

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = visibleRecipes.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(q) || 
                            r.ingredients.some(i => i.name.includes(q)) ||
                            (r.tags && r.tags.some(t => t.includes(q))); 

      const matchesCategory = selectedCategory === '全部' || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      const usageA = recipeUsageCounts[a.id] || 0;
      const usageB = recipeUsageCounts[b.id] || 0;
      if (usageA !== usageB) return usageB - usageA;
      return b.createdAt - a.createdAt;
    });
  }, [visibleRecipes, searchQuery, selectedCategory, recipeUsageCounts]);

  const favoriteRecipes = visibleRecipes.filter(r => r.isFavorite);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    try {
      const [y, m, day] = dateStr.split('-').map(Number);
      if(m && day) return `${m}月${day}日`;
    } catch(e){}
    return `${d.getMonth()+1}月${d.getDate()}日`;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (pickingForSlot) {
      if (pickingForSlot.type === 'lunch' || pickingForSlot.type === 'dinner') {
        setSelectedCategory(Category.MainMeal);
      } else if (pickingForSlot.type === 'breakfast') {
        setSelectedCategory(Category.Breakfast);
      } else if (pickingForSlot.type === 'snack') {
        setSelectedCategory(Category.Snack);
      }
    }
  }, [pickingForSlot]);

  if (loading && !isRefreshing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">正在同步数据...</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-brand-100"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* Pull to Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
           className="fixed top-safe-top left-0 right-0 flex justify-center z-30 pointer-events-none transition-transform duration-200"
           style={{ transform: `translateY(${Math.min(pullDistance/2, 60)}px)` }}
        >
          <div className="bg-white rounded-full p-2 shadow-md text-brand-500">
            {isRefreshing ? <Loader2 className="animate-spin" size={20} /> : <ArrowDown size={20} style={{ transform: `rotate(${pullDistance * 2}deg)` }} />}
          </div>
        </div>
      )}

      {view === 'recipes' && (
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 pt-safe-top">
          <div className="px-4 py-3">
             <div className="flex items-center justify-between mb-3">
               <div className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                 <EditableTitle 
                   value={userProfile.titles?.home || '企鹅食堂'} 
                   onChange={(v) => handleUpdateTitles('home', v)} 
                 />
               </div>
               <div className="flex items-center gap-2">
                 {syncing && (
                   <span className="flex items-center gap-1 text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-bold animate-pulse">
                     <RefreshCw size={10} className="animate-spin" />
                     同步中
                   </span>
                 )}
                 <div className="px-2 py-0.5 bg-black text-white text-[10px] rounded-full font-bold uppercase tracking-wider">
                   Beta
                 </div>
               </div>
             </div>
             
             <div className="relative mb-3">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
               <input 
                  type="text" 
                  placeholder="搜索菜名、食材、标签..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 pl-9 pr-4 py-2.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none"
               />
               {searchQuery && (
                 <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                   <X size={14} />
                 </button>
               )}
             </div>

             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
               {['全部', ...Object.values(Category).filter(c => c !== Category.Message && c !== Category.ShoppingList)].map(cat => (
                 <button
                   key={cat}
                   onClick={() => setSelectedCategory(cat)}
                   className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                     selectedCategory === cat 
                       ? 'bg-gray-900 text-white' 
                       : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                   }`}
                 >
                   {cat}
                 </button>
               ))}
             </div>
          </div>
        </div>
      )}

      <main className={`pt-4 ${view !== 'recipes' ? 'pt-safe-top' : ''}`}>
        
        {view === 'recipes' && (
          <div className="px-4 pb-24">
            {pickingForSlot && (
              <div className="mb-4 bg-brand-50 border border-brand-200 p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 shadow-sm">
                <div>
                  <span className="block text-xs text-brand-500 font-bold uppercase mb-0.5">正在规划</span>
                  <span className="text-sm font-bold text-gray-800">
                    {formatDateDisplay(pickingForSlot.date)}的{pickingForSlot.type === 'breakfast' ? '早餐' : pickingForSlot.type === 'lunch' ? '午餐' : pickingForSlot.type === 'dinner' ? '晚餐' : '加餐'}
                  </span>
                </div>
                <button 
                  onClick={() => setPickingForSlot(null)}
                  className="bg-white px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 shadow-sm"
                >
                  取消
                </button>
              </div>
            )}

            {filteredRecipes.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                 <p>没有找到相关菜谱</p>
                 {searchQuery && <p className="text-xs mt-2">试试搜索其他关键词</p>}
               </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredRecipes.map(recipe => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    onClick={(r) => {
                      if (pickingForSlot) handleAddToPlan(r);
                      else setSelectedRecipe(r);
                    }}
                    onAddToPlan={!pickingForSlot ? handleAddToPlan : undefined} 
                  />
                ))}
              </div>
            )}
            
            <button
              onClick={() => {
                setEditingRecipe(null);
                setIsAddModalOpen(true);
              }}
              className="fixed bottom-20 right-4 w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30"
            >
              <Plus size={28} />
            </button>
          </div>
        )}

        {view === 'planner' && (
          <WeeklyPlanner 
            plan={plan} 
            recipes={visibleRecipes} 
            titles={{
              title: userProfile.titles?.planner || '饮食计划',
              subtitle: userProfile.titles?.plannerSubtitle || 'Meal Planner'
            }}
            onUpdateTitles={(t) => {
              handleUpdateTitles('planner', t.title);
              handleUpdateTitles('plannerSubtitle', t.subtitle);
            }}
            onRemoveItem={handleRemovePlanItem}
            onOpenPicker={(date, type) => {
              setPickingForSlot({ date, type });
              setView('recipes');
            }}
            onRecipeClick={(r) => setSelectedRecipe(r)}
          />
        )}

        {view === 'shopping' && (
          <ShoppingList 
             plan={plan} 
             recipes={visibleRecipes} 
             manualItems={shoppingListData.manualItems}
             checkedItems={shoppingListData.checkedItems}
             title={userProfile.titles?.shopping || '购物清单'}
             onUpdateTitle={(t) => handleUpdateTitles('shopping', t)}
             onUpdate={handleUpdateShoppingList}
          />
        )}

        {view === 'settings' && (
           <div className="px-4 pb-24 mt-4">
             <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-3xl border-2 border-white shadow-md relative group overflow-hidden"
                >
                   {userProfile.avatar.startsWith('data:') ? (
                     <img src={userProfile.avatar} className="w-full h-full object-cover" />
                   ) : (
                     userProfile.avatar
                   )}
                  <div className="absolute bottom-0 right-0 bg-gray-900 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={10} />
                  </div>
                </button>
                <div onClick={() => setIsProfileModalOpen(true)} className="flex-1 cursor-pointer group">
                  <div className="flex items-center gap-2">
                     <h2 className="text-2xl font-bold text-gray-900">{userProfile.name}</h2>
                     <Edit2 size={14} className="text-gray-300 group-hover:text-gray-500" />
                  </div>
                  <p className="text-gray-500 text-sm">{userProfile.tagline || '今天也要好好吃饭'}</p>
                </div>
             </div>

             <div className="mb-8">
               <div className="flex items-center gap-2 mb-4">
                  <Users size={20} className="text-blue-500" />
                  <h3 className="text-lg font-bold text-gray-800">共享厨房</h3>
               </div>
               
               <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  {household ? (
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 font-bold uppercase">当前家庭组</p>
                          {isRenamingHousehold ? (
                             <div className="flex gap-2 mt-1">
                               <input 
                                 value={newHouseholdName}
                                 onChange={e => setNewHouseholdName(e.target.value)}
                                 className="border rounded px-2 py-1 text-sm flex-1 outline-none"
                                 autoFocus
                               />
                               <button onClick={handleRenameHousehold} className="text-xs bg-brand-500 text-white px-2 rounded">保存</button>
                             </div>
                          ) : (
                             <div className="flex items-center gap-2 mt-1">
                               <h4 className="text-xl font-black text-gray-800">{household.name}</h4>
                               <button onClick={() => {
                                 setNewHouseholdName(household.name);
                                 setIsRenamingHousehold(true);
                               }} className="text-gray-300 hover:text-gray-600">
                                 <Edit2 size={14} />
                               </button>
                             </div>
                          )}
                        </div>
                        <button onClick={handleLeaveHousehold} className="text-gray-300 hover:text-red-500 p-2">
                          <LogOut size={18} />
                        </button>
                      </div>
                      
                      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-2">
                         <p className="text-xs text-brand-600 mb-1 font-medium">邀请码 (发送给朋友)</p>
                         <div className="flex items-center justify-between">
                            <span className="text-2xl font-mono font-bold text-gray-900 tracking-wider">{household.code}</span>
                            <button className="text-brand-600 font-bold text-sm flex items-center gap-1 active:scale-95 transition-transform">
                              <Copy size={14} /> 复制
                            </button>
                         </div>
                      </div>

                      <div className="mt-6 border-t border-gray-100 pt-4">
                         <div className="flex items-center gap-2 mb-3">
                           <MessageSquare size={16} className="text-green-500" />
                           <h4 className="text-sm font-bold text-gray-700">厨房留言板</h4>
                         </div>
                         
                         <div className="flex gap-2 mb-4">
                           <input 
                             value={messageInput}
                             onChange={e => setMessageInput(e.target.value)}
                             placeholder="比如：今晚我不回来吃饭..."
                             className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                             onKeyDown={e => e.key === 'Enter' && handlePostMessage()}
                           />
                           <button onClick={handlePostMessage} disabled={!messageInput.trim()} className="bg-green-500 text-white p-2 rounded-xl disabled:opacity-50">
                             <Send size={16} />
                           </button>
                         </div>

                         <div className="space-y-3 max-h-60 overflow-y-auto">
                           {messages.length === 0 ? (
                             <p className="text-xs text-gray-400 text-center py-2">还没有留言，发一条试试？</p>
                           ) : (
                             messages.map(msg => (
                               <div key={msg.id} className="flex gap-3 items-start group">
                                 <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm border border-white shadow-sm overflow-hidden shrink-0">
                                   {msg.image.startsWith('data:') ? <img src={msg.image} className="w-full h-full object-cover" /> : msg.image}
                                 </div>
                                 <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-xs font-bold text-gray-700">{msg.description}</span>
                                      <span className="text-[10px] text-gray-300">{formatTime(msg.createdAt)}</span>
                                    </div>
                                    <div className="bg-gray-50 rounded-r-xl rounded-bl-xl p-2 text-sm text-gray-700 leading-relaxed border border-gray-100">
                                      {msg.title}
                                    </div>
                                 </div>
                                 <button onClick={() => deleteMessage(msg.id)} className="text-gray-300 hover:text-red-400 self-center px-2 py-2">
                                   <X size={14} />
                                 </button>
                               </div>
                             ))
                           )}
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <p className="text-sm text-gray-600">加入家庭组，与朋友共享菜谱和购物清单。</p>
                       
                       <div className="flex gap-2">
                         <input 
                           value={joinCodeInput}
                           onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                           placeholder="输入邀请码 (如: DEMO123)"
                           className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none uppercase font-mono"
                         />
                         <button 
                           onClick={handleJoinHousehold}
                           disabled={!joinCodeInput || isJoining}
                           className="bg-gray-900 text-white px-4 rounded-xl text-sm font-bold disabled:opacity-50"
                         >
                           {isJoining ? <Loader2 className="animate-spin" size={16}/> : '加入'}
                         </button>
                       </div>

                       <div className="relative flex py-1 items-center">
                          <div className="flex-grow border-t border-gray-100"></div>
                          <span className="flex-shrink-0 mx-4 text-gray-300 text-xs">或者</span>
                          <div className="flex-grow border-t border-gray-100"></div>
                       </div>

                       <button 
                         onClick={handleCreateHousehold}
                         disabled={isJoining}
                         className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                       >
                         {isJoining ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16} />}
                         创建新家庭
                       </button>
                    </div>
                  )}
               </div>
             </div>

             <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Heart size={20} className="text-red-500" fill="currentColor" />
                  <h3 className="text-lg font-bold text-gray-800">我的收藏</h3>
                </div>
                
                {favoriteRecipes.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {favoriteRecipes.map(recipe => (
                      <div key={recipe.id} className="w-40 shrink-0">
                         <RecipeCard 
                          recipe={recipe} 
                          onClick={(r) => setSelectedRecipe(r)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-dashed border-gray-200">
                    <p>还没有收藏任何菜谱</p>
                    <button 
                      onClick={() => setView('recipes')} 
                      className="text-brand-500 text-sm mt-2 font-medium"
                    >
                      去逛逛
                    </button>
                  </div>
                )}
             </div>

             <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarIcon size={20} className="text-brand-600" />
                  <h3 className="text-lg font-bold text-gray-800">饮食日历</h3>
                </div>
                
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                   <div className="flex justify-between items-center mb-4">
                     <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} className="text-gray-400" /></button>
                     <span className="font-bold text-gray-800">{calendarViewDate.getFullYear()}年 {calendarViewDate.getMonth() + 1}月</span>
                     <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={20} className="text-gray-400" /></button>
                   </div>
                   
                   <div className="grid grid-cols-7 gap-1 text-center mb-2">
                     {['一','二','三','四','五','六','日'].map(d => <span key={d} className="text-xs text-gray-400 font-medium">{d}</span>)}
                   </div>
                   <div className="grid grid-cols-7 gap-1">
                     {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
                     
                     {[...Array(daysInMonth)].map((_, i) => {
                       const day = i + 1;
                       const year = calendarViewDate.getFullYear();
                       const month = String(calendarViewDate.getMonth() + 1).padStart(2, '0');
                       const dStr = String(day).padStart(2, '0');
                       const fullDate = `${year}-${month}-${dStr}`;
                       
                       const isSelected = calendarSelectedDateStr === fullDate;
                       const hasData = getCalendarDayData(day);
                       
                       return (
                         <button 
                            key={day}
                            onClick={() => setCalendarSelectedDateStr(isSelected ? '' : fullDate)}
                            className={`h-10 rounded-full flex flex-col items-center justify-center relative transition-all ${
                              isSelected ? 'bg-brand-500 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                         >
                           <span className="text-sm font-medium leading-none">{day}</span>
                           {hasData && !isSelected && (
                             <span className="w-1 h-1 rounded-full bg-brand-400 mt-1"></span>
                           )}
                         </button>
                       )
                     })}
                   </div>

                   {calendarSelectedDateStr && (
                     <div className="mt-4 border-t border-gray-100 pt-3 animate-in fade-in">
                       <h4 className="text-xs font-bold text-gray-500 mb-2">
                         {formatDateDisplay(calendarSelectedDateStr)} 安排
                       </h4>
                       {getMealsForSelectedDate().length > 0 ? (
                         <div className="space-y-2">
                           {getMealsForSelectedDate().map(({item, recipe}, idx) => (
                             <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                               <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0 overflow-hidden">
                                 {recipe ? <img src={recipe.image} className="w-full h-full object-cover"/> : <Utensils size={16} className="m-2 text-gray-400"/>}
                               </div>
                               <div className="flex-1">
                                 <span className="text-[10px] text-gray-400 uppercase font-bold block">
                                   {item.type === 'breakfast' ? '早餐' : item.type === 'lunch' ? '午餐' : item.type === 'dinner' ? '晚餐' : '加餐'}
                                 </span>
                                 <span className="text-sm font-bold text-gray-800 line-clamp-1">{recipe?.title || '未知菜谱'}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-xs text-gray-300 text-center py-2">当天没有记录</p>
                       )}
                     </div>
                   )}
                </div>
             </div>

             <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Trash2 size={18} />
                    <span className="font-medium">重置所有数据</span>
                  </div>
                  <button 
                    onClick={() => {
                      if(confirm("确定要清除所有菜谱和计划吗？")) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="text-red-500 text-sm bg-red-50 px-3 py-1 rounded-full"
                  >
                    执行
                  </button>
                </div>
             </div>
             
             <div className="text-center mt-8 space-y-1">
               <p className="text-xs text-gray-300">企鹅食堂 v1.11.0</p>
               <p className="text-xs text-gray-200">Made with ❤️ for Foodies</p>
             </div>
           </div>
        )}

      </main>

      <AddRecipeModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecipe(null);
        }} 
        onSave={handleSaveRecipe}
        initialData={editingRecipe}
      />
      
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onToggleFavorite={handleToggleFavorite}
        onRate={handleRateRecipe}
        onIngredientClick={handleIngredientClick}
        onEdit={handleEditClick}
      />

      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentName={userProfile.name}
        currentAvatar={userProfile.avatar}
        currentTagline={userProfile.tagline}
        onSave={(name, avatar, tagline) => setUserProfile({ name, avatar, tagline })}
      />

      <Navigation currentView={view} setView={setView} />
    </div>
  );
}