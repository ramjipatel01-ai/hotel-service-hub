import React from 'react';

export function Card({
  children,
  className = '',
  interactive = false,
  onClick,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border border-slate-200/90 shadow-sm
        transition-all duration-200
        ${interactive ? 'hover:shadow-md hover:border-slate-300 cursor-pointer active-scale' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...rest }) {
  return (
    <div
      className={`px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', as: Component = 'h3', ...rest }) {
  return (
    <Component
      className={`text-base font-bold text-slate-900 tracking-tight ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function CardDescription({ children, className = '', ...rest }) {
  return (
    <p className={`text-xs text-slate-500 mt-1 ${className}`} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...rest }) {
  return (
    <div className={`p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...rest }) {
  return (
    <div
      className={`px-6 py-4 bg-slate-50/80 rounded-b-2xl border-t border-slate-100 flex items-center justify-between gap-3 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
