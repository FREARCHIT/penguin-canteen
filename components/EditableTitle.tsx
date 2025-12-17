
import React, { useState, useEffect, useRef } from 'react';
import { Edit2 } from 'lucide-react';

interface EditableTitleProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  placeholder?: string;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({ value, onChange, className = "", placeholder = "点击编辑" }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (tempValue.trim() !== '') {
      onChange(tempValue);
    } else {
      setTempValue(value); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`bg-transparent border-b-2 border-brand-500 outline-none w-full min-w-[100px] ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className={`group cursor-pointer flex items-baseline gap-2 relative ${className}`}
    >
      <span className="truncate">{value}</span>
      <Edit2 size={12} className="opacity-0 group-hover:opacity-50 text-gray-400 transition-opacity absolute -right-4 top-1/2 -translate-y-1/2" />
    </div>
  );
};
