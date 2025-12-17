
import React, { useMemo } from 'react';
import { X, Calendar, ChevronRight, Clock, Utensils } from 'lucide-react';
import { MealPlanItem, Recipe } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: MealPlanItem[]; // Receive real plan data
  recipes: Recipe[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, plan, recipes }) => {
  
  // Helper: Get the Monday date string (YYYY-MM-DD) for any given date string
  const getMondayStr = (dateStr: string) => {
    // Parse manually to avoid timezone shifts
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayNum = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayNum}`;
  };

  const historyData = useMemo(() => {
    if (plan.length === 0) return [];

    // 1. Group items by Week (Monday)
    const weeksMap = new Map<string, MealPlanItem[]>();
    
    plan.forEach(item => {
      const monday = getMondayStr(item.date);
      if (!weeksMap.has(monday)) {
        weeksMap.set(monday, []);
      }
      weeksMap.get(monday)?.push(item);
    });

    // 2. Sort Mondays Chronologically (Oldest -> Newest) as requested
    const sortedMondays = Array.from(weeksMap.keys()).sort((a, b) => a.localeCompare(b));

    if (sortedMondays.length === 0) return [];

    // The very first week recorded is Week 1
    const firstMondayStr = sortedMondays[0];
    const firstMondayDate = new Date(firstMondayStr);

    // 3. Transform to display format
    return sortedMondays.map((mondayStr) => {
      const items = weeksMap.get(mondayStr) || [];
      
      // Calculate Week Number based on time difference from the absolute first week
      const currentMondayDate = new Date(mondayStr);
      const diffTime = Math.abs(currentMondayDate.getTime() - firstMondayDate.getTime());
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)); 
      const weekNumber = diffWeeks + 1;

      // Calculate Range String
      const endDate = new Date(currentMondayDate);
      endDate.setDate(endDate.getDate() + 6);
      const format = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
      const range = `${format(currentMondayDate)} - ${format(endDate)}`;

      // Count meals
      const counts = {
        breakfast: items.filter(i => i.type === 'breakfast').length,
        lunch: items.filter(i => i.type === 'lunch').length,
        dinner: items.filter(i => i.type === 'dinner').length,
      };

      return {
        id: mondayStr,
        weekNumber,
        range,
        itemCount: items.length,
        counts,
        // Check if this week is in the past or future relative to today
        isFuture: new Date(mondayStr) > new Date()
      };
    });
  }, [plan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="bg-white w-full sm:max-w-md h-[85vh] sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col absolute bottom-0 sm:relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl">
          <div>
            <h2 className="text-xl font-black text-gray-800">时光轴</h2>
            <p className="text-xs text-gray-400">Time Machine</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {historyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
              <Calendar size={48} className="text-gray-200" />
              <p className="text-sm">暂无计划记录</p>
              <p className="text-xs">添加您的第一个计划，时光轴将从那里开始</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-10">
              {historyData.map((week) => (
                <div key={week.id} className="relative pl-8 group cursor-pointer">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-all group-hover:scale-125 ${
                     week.isFuture ? 'bg-gray-300' : 'bg-brand-500'
                  }`} />
                  
                  {/* Content Card */}
                  <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-brand-200 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">第{week.weekNumber}周</span>
                        <h3 className="font-bold text-lg text-gray-800">
                           {week.range}
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold bg-brand-50 text-brand-600 px-2 py-1 rounded-full">
                         {week.itemCount} 餐
                       </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <div className="flex gap-2">
                         {/* Mini Stats */}
                         <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                           <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                           早 {week.counts.breakfast}
                         </div>
                         <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                           <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                           午 {week.counts.lunch}
                         </div>
                         <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                           <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                           晚 {week.counts.dinner}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-center gap-2 text-gray-300 text-xs mt-8 mb-4">
             <Clock size={12} />
             <span>记录从第一顿饭开始 · 时间正序排列</span>
          </div>
        </div>
      </div>
    </div>
  );
};
