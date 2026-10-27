import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

const VARIANTS = {
  success: {
    container: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  error: {
    container: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: AlertCircle,
    iconColor: 'text-rose-600',
  },
  warning: {
    container: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  info: {
    container: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: Info,
    iconColor: 'text-indigo-600',
  },
};

export default function Toast({
  message,
  title,
  variant = 'info',
  onClose,
  className = '',
  action,
}) {
  if (!message && !title) return null;

  const current = VARIANTS[variant] || VARIANTS.info;
  const Icon = current.icon;

  return (
    <div
      className={`
        rounded-2xl border p-4 shadow-sm flex items-start gap-3
        transition-all animate-in fade-in slide-in-from-top-1
        ${current.container}
        ${className}
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${current.iconColor}`} />

      <div className="flex-1 min-w-0">
        {title && <h4 className="text-xs font-bold uppercase tracking-wider">{title}</h4>}
        <p className="text-xs sm:text-sm font-medium leading-relaxed">{message}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-black/5 transition"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
