import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ConnectionStatus,
  NotificationDropdown,
  Avatar,
  Button,
} from '../components/common';
import {
  Building,
  LogOut,
  Menu,
  X,
  Sparkles,
  Bed,
  Layers,
  Wrench,
  ShieldCheck,
  BarChart3,
  Clock,
  CheckCircle2,
  Users,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { USER_ROLES } from '../utils/constants';

export default function AppLayout({
  portalName = 'Portal',
  activeNav,
  onNavChange,
  navItems = [],
  headerActions,
  children,
}) {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role badge color helper
  const getRoleBadgeClasses = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case USER_ROLES.MANAGER:
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case USER_ROLES.STAFF:
        return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
      case USER_ROLES.GUEST:
      default:
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
      {/* Top Application Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Mobile Hamburger */}
          <div className="flex items-center space-x-3">
            {navItems.length > 0 && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

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
          </div>

          {/* Desktop Navigation Tabs */}
          {navItems.length > 0 && (
            <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              {navItems.map((item) => {
                const isActive = activeNav === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      if (onNavChange) onNavChange(item.id);
                    }}
                    className={`
                      inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                      }
                    `}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />}
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/30 text-indigo-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Header Action Controls */}
          <div className="flex items-center space-x-3">
            {headerActions}

            {/* Socket Connection Status */}
            <ConnectionStatus />

            {/* In-app Notification Dropdown */}
            <NotificationDropdown />

            {/* Role Switcher for Development & Testing */}
            {user && (
              <div className="flex items-center space-x-1.5 bg-slate-800/90 px-2 py-1 rounded-lg border border-indigo-500/30">
                <span className="text-[10px] text-slate-400 uppercase font-bold hidden sm:inline">Role:</span>
                <select
                  value={user.role}
                  onChange={async (e) => {
                    const newRole = e.target.value;
                    if (newRole !== user.role && switchRole) {
                      try {
                        await switchRole(newRole);
                        if (newRole === USER_ROLES.STAFF) navigate('/staff');
                        else if (newRole === USER_ROLES.ADMIN) navigate('/admin');
                        else if (newRole === USER_ROLES.MANAGER) navigate('/manager');
                        else navigate('/guest');
                      } catch (err) {
                        console.error('Role switch failed:', err);
                      }
                    }
                  }}
                  className="bg-slate-900 text-indigo-300 text-xs font-semibold rounded px-1.5 py-0.5 border border-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  title="Switch current account role"
                >
                  <option value={USER_ROLES.GUEST}>Guest Portal</option>
                  <option value={USER_ROLES.STAFF}>Staff (Worker) Portal</option>
                  <option value={USER_ROLES.MANAGER}>Manager Portal</option>
                  <option value={USER_ROLES.ADMIN}>Admin Portal</option>
                </select>
              </div>
            )}

            {/* User Profile Info */}
            {user && (
              <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-800 text-xs text-slate-300">
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

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && navItems.length > 0 && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-4 space-y-1 animate-in slide-in-from-top-2 duration-150">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">
              Portal Sections
            </div>
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    if (onNavChange) onNavChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition
                    ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2.5">
                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {user && (
              <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between px-2 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <Avatar name={user.name} size="xs" status={user.isOnDuty !== false} />
                  <span>{user.name}</span>
                </div>
                <span className="font-mono text-[10px] uppercase">{user.role}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {children}
      </main>

      {/* Application Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">HOTEL SERVICE HUB</span>
            <span>&bull;</span>
            <span>5-Star Hospitality Operations Suite</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-[11px] font-mono text-slate-400">Design System v6.0</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-600 font-medium flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
