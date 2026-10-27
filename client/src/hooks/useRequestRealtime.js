import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { SOCKET_EVENTS } from '../utils/constants';

/**
 * Custom hook to subscribe to real-time service request lifecycle events
 *
 * @param {Object} options
 * @param {Function} [options.onRequestUpdated] - Callback fired when a request state changes
 * @param {Function} [options.onRequestCreated] - Callback fired when a new request is created
 * @param {string} [options.filterRequestId] - Optional ID to only receive updates for a specific request
 */
export function useRequestRealtime({
  onRequestUpdated,
  onRequestCreated,
  filterRequestId = null,
} = {}) {
  const { subscribe, isConnected } = useSocket();

  // Keep latest callbacks in refs to avoid rebuilding subscription listeners
  const onUpdateRef = useRef(onRequestUpdated);
  const onCreateRef = useRef(onRequestCreated);
  const filterIdRef = useRef(filterRequestId);

  useEffect(() => {
    onUpdateRef.current = onRequestUpdated;
    onCreateRef.current = onRequestCreated;
    filterIdRef.current = filterRequestId;
  }, [onRequestUpdated, onRequestCreated, filterRequestId]);

  useEffect(() => {
    if (!isConnected) return;

    // Handler for lifecycle state mutations
    const handleUpdate = (payload) => {
      if (!payload) return;
      if (filterIdRef.current && payload.requestId !== filterIdRef.current) {
        return;
      }
      if (typeof onUpdateRef.current === 'function') {
        onUpdateRef.current(payload);
      }
    };

    // Handler for new ticket creations
    const handleCreate = (payload) => {
      if (!payload) return;
      if (typeof onCreateRef.current === 'function') {
        onCreateRef.current(payload);
      }
      // Also notify generic updater if defined
      if (typeof onUpdateRef.current === 'function') {
        onUpdateRef.current(payload);
      }
    };

    // Subscribe to all request lifecycle events
    const unsubCreated = subscribe(SOCKET_EVENTS.REQUEST_CREATED, handleCreate);
    const unsubAssigned = subscribe(SOCKET_EVENTS.REQUEST_ASSIGNED, handleUpdate);
    const unsubAccepted = subscribe(SOCKET_EVENTS.REQUEST_ACCEPTED, handleUpdate);
    const unsubStarted = subscribe(SOCKET_EVENTS.REQUEST_STARTED, handleUpdate);
    const unsubCompleted = subscribe(SOCKET_EVENTS.REQUEST_COMPLETED, handleUpdate);
    const unsubConfirmed = subscribe(SOCKET_EVENTS.REQUEST_CONFIRMED, handleUpdate);
    const unsubCancelled = subscribe(SOCKET_EVENTS.REQUEST_CANCELLED, handleUpdate);
    const unsubUpdated = subscribe(SOCKET_EVENTS.REQUEST_UPDATED, handleUpdate);

    return () => {
      unsubCreated();
      unsubAssigned();
      unsubAccepted();
      unsubStarted();
      unsubCompleted();
      unsubConfirmed();
      unsubCancelled();
      unsubUpdated();
    };
  }, [isConnected, subscribe]);

  return { isConnected };
}

export default useRequestRealtime;
