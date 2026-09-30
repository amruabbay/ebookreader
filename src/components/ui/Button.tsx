'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className = '', children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary: 'bg-[#1c1917] text-white hover:bg-black focus:ring-neutral-500 dark:bg-white dark:text-[#1c1917] dark:hover:bg-neutral-200 shadow-xs',
      secondary: 'bg-[#faf8f5] text-[#1c1917] border border-[#ede8e1] hover:bg-[#f5f2eb] focus:ring-neutral-400 dark:bg-[#202024] dark:border-[#27272a] dark:text-[#f4f4f5] dark:hover:bg-[#27272a]',
      ghost: 'text-[#78716c] hover:bg-[#f5f5f4] hover:text-[#1c1917] focus:ring-neutral-400 dark:text-[#a1a1aa] dark:hover:bg-[#27272a] dark:hover:text-white',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-xs',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-xs sm:text-sm px-4 py-2.5 gap-2',
      lg: 'text-sm sm:text-base px-6 py-3 gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

