import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import ConnectionStatus from './ConnectionStatus';
import Avatar from './Avatar';
import { Building, LogOut } from 'lucide-react';

export default function Navbar({ portalName = 'Portal' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-white block">
              HOTEL SERVICE HUB
            </span>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block">
              {portalName}
            </span>
          </div>
        </Link>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-3">
          {/* Real-time Socket Indicator */}
          <ConnectionStatus />

          {/* In-app Notification Dropdown */}
          <NotificationDropdown />

          {/* User Profile Info */}
          {user && (
            <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-slate-800 text-xs text-slate-300">
              <Avatar name={user.name} size="sm" status={user.isOnDuty !== false} />
              <div className="leading-tight">
                <span className="font-semibold block text-slate-200">{user.name}</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase">{user.role}</span>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition active:scale-95"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
