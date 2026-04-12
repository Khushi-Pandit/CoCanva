import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'ai';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary:   'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-200 hover:shadow-md hover:shadow-emerald-200',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
    ghost:     'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-200',
    outline:   'border border-emerald-500 text-emerald-600 hover:bg-emerald-50',
    ai:        'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm shadow-indigo-200',
  };

  const sizes = {
    xs: 'text-xs px-2.5 py-1.5 gap-1',
    sm: 'text-xs px-3 py-2',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-sm px-5 py-3',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
