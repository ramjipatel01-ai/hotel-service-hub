import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser,
  registerUser,
  googleLoginUser,
  getCurrentUser,
  logoutUser,
  updateUserProfile,
} from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'hsh_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on boot
  const restoreSession = useCallback(async () => {
    const existingToken = localStorage.getItem(TOKEN_KEY);
    if (!existingToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getCurrentUser();
      if (response?.data?.user) {
        setUser(response.data.user);
        setToken(existingToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.warn('[AuthContext] Session restoration failed:', err.message);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Listen for 401 unauthorized events dispatched by Axios interceptor
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    };

    window.addEventListener('hsh_auth_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('hsh_auth_unauthorized', handleUnauthorized);
    };
  }, [restoreSession]);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await loginUser({ email, password });
      const { user: userData, token: receivedToken } = response.data;

      localStorage.setItem(TOKEN_KEY, receivedToken);
      setToken(receivedToken);
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Google OAuth Login handler
  const loginWithGoogle = async (credentialOrToken) => {
    setError(null);
    try {
      const payload =
        typeof credentialOrToken === 'string'
          ? { credential: credentialOrToken }
          : credentialOrToken;
      const response = await googleLoginUser(payload);
      const { user: userData, token: receivedToken } = response.data;

      localStorage.setItem(TOKEN_KEY, receivedToken);
      setToken(receivedToken);
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err.message || 'Google authentication failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Register handler (GUEST)
  const register = async (userData) => {
    setError(null);
    try {
      const response = await registerUser(userData);
      const { user: newUser, token: receivedToken } = response.data;

      localStorage.setItem(TOKEN_KEY, receivedToken);
      setToken(receivedToken);
      setUser(newUser);
      return newUser;
    } catch (err) {
      const msg = err.message || 'Registration failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  // Update profile handler
  const updateProfile = async (payload) => {
    setError(null);
    try {
      const response = await updateUserProfile(payload);
      const updatedUser = response.data.user;
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const msg = err.message || 'Profile update failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Switch role handler (Development/Testing helper)
  const switchRole = async (newRole, departmentId = null) => {
    setError(null);
    try {
      const { switchMyRole } = await import('../services/userService.js');
      const data = await switchMyRole({ role: newRole, departmentId });
      const { user: updatedUser, token: receivedToken } = data;

      if (receivedToken) {
        localStorage.setItem(TOKEN_KEY, receivedToken);
        setToken(receivedToken);
      }
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const msg = err.message || 'Failed to switch role.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    error,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    switchRole,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
