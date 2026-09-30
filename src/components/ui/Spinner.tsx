'use client';

export default function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-3',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full border-neutral-300 border-t-neutral-900 animate-spin dark:border-neutral-600 dark:border-t-neutral-100 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
