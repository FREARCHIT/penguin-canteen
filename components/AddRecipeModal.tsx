import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Image as ImageIcon, Check, Plus, Trash2, Tag, BrainCircuit } from 'lucide-react';
import { Recipe, Category, GeneratedRecipeResponse, RecipeStep } from '../types';
import { generateRecipeFromIdea } from '../services/geminiService';

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'rating' | 'isFavorite'>) => void;
  initialData?: Recipe | null; // For editing
}

const PRESET_TAGS = ['米饭搭子', '面食', '汤羹', '减脂', '快手菜', '硬菜', '便当', '西式', '素食'];
const LOADING_MESSAGES = [
  "正在翻阅米其林指南...",
  "正在咨询五星大厨...",
  "正在计算卡路里...",
  "正在搭配最完美的酱汁...",
  "企鹅正在努力查阅菜谱...",
  "AI 正在思考美味搭配..."
];

export const AddRecipeModal: React.FC<AddRecipeModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [aiPrompt, setAiPrompt] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: Category.MainMeal,
    tags: [] as string[],
    image: '',
    ingredientsStr: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [steps, setSteps] = useState<RecipeStep[]>([{ description: '', image: '' }]);

  // Reset or Populate data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode
        setFormData({
          title: initialData.title,
          description: initialData.description,
          category: initialData.category,
          tags: initialData.tags || [],
          image: initialData.image,
          ingredientsStr: initialData.ingredients.map(i => `${i.name} ${i.amount}`).join('\n')
        });
        setSteps(initialData.steps && initialData.steps.length > 0 
          ? initialData.steps 
          : [{ description: '', image: '' }]);
        setActiveTab('manual');
      } else {
        // Create Mode - Reset
        setFormData({
          title: '',
          description: '',
          category: Category.MainMeal,
          tags: [],
          image: '',
          ingredientsStr: '',
        });
        setSteps([{ description: '', image: '' }]);
        setAiPrompt('');
        setActiveTab('manual');
        setTagInput('');
      }
    }
  }, [isOpen, initialData]);

  // Rotate loading messages
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingMsg(LOADING_MESSAGES[0]);
      let i = 1;
      interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[i % LOADING_MESSAGES.length]);
        i++;
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  if (!isOpen) return null;

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStepImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSteps = [...steps];
        newSteps[index].image = reader.result as string;
        setSteps(newSteps);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateStepDescription = (index: number, text: string) => {
    const newSteps = [...steps];
    newSteps[index].description = text;
    setSteps(newSteps);
  };

  const addStep = () => {
    setSteps([...steps, { description: '', image: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const handleAddTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true); // Visually trigger the loading state immediately
    
    try {
      const result = await generateRecipeFromIdea(aiPrompt);
      if (result) {
        setFormData({
          title: result.title,
          description: result.description,
          category: result.category as Category,
          tags: result.tags || [],
          image: `https://picsum.photos/400/300?seed=${Math.random()}`,
          ingredientsStr: result.ingredients.map(i => `${i.name} ${i.amount}`).join('\n'),
        });
        // Convert simple string steps to object steps
        setSteps(result.steps.map(s => ({ description: s, image: '' })));
        setActiveTab('manual');
      } else {
        alert('AI 生成返回为空。请检查网络或 API Key。');
      }
    } catch (e) {
      console.error(e);
      alert('AI 生成出错。可能是网络原因或 API Quota 耗尽，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const ingredients = formData.ingredientsStr.split('\n').filter(s => s.trim()).map(s => {
      const parts = s.split(' ');
      return {
        name: parts[0],
        amount: parts.slice(1).join(' ') || '适量',
      };
    });

    const validSteps = steps.filter(s => s.description.trim() !== '');

    onSave({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      tags: formData.tags,
      image: formData.image || `https://picsum.photos/400/300?seed=${Math.random()}`,
      ingredients,
      steps: validSteps,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      <div className="bg-white w-full sm:max-w-md h-[90vh] sm:h-[80vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 relative overflow-hidden">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
             <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand-200 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-brand-500 text-white p-6 rounded-full shadow-lg shadow-brand-200">
                  <BrainCircuit size={48} className="animate-pulse" />
                </div>
             </div>
             <h3 className="text-xl font-bold text-gray-800 animate-pulse mb-2">{loadingMsg}</h3>
             <p className="text-sm text-gray-400">正在通过 Google Gemini 生成美味...</p>
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800">{initialData ? '编辑菜谱' : '添加新菜谱'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>

        {/* Tabs - Only show in create mode or if manually wanting to switch, usually AI is for new creation */}
        <div className="flex p-2 gap-2 bg-gray-50 mx-6 mt-4 rounded-xl">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            手动输入
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ai' ? 'bg-gradient-to-r from-brand-500 to-orange-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles size={16} />
            AI 智能生成
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'ai' ? (
            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-xl text-brand-600 text-sm">
                <p>告诉 AI 你有什么食材，或者你想吃什么，它会为你写出完整的菜谱并打好标签。</p>
              </div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="例如：我有鸡蛋和番茄，想做个快手菜..."
                className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 resize-none outline-none"
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !aiPrompt.trim()}
                className="w-full py-3 bg-brand-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-brand-600 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Sparkles />
                开始生成
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Upload */}
              <div className="flex items-center gap-4">
                <div 
                  className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative cursor-pointer"
                  onClick={() => document.getElementById('main-image-upload')?.click()}
                >
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-400" />
                  )}
                  <input 
                    id="main-image-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleMainImageChange}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">菜谱名称</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="输入菜名"
                    className="w-full p-2 rounded-lg border border-gray-200 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">简介</label>
                <input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="一句话描述这道菜..."
                  className="w-full p-2 rounded-lg border border-gray-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">主分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                  className="w-full p-2 rounded-lg border border-gray-200 outline-none bg-white"
                >
                  {Object.values(Category).filter(c => c !== Category.Message).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Tags Section */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">细分标签 (Tags)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map(tag => (
                    <span key={tag} className="bg-gray-800 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-300"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-2 mb-3">
                   <input 
                     value={tagInput}
                     onChange={(e) => setTagInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleAddTag(tagInput)}
                     placeholder="添加标签..."
                     className="flex-1 p-2 text-xs border border-gray-200 rounded-lg outline-none"
                   />
                   <button onClick={() => handleAddTag(tagInput)} disabled={!tagInput} className="bg-gray-100 px-3 rounded-lg text-xs font-bold text-gray-600">+</button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                   {PRESET_TAGS.map(tag => (
                     <button
                       key={tag}
                       onClick={() => handleAddTag(tag)}
                       className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                         formData.tags.includes(tag) 
                           ? 'bg-brand-50 border-brand-200 text-brand-600' 
                           : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                       }`}
                     >
                       {tag}
                     </button>
                   ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">食材 (每行一个，用空格分隔用量)</label>
                <textarea
                  value={formData.ingredientsStr}
                  onChange={(e) => setFormData({...formData, ingredientsStr: e.target.value})}
                  placeholder="例如：&#10;鸡蛋 2个&#10;番茄 1个"
                  className="w-full h-24 p-2 rounded-lg border border-gray-200 outline-none resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">制作步骤</label>
                <div className="space-y-3">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold shrink-0 mt-2 text-gray-500">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={step.description}
                          onChange={(e) => updateStepDescription(idx, e.target.value)}
                          placeholder="描述步骤..."
                          className="w-full p-2 rounded-lg border border-gray-200 outline-none text-sm h-16 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <div 
                             className="w-12 h-12 border border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 relative overflow-hidden"
                             onClick={() => document.getElementById(`step-img-${idx}`)?.click()}
                          >
                             {step.image ? (
                               <img src={step.image} className="w-full h-full object-cover" />
                             ) : (
                               <ImageIcon size={16} className="text-gray-400" />
                             )}
                             <input 
                               id={`step-img-${idx}`}
                               type="file" 
                               className="hidden" 
                               accept="image/*"
                               onChange={(e) => handleStepImageChange(idx, e)} 
                             />
                          </div>
                          {steps.length > 1 && (
                            <button 
                              onClick={() => removeStep(idx)}
                              className="text-gray-400 hover:text-red-500 ml-auto p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={addStep}
                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-medium text-sm hover:bg-gray-50 hover:text-gray-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={16} /> 添加步骤
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white pb-safe">
           <button
            onClick={handleSave}
            disabled={!formData.title}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50"
          >
            <Check size={20} />
            {initialData ? '更新菜谱' : '保存菜谱'}
          </button>
        </div>
      </div>
    </div>
  );
};