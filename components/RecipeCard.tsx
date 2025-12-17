import React from 'react';
import { Recipe } from '../types';
import { Clock, Plus, Star, Heart } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
  onAddToPlan?: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, onAddToPlan }) => {
  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full active:scale-95 transition-transform duration-150 relative"
      onClick={() => onClick(recipe)}
    >
      <div className="relative h-32 w-full bg-gray-100">
        <img 
          src={recipe.image} 
          alt={recipe.title} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-gray-700 shadow-sm">
          {recipe.category}
        </div>
        {recipe.isFavorite && (
          <div className="absolute top-2 left-2 text-red-500 bg-white/90 rounded-full p-1 shadow-sm">
            <Heart size={12} fill="currentColor" />
          </div>
        )}
      </div>
      
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex flex-col gap-1 mb-1">
           {/* Tags Row */}
           {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-0.5">
              {recipe.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[9px] text-brand-600 bg-brand-50 px-1 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{recipe.title}</h3>
        </div>
        
        {/* Rating Stars */}
        <div className="flex items-center mb-2">
           {[1, 2, 3, 4, 5].map((star) => (
             <Star 
               key={star} 
               size={10} 
               className={`${(recipe.rating || 0) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
             />
           ))}
           <span className="text-[10px] text-gray-400 ml-1">{recipe.rating ? recipe.rating.toFixed(1) : ''}</span>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{recipe.description}</p>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center text-xs text-gray-400">
            <Clock size={12} className="mr-1" />
            <span>15分</span>
          </div>
          {onAddToPlan && (
             <button 
             onClick={(e) => {
               e.stopPropagation();
               onAddToPlan(recipe);
             }}
             className="bg-brand-50 text-brand-600 p-1.5 rounded-full hover:bg-brand-100 active:bg-brand-200"
           >
             <Plus size={16} />
           </button>
          )}
        </div>
      </div>
    </div>
  );
};