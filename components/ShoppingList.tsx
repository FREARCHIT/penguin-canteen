import React, { useMemo } from 'react';
import { MealPlanItem, Recipe } from '../types';
import { CheckSquare, Square, Share2, Plus, Trash2, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { EditableTitle } from './EditableTitle';

interface ManualItem {
  id: string;
  name: string;
}

interface ShoppingListProps {
  plan: MealPlanItem[];
  recipes: Recipe[];
  manualItems: ManualItem[];
  checkedItems: string[]; 
  title: string;
  onUpdateTitle: (t: string) => void;
  onUpdate: (manualItems: ManualItem[], checkedItems: string[]) => void;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ 
  plan, 
  recipes, 
  manualItems, 
  checkedItems, 
  title,
  onUpdateTitle,
  onUpdate 
}) => {
  const [newItemName, setNewItemName] = React.useState('');
  const [showCompleted, setShowCompleted] = React.useState(true);

  // Helper to get formatted usage info safely
  const getUsageInfo = (planItem: MealPlanItem) => {
    try {
      const [year, month, day] = planItem.date.split('-').map(Number);
      const dayStr = `${month}月${day}日`;
      
      const typeStr = {
        breakfast: '早餐',
        lunch: '午餐',
        dinner: '晚餐',
        snack: '加餐'
      }[planItem.type];

      return `${dayStr} · ${typeStr || '加餐'}`;
    } catch (e) {
      return planItem.date;
    }
  };

  const planIngredients = useMemo(() => {
    const list: { name: string; amount: string; id: string; usage: string }[] = [];
    plan.forEach(p => {
      const recipe = recipes.find(r => r.id === p.recipeId);
      if (recipe) {
        recipe.ingredients.forEach(ing => {
          list.push({
            name: ing.name,
            amount: ing.amount,
            id: `${p.id}-${ing.name}`,
            usage: getUsageInfo(p)
          });
        });
      }
    });
    return list;
  }, [plan, recipes]);

  const toggleItem = (id: string) => {
    let next = [...checkedItems];
    if (next.includes(id)) {
      next = next.filter(itemId => itemId !== id);
    } else {
      next.push(id);
    }
    onUpdate(manualItems, next);
  };

  const addManualItem = () => {
    if (!newItemName.trim()) return;
    const newItems = [...manualItems, { id: `manual-${Date.now()}`, name: newItemName.trim() }];
    onUpdate(newItems, checkedItems);
    setNewItemName('');
  };

  const removeManualItem = (id: string) => {
    const newItems = manualItems.filter(item => item.id !== id);
    const newChecked = checkedItems.filter(itemId => itemId !== id);
    onUpdate(newItems, newChecked);
  };

  const allItems = [
    ...manualItems.map(m => ({ ...m, type: 'manual', amount: '', usage: '自选' })),
    ...planIngredients.map(p => ({ ...p, type: 'plan' }))
  ];

  const activeList = allItems.filter(i => !checkedItems.includes(i.id));
  
  const completedList = allItems.filter(i => checkedItems.includes(i.id));
  completedList.sort((a, b) => {
    return checkedItems.indexOf(b.id) - checkedItems.indexOf(a.id);
  });

  const totalItems = allItems.length;
  const progress = totalItems > 0 
    ? Math.round((completedList.length / totalItems) * 100) 
    : 0;

  const handleShare = async () => {
    const dateStr = new Date().toLocaleDateString();
    let shareText = `🛒 ${title} (${dateStr})\n\n`;
    
    if (activeList.length > 0) {
      shareText += "【待购买】\n";
      activeList.forEach(item => {
        shareText += `☐ ${item.name} ${item.amount ? `(${item.amount})` : ''}\n`;
      });
    }

    if (completedList.length > 0) {
      shareText += "\n【已购买】\n";
      completedList.forEach(item => {
        shareText += `☑ ${item.name}\n`;
      });
    }

    shareText += "\n来自「企鹅食堂」App";

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('清单已复制到剪贴板，您可以粘贴发送给朋友。');
      } catch (err) {
        alert('无法分享，请截图发送。');
      }
    }
  };

  return (
    <div className="pb-24 h-full flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-gray-50/95 backdrop-blur-md border-b border-gray-200 px-4 pt-4 pb-4 shadow-sm transition-all">
        <div className="flex justify-between items-center mb-2">
          <div className="text-2xl font-bold text-gray-800">
             <EditableTitle value={title} onChange={onUpdateTitle} />
          </div>
          <button 
            onClick={handleShare}
            className="text-brand-600 bg-brand-50 p-2 rounded-full hover:bg-brand-100 transition-colors active:scale-95"
          >
            <Share2 size={20} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-green-500 h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-500">{progress}%</span>
        </div>
      </div>

      <div className="px-4 flex-1 mt-4">
        {/* Manual Add Input - Keeps scrolling with content */}
        <div className="flex gap-2 mb-6">
          <input 
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="添加临时物品..."
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 shadow-sm"
            onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
          />
          <button 
            onClick={addManualItem}
            disabled={!newItemName.trim()}
            className="bg-gray-900 text-white px-4 rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-gray-800 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-8 pb-4">
          {/* Active Items */}
          <div className="space-y-3">
            {activeList.length === 0 ? (
               <div className="text-center py-10 bg-gray-100/50 rounded-2xl border border-dashed border-gray-200">
                 <div className="text-4xl mb-2">🐧</div>
                 <p className="text-sm font-bold text-gray-800">🐧企鹅们已经清空了购物车!</p>
                 <p className="text-xs text-gray-400 mt-1">太棒了，所有东西都准备好了</p>
               </div>
            ) : (
              activeList.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="group flex items-start p-3 rounded-xl bg-white border border-gray-200 shadow-sm cursor-pointer hover:border-brand-300 transition-all active:scale-[0.99]"
                >
                  <div className="mt-0.5 mr-3 text-brand-500 group-hover:scale-110 transition-transform">
                    <Square size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-800 text-base">{item.name}</span>
                      {item.amount && (
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                          {item.amount}
                        </span>
                      )}
                    </div>
                    {item.usage !== '自选' && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                        <Tag size={10} />
                        <span>{item.usage}</span>
                      </div>
                    )}
                  </div>
                  {item.type === 'manual' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeManualItem(item.id);
                      }}
                      className="text-gray-300 hover:text-red-500 p-1 -mr-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Completed Items */}
          {completedList.length > 0 && (
            <div>
              <button 
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-600"
              >
                {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                已购买 ({completedList.length})
              </button>
              
              {showCompleted && (
                <div className="space-y-2 opacity-60">
                  {completedList.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="flex items-center p-3 rounded-xl bg-gray-100 border border-transparent cursor-pointer hover:bg-gray-200 transition-all"
                    >
                      <div className="mr-3 text-gray-400">
                        <CheckSquare size={20} />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-gray-500 line-through decoration-gray-400">
                          {item.name}
                        </span>
                      </div>
                      {item.type === 'manual' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeManualItem(item.id);
                          }}
                          className="text-gray-300 hover:text-red-500 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};