import React from 'react';

const BADGE_VARIANTS = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
  sky: 'bg-sky-50 text-sky-700 border-sky-200/80',
  violet: 'bg-violet-50 text-violet-700 border-violet-200/80',
  teal: 'bg-teal-50 text-teal-700 border-teal-200/80',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

const BADGE_SIZES = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-xs',
};

export default function Badge({
  children,
  variant = 'indigo',
  size = 'md',
  dot = false,
  className = '',
  ...rest
}) {
  const variantClass = BADGE_VARIANTS[variant] || BADGE_VARIANTS.indigo;
  const sizeClass = BADGE_SIZES[size] || BADGE_SIZES.md;

  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-full border tracking-wide uppercase
        ${variantClass}
        ${sizeClass}
        ${className}
      `}
      {...rest}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
