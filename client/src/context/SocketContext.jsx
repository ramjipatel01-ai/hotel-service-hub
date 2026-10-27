import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_EVENTS } from '../utils/constants';

const SocketContext = createContext(null);

// Resolve Socket server URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:5000');

/**
 * SocketProvider
 *
 * Manages the single authoritative Socket.IO client instance for the application.
 * Lifecycle:
 * - Connects only when the user is authenticated with a valid JWT token.
 * - Passes token in handshake auth payload: auth: { token }.
 * - Automatically disconnects and cleans up resources when user logs out.
 * - Manages connection status states: isConnected, isConnecting, connectionError.
 * - Provides subscription helper with automatic listener deduplication and cleanup.
 */
export function SocketProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);

  const socketRef = useRef(null);

  // Initialize and manage socket connection
  useEffect(() => {
    // Only connect if the user is actively authenticated with a valid token
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(null);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    // Create Socket.IO client with robust reconnection options
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection lifecycle event handlers
    const handleConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      setLastConnectedAt(new Date());
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      setIsConnecting(false);
      if (reason === 'io server disconnect') {
        // Disconnected by server (likely token invalid or expired)
        setConnectionError('Disconnected by server. Please re-authenticate.');
      }
    };

    const handleConnectError = (error) => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(error.message || 'Real-time connection error');
    };

    const handleSystemError = (payload) => {
      console.warn('[Socket System Error]:', payload?.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on(SOCKET_EVENTS.SYSTEM_ERROR, handleSystemError);

    // Cleanup on unmount or authentication state mutation
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off(SOCKET_EVENTS.SYSTEM_ERROR, handleSystemError);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [isAuthenticated, token]);

  /**
   * Helper to subscribe to any socket event with automatic cleanup
   * @param {string} event - Event name
   * @param {Function} handler - Callback handler
   * @returns {Function} Unsubscribe cleanup function
   */
  const subscribe = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket || !event || typeof handler !== 'function') {
      return () => {};
    }

    // Attach listener
    socket.on(event, handler);

    // Return cleanup closure
    return () => {
      socket.off(event, handler);
    };
  }, []);

  /**
   * Helper to safely emit an event to the server
   * @param {string} event - Event name
   * @param {any} data - Event payload
   */
  const emit = useCallback((event, data) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connectionError,
    lastConnectedAt,
    subscribe,
    emit,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/**
 * Hook to access SocketContext
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
