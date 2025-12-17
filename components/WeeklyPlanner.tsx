import React, { useState, useEffect, useRef } from 'react';
import { MealPlanItem, Recipe } from '../types';
import { X, History, Sunrise, Sun, Moon, Calendar as CalendarIcon, Coffee, Plus } from 'lucide-react';
import { HistoryModal } from './HistoryModal';
import { EditableTitle } from './EditableTitle';

interface WeeklyPlannerProps {
  plan: MealPlanItem[];
  recipes: Recipe[];
  titles: { title: string; subtitle: string };
  onUpdateTitles: (t: { title: string; subtitle: string }) => void;
  onRemoveItem: (planId: string) => void;
  onOpenPicker: (dateStr: string, type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
  onRecipeClick: (recipe: Recipe) => void;
}

const getLocalYMD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({ 
  plan, 
  recipes, 
  titles,
  onUpdateTitles,
  onRemoveItem, 
  onOpenPicker,
  onRecipeClick
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const dates = React.useMemo(() => {
    const list = [];
    const today = new Date();
    const pastDays = 30; 
    const futureDays = 365;

    for (let i = -pastDays; i <= futureDays; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dateStr = getLocalYMD(d);
      const dayNum = d.getDate();
      const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      const isToday = i === 0;
      
      list.push({
        fullDate: dateStr,
        dayNum,
        weekDay,
        isToday,
        month: d.getMonth() + 1
      });
    }
    return list;
  }, []);

  useEffect(() => {
    const todayStr = getLocalYMD(new Date());
    setSelectedDate(todayStr);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const todayStr = getLocalYMD(new Date());
      const todayEl = document.getElementById(`date-${todayStr}`);
      if (todayEl && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollLeft = todayEl.offsetLeft - container.offsetWidth / 2 + todayEl.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'instant' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []); 

  // Get all snack items for the day (can be multiple)
  const getSnackItems = () => {
    return plan.filter(p => p.date === selectedDate && p.type === 'snack');
  };

  const getPlanForSlot = (type: 'breakfast' | 'lunch' | 'dinner') => {
    return plan.find(p => p.date === selectedDate && p.type === type);
  };

  const renderSlot = (type: 'breakfast' | 'lunch' | 'dinner' | 'snack', existingItem?: MealPlanItem) => {
    let item = existingItem;
    if (type !== 'snack') {
      item = getPlanForSlot(type);
    }
    
    const recipe = item ? recipes.find(r => r.id === item.recipeId) : null;
    
    const meta = {
      breakfast: { label: '早餐', icon: Sunrise, color: 'text-orange-500', bg: 'bg-orange-50' },
      lunch: { label: '午餐', icon: Sun, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      dinner: { label: '晚餐', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50' },
      snack: { label: '加餐/其他', icon: Coffee, color: 'text-pink-500', bg: 'bg-pink-50' }
    }[type];

    const Icon = meta.icon;

    if (recipe && item) {
      return (
        <div 
          key={item.id}
          onClick={() => onRecipeClick(recipe)}
          className="group relative bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 transition-all active:scale-[0.99] animate-in fade-in slide-in-from-bottom-2 cursor-pointer mb-3"
        >
          <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100">
            <img src={recipe.image} alt="" className="w-full h-full object-cover" />
          </div>
          
          <div className="flex-1 py-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`p-1 rounded-md ${meta.bg} ${meta.color}`}>
                <Icon size={12} strokeWidth={2.5} />
              </div>
              <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
            </div>
            
            <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1 truncate">{recipe.title}</h3>
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{recipe.description}</p>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemoveItem(item.id);
            }}
            className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      );
    }

    // Empty State for main meals (Fixed 1 slot)
    if (type !== 'snack') {
      return (
        <button 
          key={type}
          onClick={() => onOpenPicker(selectedDate, type)}
          className="w-full h-24 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:border-brand-200 hover:bg-brand-50/50 transition-all group animate-in fade-in mb-3"
        >
          <div className={`w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all`}>
             <Icon size={18} className="group-hover:text-brand-500" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-600 group-hover:text-brand-600">添加{meta.label}</span>
            <span className="text-xs text-gray-300">点击选择菜谱</span>
          </div>
        </button>
      );
    }
    return null;
  };

  const selectedDateObj = dates.find(d => d.fullDate === selectedDate);
  const snacks = getSnackItems();

  return (
    <div className="flex flex-col h-full pb-24">
      
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-40 bg-gray-50/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
        {/* Title Area */}
        <div className="px-4 pt-4 pb-2 flex justify-between items-end">
          <div className="flex flex-col">
            <div className="text-2xl font-black text-gray-900 leading-none">
              <EditableTitle 
                value={titles.title} 
                onChange={(v) => onUpdateTitles({ ...titles, title: v })} 
              />
            </div>
            <div className="text-gray-400 text-xs mt-1 font-medium">
               <EditableTitle 
                value={titles.subtitle} 
                onChange={(v) => onUpdateTitles({ ...titles, subtitle: v })} 
              />
            </div>
          </div>
          <button 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1 text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 active:scale-95 transition-all"
          >
            <History size={14} />
            时光轴
          </button>
        </div>

        {/* Date Strip */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto no-scrollbar px-[50%] gap-3 py-2 snap-x"
          style={{ scrollPaddingLeft: '50%' }}
        >
          {dates.map((dateItem) => {
            const isActive = selectedDate === dateItem.fullDate;
            return (
              <button
                key={dateItem.fullDate}
                id={`date-${dateItem.fullDate}`}
                onClick={() => {
                  setSelectedDate(dateItem.fullDate);
                  const el = document.getElementById(`date-${dateItem.fullDate}`);
                  if (el && scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const scrollLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
                    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                  }
                }}
                className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl transition-all duration-300 border relative ${
                  isActive 
                    ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-110 z-10' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                }`}
              >
                {dateItem.isToday && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
                <span className="text-[10px] font-medium mb-0.5">周{dateItem.weekDay}</span>
                <span className={`text-lg font-bold leading-none ${isActive ? 'text-brand-400' : 'text-gray-600'}`}>
                  {dateItem.dayNum}
                </span>
                {isActive && <span className="text-[8px] opacity-60 mt-0.5">{dateItem.month}月</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Content */}
      <div className="px-4 flex-1 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon size={14} className="text-brand-500" />
          <span className="text-sm font-bold text-gray-800">
             {selectedDateObj ? `${selectedDateObj.month}月${selectedDateObj.dayNum}日 周${selectedDateObj.weekDay}` : selectedDate}
          </span>
          {selectedDateObj?.isToday && (
            <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-bold">Today</span>
          )}
        </div>

        {renderSlot('breakfast')}
        {renderSlot('lunch')}
        {renderSlot('dinner')}
        
        {/* Snack Section - Unlimited Items */}
        <div className="mt-6 border-t border-gray-100 pt-4 pb-10">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2 text-pink-500">
               <Coffee size={14} />
               <span className="text-sm font-bold">加餐 / 零食</span>
             </div>
             {/* Main Add Button always visible */}
             <button 
               onClick={() => onOpenPicker(selectedDate, 'snack')}
               className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-gray-800 active:scale-95"
             >
               <Plus size={12} />
               添加
             </button>
           </div>
           
           <div className="space-y-3">
              {snacks.length > 0 ? (
                snacks.map(snack => renderSlot('snack', snack))
              ) : (
                <div 
                  onClick={() => onOpenPicker(selectedDate, 'snack')}
                  className="cursor-pointer text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-100 text-gray-400 text-xs flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  <Coffee size={20} className="opacity-50" />
                  今天还没喝奶茶？点我添加
                </div>
              )}
           </div>
        </div>

        {!getPlanForSlot('breakfast') && !getPlanForSlot('lunch') && !getPlanForSlot('dinner') && snacks.length === 0 && (
           <div className="py-8 flex flex-col items-center text-gray-300 mt-4">
             <div className="w-16 h-1 bg-gray-200 rounded-full mb-2"></div>
             <p className="text-xs">今天还没有安排，快去添加美食吧</p>
           </div>
        )}
      </div>

      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} plan={plan} recipes={recipes} />
    </div>
  );
};