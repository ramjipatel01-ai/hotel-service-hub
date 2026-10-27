import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import Button from './Button';

export default function FilterBar({
  children,
  activeCount = 0,
  onReset,
  className = '',
}) {
  return (
    <div
      className={`
        bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm
        flex flex-wrap items-center justify-between gap-3
        ${className}
      `}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider pr-2 border-r border-slate-200 hidden sm:flex">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </div>

        {children}
      </div>

      {onReset && activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          icon={RotateCcw}
          className="text-slate-500 hover:text-slate-800 text-xs flex-shrink-0"
        >
          Reset
        </Button>
      )}
    </div>
  );
}
