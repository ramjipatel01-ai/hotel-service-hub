import React from 'react';
import { User } from 'lucide-react';

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-14 h-14 text-lg',
};

const DOT_SIZES = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

export default function Avatar({
  name,
  src,
  size = 'md',
  status, // 'online' | 'busy' | 'offline' | boolean
  className = '',
}) {
  const sizeClass = SIZES[size] || SIZES.md;
  const dotSizeClass = DOT_SIZES[size] || DOT_SIZES.md;

  const initials = name
    ? name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : null;

  const getStatusColor = () => {
    if (status === true || status === 'online') return 'bg-emerald-500 ring-white';
    if (status === 'busy') return 'bg-amber-500 ring-white';
    if (status === false || status === 'offline') return 'bg-slate-400 ring-white';
    return null;
  };

  const statusColor = getStatusColor();

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`${sizeClass} rounded-full object-cover border border-slate-200`}
        />
      ) : (
        <div
          className={`
            ${sizeClass} rounded-full bg-indigo-50 border border-indigo-200/80
            text-indigo-700 font-bold flex items-center justify-center select-none shadow-xs
          `}
          title={name}
        >
          {initials || <User className="w-1/2 h-1/2" />}
        </div>
      )}

      {statusColor && (
        <span
          className={`
            absolute bottom-0 right-0 block rounded-full ring-2 ${statusColor} ${dotSizeClass}
          `}
          aria-label={typeof status === 'string' ? `Status: ${status}` : 'Online status'}
        />
      )}
    </div>
  );
}
