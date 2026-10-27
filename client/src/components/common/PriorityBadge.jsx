import React from 'react';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

const PRIORITY_CONFIG = {
  LOW: {
    label: 'Low',
    icon: ArrowDown,
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    pulse: false,
  },
  NORMAL: {
    label: 'Normal',
    icon: null,
    classes: 'bg-blue-50 text-blue-700 border-blue-200/80',
    pulse: false,
  },
  HIGH: {
    label: 'High',
    icon: ArrowUp,
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
    pulse: false,
  },
  URGENT: {
    label: 'Urgent',
    icon: AlertTriangle,
    classes: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/30',
    pulse: true,
  },
};

export default function PriorityBadge({
  priority = 'NORMAL',
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const normalized = (priority || '').toUpperCase();
  const config = PRIORITY_CONFIG[normalized] || PRIORITY_CONFIG.NORMAL;
  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-full border tracking-wide uppercase
        ${isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'}
        ${config.classes}
        ${config.pulse ? 'animate-pulse font-bold' : ''}
        ${className}
      `}
      title={`Priority: ${config.label}`}
    >
      {showIcon && Icon && (
        <Icon className={`${isSm ? 'w-2.5 h-2.5 mr-1' : 'w-3 h-3 mr-1'} flex-shrink-0`} />
      )}
      <span>{config.label}</span>
    </span>
  );
}
