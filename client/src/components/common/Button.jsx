import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-500/20 focus-visible:ring-indigo-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-200 focus-visible:ring-slate-400',
  outline: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 focus-visible:ring-indigo-500',
  danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm shadow-rose-500/20 focus-visible:ring-rose-500',
  dangerOutline: 'bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-700 border border-rose-300 focus-visible:ring-rose-500',
  success: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-500/20 focus-visible:ring-emerald-500',
  ghost: 'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 focus-visible:ring-slate-400',
};

const SIZES = {
  xs: 'px-2.5 py-1 text-xs rounded-md font-medium min-h-[28px]',
  sm: 'px-3 py-1.5 text-xs rounded-lg font-semibold min-h-[34px]',
  md: 'px-4 py-2 text-sm rounded-lg font-semibold min-h-[40px]',
  lg: 'px-5 py-2.5 text-base rounded-xl font-semibold min-h-[46px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  className = '',
  onClick,
  ...rest
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center transition-all select-none
        active-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${variantClass}
        ${sizeClass}
        ${isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        ${className}
      `}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className={`w-4 h-4 flex-shrink-0 ${children ? 'mr-2' : ''}`} />
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            <Icon className={`w-4 h-4 flex-shrink-0 ${children ? 'ml-2' : ''}`} />
          )}
        </>
      )}
    </button>
  );
}
