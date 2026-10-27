import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import {
  Button,
  Input,
  Toast,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from '../../components/common';
import {
  Building,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { USER_ROLES } from '../../utils/constants';

const DEMO_CREDENTIALS = [
  { label: 'Guest (Priya)', email: 'guest@hotelhub.com', pass: 'guest123', role: 'GUEST', badge: 'Room 201' },
  { label: 'Staff (Rajesh)', email: 'staff.hk@hotelhub.com', pass: 'staff123', role: 'STAFF', badge: 'Housekeeping' },
  { label: 'Staff (Vikram)', email: 'staff.maint@hotelhub.com', pass: 'staff123', role: 'STAFF', badge: 'Maintenance' },
  { label: 'Admin (Arjun)', email: 'admin@hotelhub.com', pass: 'admin123', role: 'ADMIN', badge: 'Operations' },
  { label: 'Manager (Sunita)', email: 'manager@hotelhub.com', pass: 'manager123', role: 'MANAGER', badge: 'Executive' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { login, loginWithGoogle, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDemoFill = (demo) => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setLocalError(null);
    clearError();
  };

  const getRedirectPath = (role) => {
    switch (role) {
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLocalError(null);
    clearError();
    if (!credentialResponse?.credential) {
      setLocalError('Failed to receive authentication credentials from Google.');
      return;
    }

    try {
      setSubmitting(true);
      const user = await loginWithGoogle(credentialResponse.credential);
      const destination = location.state?.from?.pathname || getRedirectPath(user.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setLocalError('Google authentication was cancelled or failed to initialize.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      const user = await login(email, password);
      const destination = location.state?.from?.pathname || getRedirectPath(user.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block group">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <Building className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          HOTEL SERVICE HUB
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Smart Hotel Guest Service Request Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Sign In to Your Portal</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Access your department queue, guest suite, or administrative console.
            </p>
          </div>

          {/* Quick Demo Credentials Autofill Panel */}
          <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                Quick Demo Accounts (Dev)
              </span>
              <span className="text-[10px] text-slate-400">Click to autofill</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_CREDENTIALS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handleDemoFill(demo)}
                  className="text-left px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-xs"
                >
                  <div className="font-medium text-slate-800 truncate">{demo.label}</div>
                  <div className="text-[10px] text-indigo-600 font-semibold">{demo.badge}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Notice */}
          {localError && (
            <div className="mb-5">
              <Toast
                variant="error"
                message={localError}
                onClose={() => setLocalError(null)}
              />
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@hotelhub.com"
              icon={Mail}
              autoComplete="email"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={Lock}
              autoComplete="current-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                loadingText="Authenticating..."
                className="w-full shadow-md shadow-indigo-600/20"
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Social Auth Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-500 font-medium tracking-wide">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <div className="flex flex-col items-center justify-center w-full">
            <div className="w-full flex justify-center [&>div]:w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                shape="rectangular"
                text="continue_with"
                width="100%"
              />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              New hotel guest?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Register guest stay
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
