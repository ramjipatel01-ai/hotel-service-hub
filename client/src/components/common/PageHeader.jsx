import React from 'react';

export default function PageHeader({
  title,
  description,
  badge,
  icon: Icon,
  actions,
  breadcrumbs,
  className = '',
}) {
  return (
    <div
      className={`
        bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm
        flex flex-col md:flex-row items-start md:items-center justify-between gap-4
        ${className}
      `}
    >
      <div className="space-y-1.5 min-w-0">
        {breadcrumbs && (
          <nav className="text-xs text-slate-500 mb-2 font-medium" aria-label="Breadcrumb">
            {breadcrumbs}
          </nav>
        )}

        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
