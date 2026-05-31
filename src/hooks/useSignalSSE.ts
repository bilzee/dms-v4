import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth/token-utils';

interface SSEEventData {
  type: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

interface UseSignalSSEOptions {
  enabled?: boolean;
  onSignalCreated?: (data: SSEEventData) => void;
  onSignalResolved?: (data: SSEEventData) => void;
  onNotification?: (data: SSEEventData) => void;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'error') => void;
}

export function useSignalSSE(options: UseSignalSSEOptions = {}) {
  const {
    enabled = true,
    onSignalCreated,
    onSignalResolved,
    onNotification,
    onConnectionChange,
  } = options;

  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || !getAuthToken()) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/v1/signals/live');
    eventSourceRef.current = es;

    es.onopen = () => {
      reconnectAttemptsRef.current = 0;
      onConnectionChange?.('connected');
    };

    es.onmessage = (event) => {
      try {
        const parsed: SSEEventData = JSON.parse(event.data);

        switch (parsed.type) {
          case 'SIGNAL_CREATED':
          case 'SIGNAL_UPDATED':
            onSignalCreated?.(parsed);
            queryClient.invalidateQueries({ queryKey: ['action-signals'] });
            break;

          case 'SIGNAL_RESOLVED':
            onSignalResolved?.(parsed);
            queryClient.invalidateQueries({ queryKey: ['action-signals'] });
            break;

          case 'NOTIFICATION_CREATED':
            onNotification?.(parsed);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            break;

          case 'SIGNAL_CONNECTED':
            break;

          case 'heartbeat':
            break;
        }
      } catch {
        // ignore parse errors for heartbeat etc
      }
    };

    es.onerror = () => {
      onConnectionChange?.('disconnected');
      es.close();
      eventSourceRef.current = null;

      const maxBackoff = 30000;
      const baseDelay = 1000;
      const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxBackoff);
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [enabled, queryClient, onSignalCreated, onSignalResolved, onNotification, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    onConnectionChange?.('disconnected');
  }, [onConnectionChange]);

  useEffect(() => {
    if (enabled && getAuthToken()) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { connect, disconnect };
}
