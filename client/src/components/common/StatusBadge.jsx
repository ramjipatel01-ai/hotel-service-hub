import React from 'react';
import {
  Clock,
  UserCheck,
  Check,
  Play,
  CheckCircle2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    classes: 'bg-amber-50 text-amber-800 border-amber-200/90',
    dotColor: 'bg-amber-500',
  },
  ASSIGNED: {
    label: 'Assigned',
    icon: UserCheck,
    classes: 'bg-sky-50 text-sky-800 border-sky-200/90',
    dotColor: 'bg-sky-500',
  },
  ACCEPTED: {
    label: 'Accepted',
    icon: Check,
    classes: 'bg-blue-50 text-blue-800 border-blue-200/90',
    dotColor: 'bg-blue-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: Play,
    classes: 'bg-violet-50 text-violet-800 border-violet-200/90',
    dotColor: 'bg-violet-500',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    dotColor: 'bg-emerald-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    icon: ShieldCheck,
    classes: 'bg-teal-50 text-teal-800 border-teal-200/90',
    dotColor: 'bg-teal-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    classes: 'bg-rose-50 text-rose-800 border-rose-200/90',
    dotColor: 'bg-rose-500',
  },
};

export default function StatusBadge({
  status = 'PENDING',
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const normalized = (status || '').toUpperCase();
  const config = STATUS_CONFIG[normalized] || {
    label: status || 'Unknown',
    icon: Clock,
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-full border
        ${isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'}
        ${config.classes}
        ${className}
      `}
      title={`Request Status: ${config.label}`}
      role="status"
    >
      {showIcon && Icon && (
        <Icon className={`${isSm ? 'w-2.5 h-2.5 mr-1' : 'w-3 h-3 mr-1.5'} flex-shrink-0`} />
      )}
      <span>{config.label}</span>
    </span>
  );
}
