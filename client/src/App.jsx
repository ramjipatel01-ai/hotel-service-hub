import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/Unauthorized';
import GuestShell from './pages/guest/GuestShell';
import StaffShell from './pages/staff/StaffShell';
import AdminShell from './pages/admin/AdminShell';
import ManagerShell from './pages/manager/ManagerShell';
import { USER_ROLES } from './utils/constants';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ConnectionStatus,
  NotificationDropdown,
  Avatar,
} from './components/common';
import {
  Building,
  Server,
  CheckCircle2,
  Activity,
  Layers,
  ShieldCheck,
  RefreshCw,
  Database,
  Radio,
  LogIn,
  UserPlus,
  ArrowRight,
  LogOut,
  UserCheck,
  Bell,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { getHealthStatus } from './services/api';

function FoundationHome() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected, isConnecting, connectionError } = useSocket();
  const navigate = useNavigate();

  const checkServer = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthStatus();
      setHealth(data);
    } catch (err) {
      setError(err.message || 'Unable to reach backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkServer();
  }, []);

  const getPortalPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case USER_ROLES.GUEST:
        return '/guest';
      case USER_ROLES.STAFF:
        return '/staff';
      case USER_ROLES.ADMIN:
        return '/admin';
      case USER_ROLES.MANAGER:
        return '/manager';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block">HOTEL SERVICE HUB</span>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block">
                Design System v6.0
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {/* Real-Time WebSocket Connection Indicator */}
                <ConnectionStatus />

                {/* Notification Dropdown */}
                <NotificationDropdown />

                {/* User Avatar */}
                <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-slate-800">
                  <Avatar name={user.name} size="sm" status={user.isOnDuty !== false} />
                  <span className="text-xs text-slate-300 font-medium">{user.name}</span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(getPortalPath())}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  My Portal
                </Button>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/login')}
                  icon={LogIn}
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                  icon={UserPlus}
                >
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-4 tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Phase 6 — Professional Frontend Design System Active</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hotel Service Hub
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Smart Hotel Guest Service Request Management Platform.
            Unified typography, accessible components, real-time Socket.IO synchronization, and 5-star hospitality aesthetics.
          </p>

          {/* Quick Access CTAs */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/login')}
              icon={LogIn}
            >
              Enter Application
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/register')}
              icon={UserPlus}
            >
              Guest Registration
            </Button>
          </div>
        </div>

        {/* Live System Diagnostics Card */}
        <Card className="p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <Activity className="w-5 h-5 text-indigo-600 mr-2" />
                Backend Health & System Connectivity
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Direct verification of Express REST runtime via <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">GET /api/health</code>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkServer}
              disabled={loading}
              icon={RefreshCw}
              isLoading={loading}
              loadingText="Testing..."
            >
              Re-test Health API
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                REST Operational Status
              </span>
              <div className="mt-2 flex items-center">
                {health?.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" />
                    <span className="font-semibold text-emerald-700 text-sm">Online & Responding</span>
                  </>
                ) : (
                  <span className="font-semibold text-slate-700 text-sm">
                    {loading ? 'Checking...' : 'Not Connected'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {health?.message || error || 'Pending health check response'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Socket.IO Engine
              </span>
              <div className="mt-2 flex items-center">
                {isConnected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" />
                    <span className="font-semibold text-emerald-700 text-sm">Connected (Live WSS)</span>
                  </>
                ) : isAuthenticated ? (
                  <>
                    <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mr-2 flex-shrink-0" />
                    <span className="font-semibold text-amber-700 text-sm">
                      {isConnecting ? 'Connecting...' : 'Reconnecting...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5 text-slate-400 mr-2 flex-shrink-0" />
                    <span className="font-semibold text-slate-600 text-sm">Standby (Auth Required)</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {isConnected ? 'Subscribed to authenticated rooms' : 'REST fallback active'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Database Configuration
              </span>
              <div className="mt-2 flex items-center">
                <Database className="w-5 h-5 text-indigo-600 mr-2 flex-shrink-0" />
                <span className="font-semibold text-slate-800 text-sm">
                  {health?.database === 'connected' ? 'Atlas Connected' : 'Configured (Standby)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Mongoose ODM with Atlas URI resolution
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Active Session State
              </span>
              <div className="mt-2 flex items-center">
                <ShieldCheck className="w-5 h-5 text-indigo-600 mr-2 flex-shrink-0" />
                <span className="font-semibold text-slate-800 text-sm truncate">
                  {isAuthenticated ? `${user.name} (${user.role})` : 'Anonymous Guest'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {isAuthenticated ? 'Authenticated via Bearer JWT' : 'Click Sign In to authenticate'}
              </p>
            </div>
          </div>
        </Card>

        {/* Phase 6 Design System Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Unified Design Tokens</h3>
            <p className="text-xs text-slate-600">
              Curated slate/indigo palette, Inter typography, and precise status & priority tokens.
            </p>
          </Card>

          <Card className="p-5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Shared Components</h3>
            <p className="text-xs text-slate-600">
              Accessible Button, Input, Modal, StatusBadge, PriorityBadge, and ResponsiveTable.
            </p>
          </Card>

          <Card className="p-5">
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Real-Time Sync UI</h3>
            <p className="text-xs text-slate-600">
              Unobtrusive live status indicators and real-time notification dropdown.
            </p>
          </Card>

          <Card className="p-5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Role Shells Intact</h3>
            <p className="text-xs text-slate-600">
              Seamless role-tailored workflows for Guest, Staff, Admin, and Manager.
            </p>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          Hotel Service Hub &bull; Phase 6 Complete &bull; Compliant with <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">design.md</code>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<FoundationHome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Role-Scoped Portals */}
              <Route
                path="/guest"
                element={
                  <RoleRoute allowedRoles={[USER_ROLES.GUEST, USER_ROLES.ADMIN]}>
                    <GuestShell />
                  </RoleRoute>
                }
              />

              <Route
                path="/staff"
                element={
                  <RoleRoute allowedRoles={[USER_ROLES.STAFF, USER_ROLES.ADMIN]}>
                    <StaffShell />
                  </RoleRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                    <AdminShell />
                  </RoleRoute>
                }
              />

              <Route
                path="/manager"
                element={
                  <RoleRoute allowedRoles={[USER_ROLES.MANAGER, USER_ROLES.ADMIN]}>
                    <ManagerShell />
                  </RoleRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
