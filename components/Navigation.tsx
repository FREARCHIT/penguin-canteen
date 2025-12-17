import React from 'react';
import { ChefHat, CalendarDays, ShoppingCart, User } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'recipes' as ViewState, icon: ChefHat, label: '菜谱' },
    { id: 'planner' as ViewState, icon: CalendarDays, label: '计划' },
    { id: 'shopping' as ViewState, icon: ShoppingCart, label: '清单' },
    { id: 'settings' as ViewState, icon: User, label: '我的' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-4 shadow-lg z-50">
      <div className="flex justify-around items-center h-16 mb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center w-16 transition-all duration-200 ${
                isActive ? 'text-brand-600 transform scale-105' : 'text-gray-400'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
