import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  className,
  size = 'md'
}) => {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    outline: "bg-transparent border-slate-300 text-slate-600"
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs"
  };

  return (
    <span className={cn(
      "inline-flex items-center justify-center font-semibold rounded-full border",
      variants[variant],
      sizes[size],
      className
    )}>
      {children}
    </span>
  );
};