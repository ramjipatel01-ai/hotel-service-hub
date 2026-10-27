import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no records matching your criteria.',
  action,
  className = '',
}) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12
        text-center flex flex-col items-center justify-center
        ${className}
      `}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mb-4 shadow-sm">
        <Icon className="w-7 h-7 stroke-1" />
      </div>

      <h3 className="text-base font-bold text-slate-900 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
