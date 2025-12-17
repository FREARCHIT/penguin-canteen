import React, { useState, useEffect } from 'react';
import { X, Clock, Users, Star, Heart, Share2, Search, Edit3, Tag, ChevronLeft } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onIngredientClick: (ingredientName: string) => void;
  onEdit: (recipe: Recipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({ 
  recipe, 
  onClose, 
  onToggleFavorite, 
  onRate, 
  onIngredientClick,
  onEdit 
}) => {
  // Gesture State
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (recipe) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [recipe]);

  if (!recipe) return null;

  const handleShare = async () => {
    const ingredientsList = recipe.ingredients.map(i => `• ${i.name} ${i.amount}`).join('\n');
    const shareText = `🍳 ${recipe.title}\n\n${recipe.description}\n\n📝 食材:\n${ingredientsList}\n\n来自「企鹅食堂」App`;
    const shareUrl = window.location.href; 

    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('User cancelled share', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('菜谱内容已复制！请去微信粘贴分享。');
      } catch (err) {
        alert('无法分享，请截图发送。');
      }
    }
  };

  // iOS-style Swipe Right to Back logic
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const deltaX = currentX - touchStart.x;
    const deltaY = Math.abs(currentY - touchStart.y);

    // CRITICAL for iOS:
    // If horizontal movement is dominant (deltaX > deltaY), we claim this event for swiping
    // and prevent default behavior (scrolling).
    // We also check deltaX > 5 to avoid jitter on tap.
    if (deltaX > 5 && deltaX > deltaY) {
      if (e.cancelable) e.preventDefault();
      setIsSwiping(true);
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping) {
      // Threshold: Swipe > 25% of screen width or 100px to close
      if (swipeOffset > 100) {
        onClose();
      }
    }
    // Reset
    setTouchStart(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  // Visual feedback opacity
  const overlayOpacity = Math.max(0, 0.6 - (swipeOffset / 400));
  
  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center"
      // Apply handlers to the container
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute inset-0 bg-black backdrop-blur-sm transition-opacity duration-200" 
        style={{ opacity: overlayOpacity }}
        onClick={onClose} 
      />
      
      <div 
        className={`bg-white w-full h-full sm:h-[90vh] sm:w-[500px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative ${isSwiping ? '' : 'transition-transform duration-300 ease-out'}`}
        style={{ 
          transform: `translateX(${Math.max(0, swipeOffset)}px)`,
          // KEY FIX: touch-action: pan-y tells the browser to handle vertical scrolls 
          // but lets us handle horizontal swipes in JS without fighting the native browser back gesture too much
          touchAction: 'pan-y' 
        }}
      >
        
        {/* Header Image */}
        <div className="relative h-64 w-full shrink-0">
          <img 
            src={recipe.image} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
             <button onClick={onClose} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors flex items-center gap-1 pr-3">
               <ChevronLeft size={20} />
               <span className="text-xs font-bold">返回</span>
             </button>
             <div className="flex gap-2">
               <button 
                onClick={() => onEdit(recipe)}
                className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors"
               >
                 <Edit3 size={20} />
               </button>
               <button 
                onClick={handleShare}
                className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors"
               >
                 <Share2 size={20} />
               </button>
             </div>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto bg-white -mt-6 rounded-t-3xl relative"
          // We removed stopPropagation to allow the parent to detect the initial swipe direction
        >
          <div className="p-6 pb-24">
            {/* Title & Actions */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full mb-2 inline-block">
                  {recipe.category}
                </span>
                <h2 className="text-2xl font-bold text-gray-900">{recipe.title}</h2>
              </div>
              <button 
                onClick={() => onToggleFavorite(recipe.id)}
                className={`p-2 rounded-full transition-colors ${recipe.isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100'}`}
              >
                <Heart size={24} fill={recipe.isFavorite ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => onRate(recipe.id, star)}
                    className="focus:outline-none transition-transform active:scale-125"
                  >
                    <Star 
                      size={20} 
                      className={`${(recipe.rating || 0) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {recipe.rating ? `${recipe.rating}分` : '暂无评分'}
              </span>
            </div>

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {recipe.tags.map(tag => (
                  <div key={tag} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                    <Tag size={12} />
                    {tag}
                  </div>
                ))}
              </div>
            )}

            <p className="text-gray-600 mb-6 leading-relaxed">{recipe.description}</p>

            <div className="flex gap-4 mb-8">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 flex items-center justify-center gap-2 text-gray-600 text-sm">
                <Clock size={16} />
                <span>15 分钟</span>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 flex items-center justify-center gap-2 text-gray-600 text-sm">
                <Users size={16} />
                <span>2 人份</span>
              </div>
            </div>

            {/* Ingredients */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">所需食材</h3>
              <div className="space-y-3">
                {recipe.ingredients.map((ing, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onIngredientClick(ing.name)}
                    className="w-full flex justify-between items-center py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                       <span className="text-gray-800 font-medium">{ing.name}</span>
                       <Search size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-gray-500 text-sm">{ing.amount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">制作步骤</h3>
              <div className="space-y-8">
                {recipe.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                         {idx + 1}
                       </div>
                       <div className="w-px h-full bg-gray-100 last:hidden" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-gray-700 leading-relaxed mb-3">{step.description}</p>
                      {step.image && (
                        <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                          <img src={step.image} alt={`步骤 ${idx + 1}`} className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};