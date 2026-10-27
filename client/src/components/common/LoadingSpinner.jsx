import React from 'react';
import { Loader2 } from 'lucide-react';

const SIZES = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const COLORS = {
  indigo: 'text-indigo-600',
  white: 'text-white',
  slate: 'text-slate-600',
  emerald: 'text-emerald-600',
};

export default function LoadingSpinner({
  size = 'md',
  color = 'indigo',
  message,
  className = '',
}) {
  const sizeClass = SIZES[size] || SIZES.md;
  const colorClass = COLORS[color] || COLORS.indigo;

  return (
    <div
      className={`flex flex-col items-center justify-center p-4 text-center ${className}`}
      role="status"
    >
      <Loader2 className={`${sizeClass} ${colorClass} animate-spin`} />
      {message && (
        <p className="mt-2.5 text-xs font-medium text-slate-600">{message}</p>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
