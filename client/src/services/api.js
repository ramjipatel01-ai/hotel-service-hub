import axios from 'axios';

// Resolve base URL strictly from environment variable with fallback
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Pre-configured Axios instance for Hotel Service Hub API calls
 */
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Attach JWT authentication token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hsh_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Normalize errors and handle 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // Clear token if token is expired or invalid
    if (status === 401) {
      const currentToken = localStorage.getItem('hsh_auth_token');
      if (currentToken) {
        localStorage.removeItem('hsh_auth_token');
        // Dispatch custom event for AuthContext to sync
        window.dispatchEvent(new Event('hsh_auth_unauthorized'));
      }
    }

    const formattedError = {
      message: error.response?.data?.message || error.message || 'Network communication error',
      status: error.response?.status,
      errors: error.response?.data?.errors,
    };
    return Promise.reject(formattedError);
  }
);

/**
 * Health check helper for verifying server connectivity
 */
export async function getHealthStatus() {
  const response = await api.get('/health');
  return response.data;
}

/**
 * Authentication API Service Endpoints
 */
export async function loginUser(credentials) {
  const response = await api.post('/auth/login', credentials);
  return response.data;
}

export async function registerUser(userData) {
  const response = await api.post('/auth/register', userData);
  return response.data;
}

export async function googleLoginUser(payload) {
  const response = await api.post('/auth/google', payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data;
}

export async function changeUserPassword(payload) {
  const response = await api.patch('/auth/change-password', payload);
  return response.data;
}

export async function logoutUser() {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } catch {
    return { success: true };
  }
}

export async function getUserProfile() {
  const response = await api.get('/users/me');
  return response.data;
}

export async function updateUserProfile(payload) {
  const response = await api.patch('/users/me', payload);
  return response.data;
}

export async function updateStaffDutyStatus(isOnDuty) {
  const response = await api.patch('/users/me/on-duty', { isOnDuty });
  return response.data;
}

// Request API Re-exports
export * from './requestService.js';

// Notification API Re-exports
export * from './notificationService.js';

// Catalog API Re-exports
export * from './catalogService.js';

// Feedback API Re-exports
export * from './feedbackService.js';

// User API Re-exports
export * from './userService.js';

// Analytics API Re-exports
export * from './analyticsService.js';

export default api;
