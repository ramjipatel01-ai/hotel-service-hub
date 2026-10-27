import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import {
  Button,
  Input,
  Toast,
  Card,
} from '../../components/common';
import { Building, Lock, Mail, User, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { USER_ROLES } from '../../utils/constants';
import { validateEmail, validatePhone } from '../../utils/validators';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { register, loginWithGoogle, clearError } = useAuth();
  const navigate = useNavigate();

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
      navigate(getRedirectPath(user.role), { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Google registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setLocalError('Google authentication was cancelled or failed to initialize.');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const { name, email, phone, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (name.trim().length < 2) {
      setLocalError('Please enter a valid full name (at least 2 characters).');
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      setLocalError(emailErr);
      return;
    }

    const phoneErr = validatePhone(phone, false);
    if (phoneErr) {
      setLocalError(phoneErr);
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : '',
        password,
      });
      navigate('/guest', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please try again.');
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
          Guest Registration
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Register your guest account to manage room services and track requests live.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-6 sm:p-8">
          {localError && (
            <div className="mb-5">
              <Toast
                variant="error"
                message={localError}
                onClose={() => setLocalError(null)}
              />
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Priya Sharma"
              icon={User}
              autoComplete="name"
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="priya.sharma@gmail.com"
              icon={Mail}
              autoComplete="email"
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98123 45678"
              icon={Phone}
              autoComplete="tel"
              helperText="10-digit Indian mobile number (e.g. +91 98123 45678)"
            />

            <Input
              label="Password (min 6 characters)"
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              icon={Lock}
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              icon={Lock}
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                loadingText="Registering Account..."
                className="w-full shadow-md shadow-indigo-600/20"
                icon={ArrowRight}
                iconPosition="right"
              >
                Create Guest Account
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
                Or register with
              </span>
            </div>
          </div>

          {/* Google Sign-Up Button */}
          <div className="flex flex-col items-center justify-center w-full">
            <div className="w-full flex justify-center [&>div]:w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                shape="rectangular"
                text="signup_with"
                width="100%"
              />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
