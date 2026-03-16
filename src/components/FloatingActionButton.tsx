import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  variant?: 'primary' | 'secondary';
}

export default function FloatingActionButton({ 
  onClick, 
  icon = <Plus className="w-6 h-6" />, 
  label,
  variant = 'primary'
}: FloatingActionButtonProps) {
  const baseClasses = 'fixed bottom-24 right-4 md:hidden z-40 flex items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95';
  
  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${label ? 'pl-4 pr-5 py-3' : 'w-14 h-14'}`}
      aria-label={label || '添加'}
    >
      {icon}
      {label && <span className="ml-2 font-medium text-sm">{label}</span>}
    </button>
  );
}
