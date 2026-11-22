'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-primary text-primary-fg shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_6px_18px_-6px_rgb(var(--primary)/0.7)] hover:brightness-110',
  secondary: 'bg-surface text-fg border border-border shadow-card hover:bg-muted',
  ghost: 'text-fg-muted hover:text-fg hover:bg-muted',
  accent: 'bg-accent text-accent-fg shadow-[0_6px_18px_-6px_rgb(var(--accent)/0.7)] hover:brightness-105',
  danger: 'bg-danger text-white hover:brightness-110',
  outline: 'border border-primary/40 text-primary hover:bg-primary-soft',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[transform,filter,background-color,color,box-shadow] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
