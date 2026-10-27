import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
} from '../services/api';
import { SOCKET_EVENTS } from '../utils/constants';

const NotificationContext = createContext(null);

/**
 * NotificationProvider
 *
 * Central state mechanism for in-app notifications.
 * Features:
 * - REST hydration on session boot
 * - Live real-time notification listener via SocketContext
 * - Optimistic and synchronized unread count
 * - Methods to mark individual or all notifications as read
 */
export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const { subscribe, isConnected } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications from REST API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getNotifications({ limit: 30 });
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to fetch notifications:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Real-time synchronization via WebSockets
  useEffect(() => {
    if (!isAuthenticated || !isConnected) return;

    // Listen for incoming live notifications
    const unsubscribeNew = subscribe(SOCKET_EVENTS.NOTIFICATION_NEW, (payload) => {
      const newNotif = payload?.notification;
      if (!newNotif) return;

      setNotifications((prev) => {
        // Prevent duplicate entries
        if (prev.some((n) => (n._id || n.id) === newNotif.id)) {
          return prev;
        }
        return [
          {
            _id: newNotif.id,
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
            isRead: false,
            createdAt: newNotif.createdAt,
            request: newNotif.requestId,
          },
          ...prev,
        ];
      });

      setUnreadCount((prev) => prev + 1);
    });

    // Listen for read updates across multiple client tabs
    const unsubscribeRead = subscribe(SOCKET_EVENTS.NOTIFICATION_READ, (payload) => {
      const ids = payload?.notificationIds || [];
      if (ids.length === 0) return;

      setNotifications((prev) =>
        prev.map((n) => {
          const currentId = (n._id || n.id)?.toString();
          if (ids.includes(currentId)) {
            return { ...n, isRead: true };
          }
          return n;
        })
      );

      // Re-fetch accurate count or recalculate
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
    };
  }, [isAuthenticated, isConnected, subscribe]);

  // Mark single notification as read
  const markAsRead = async (id) => {
    try {
      // Optimistic local state update
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Authoritative REST mutation
      await apiMarkAsRead(id);
    } catch (err) {
      console.warn('[NotificationContext] markAsRead error:', err.message);
      // Re-sync on failure
      fetchNotifications();
    }
  };

  // Mark all user notifications as read
  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await apiMarkAllAsRead();
    } catch (err) {
      console.warn('[NotificationContext] markAllAsRead error:', err.message);
      fetchNotifications();
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

/**
 * Hook to access NotificationContext
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
