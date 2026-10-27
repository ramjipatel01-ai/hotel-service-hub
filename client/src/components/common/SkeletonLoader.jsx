import React from 'react';

export default function SkeletonLoader({
  type = 'card',
  count = 1,
  className = '',
}) {
  const items = Array.from({ length: count });

  if (type === 'row') {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="h-12 bg-slate-200/70 rounded-xl animate-pulse w-full"
          />
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
        <div className="h-12 bg-slate-100 border-b border-slate-200 animate-pulse" />
        <div className="p-4 space-y-3">
          {items.map((_, i) => (
            <div
              key={i}
              className="h-10 bg-slate-100 rounded-lg animate-pulse w-full"
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'metric') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm animate-pulse space-y-3"
          >
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  // Default: 'card'
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm animate-pulse space-y-4"
        >
          <div className="flex justify-between items-center">
            <div className="h-5 bg-slate-200 rounded w-24" />
            <div className="h-5 bg-slate-200 rounded-full w-20" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <div className="h-4 bg-slate-100 rounded w-16" />
            <div className="h-8 bg-slate-200 rounded-lg w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
