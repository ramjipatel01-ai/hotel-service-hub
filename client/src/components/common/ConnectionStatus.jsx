import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function ConnectionStatus({ className = '', showLabel = true }) {
  const { isConnected, isConnecting, connectionError } = useSocket();

  let stateConfig = {
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400 animate-pulse',
    icon: Wifi,
    label: 'Live Sync',
    tooltip: 'Real-time WebSocket connected and syncing',
  };

  if (isConnecting) {
    stateConfig = {
      classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400 animate-spin',
      icon: RefreshCw,
      label: 'Connecting...',
      tooltip: 'Attempting real-time WebSocket connection',
    };
  } else if (!isConnected) {
    stateConfig = {
      classes: 'bg-slate-800 text-slate-400 border-slate-700',
      dot: 'bg-slate-400',
      icon: WifiOff,
      label: 'REST Mode',
      tooltip: connectionError
        ? `Real-time disconnected (${connectionError}). Falling back to REST API.`
        : 'Real-time offline; active in REST API mode.',
    };
  }

  const Icon = stateConfig.icon;

  return (
    <div
      className={`
        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
        transition-all select-none
        ${stateConfig.classes}
        ${className}
      `}
      title={stateConfig.tooltip}
      role="status"
      aria-live="polite"
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${stateConfig.dot}`} />
      <Icon className="w-3 h-3 mr-1 flex-shrink-0" />
      {showLabel && <span className="hidden sm:inline font-mono text-[11px]">{stateConfig.label}</span>}
      <span className="sr-only">{stateConfig.tooltip}</span>
    </div>
  );
}
