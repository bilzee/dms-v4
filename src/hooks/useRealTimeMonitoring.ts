'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

// Types for real-time updates
interface RealTimeConfig {
  incidentId?: string;
  updateInterval?: number; // seconds
  enableWebSocket?: boolean;
  onIncidentUpdate?: (incident: any) => void;
  onNewIncident?: (incident: any) => void;
  onError?: (error: Error) => void;
}

interface WebSocketMessage {
  type: 'incident_update' | 'new_incident' | 'entity_update' | 'assessment_update';
  data: any;
  timestamp: string;
}

interface RealTimeState {
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  retryCount: number;
}

/**
 * WebSocket connection manager for real-time dashboard updates
 */
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(private config: RealTimeConfig) {}

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Determine WebSocket URL based on current environment
      const wsUrl = this.getWebSocketUrl();
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
      this.config.onError?.(new Error('Connecting to real-time updates...'));
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error('Failed to create WebSocket connection'));
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect WebSocket connection
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get WebSocket URL based on environment
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/dashboard/live`;
    
    // Add incident ID if specified
    if (this.config.incidentId) {
      return `${wsUrl}?incidentId=${this.config.incidentId}`;
    }
    
    return wsUrl;
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.config.onError?.(new Error('Connected to real-time updates'));
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'incident_update':
          this.config.onIncidentUpdate?.(message.data);
          break;
        case 'new_incident':
          this.config.onNewIncident?.(message.data);
          break;
        case 'entity_update':
          // Handle entity updates for interactive map
          break;
        case 'assessment_update':
          // Handle assessment updates for gap analysis
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.config.onError?.(error instanceof Error ? error : new Error('Invalid message format'));
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    this.config.onError?.(new Error('Real-time connection closed'));
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event): void {
    this.config.onError?.(new Error(`WebSocket error: ${error}`));
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}

/**
 * Polling fallback for environments without WebSocket support
 */
class PollingManager {
  private pollTimer: NodeJS.Timeout | null = null;
  private lastPollTime = 0;

  constructor(private config: RealTimeConfig, private queryClient: QueryClient) {}

  /**
   * Start polling for updates
   */
  start(): void {
    const interval = (this.config.updateInterval || 30) * 1000; // Default 30 seconds
    
    this.pollTimer = setInterval(() => {
      this.pollForUpdates();
    }, interval);

    this.config.onError?.(new Error('Using polling for real-time updates'));
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Poll for updates using API calls
   */
  private async pollForUpdates(): Promise<void> {
    try {
      const params = new URLSearchParams({
        realTime: 'true',
        ...(this.config.incidentId && { incidentId: this.config.incidentId })
      });

      const result = await apiGet(`/api/v1/dashboard/situation?${params}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!result.success) {
        throw new Error(`Polling failed: ${result.error}`);
      }
      
      // Invalidate relevant queries to trigger re-fetch
      if (this.config.incidentId) {
        this.queryClient.invalidateQueries({
          queryKey: ['incidents', this.config.incidentId]
        });
        this.queryClient.invalidateQueries({
          queryKey: ['aggregateMetrics', this.config.incidentId]
        });
        this.queryClient.invalidateQueries({
          queryKey: ['populationImpact', this.config.incidentId]
        });
        this.queryClient.invalidateQueries({
          queryKey: ['entities', this.config.incidentId]
        });
        this.queryClient.invalidateQueries({
          queryKey: ['gapAnalysis', this.config.incidentId]
        });
      } else {
        this.queryClient.invalidateQueries({
          queryKey: ['incidents']
        });
      }
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error('Polling failed'));
    }
  }
}

/**
 * Real-time monitoring hook for dashboard updates
 * 
 * Provides:
 * - WebSocket connection with automatic reconnection
 * - Polling fallback for environments without WebSocket support
 * - Connection status monitoring
 * - Automatic data refresh when updates occur
 * - Configurable update intervals and callbacks
 */
export function useRealTimeMonitoring(config: RealTimeConfig) {
  const [state, setState] = useState<RealTimeState>({
    isConnected: false,
    lastUpdate: null,
    connectionStatus: 'connecting',
    retryCount: 0
  });

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const pollingManagerRef = useRef<PollingManager | null>(null);
  const queryClient = useQueryClient();

  // Update connection status
  const updateStatus = useCallback((status: RealTimeState['connectionStatus'], error?: Error) => {
    setState(prev => ({
      ...prev,
      connectionStatus: status,
      lastUpdate: status === 'connected' ? new Date() : prev.lastUpdate,
      retryCount: status === 'connecting' ? prev.retryCount + 1 : prev.retryCount
    }));

    if (error && config.onError) {
      config.onError(error);
    }
  }, [config]);

  // Start real-time monitoring
  useEffect(() => {
    if (!config.incidentId && !config.enableWebSocket) {
      // Only start if we have an incident ID or WebSocket is explicitly enabled
      return;
    }

    updateStatus('connecting');

    // Try WebSocket first if enabled
    if (config.enableWebSocket !== false && typeof WebSocket !== 'undefined') {
      try {
        wsManagerRef.current = new WebSocketManager({
          ...config,
          onError: (error) => {
            updateStatus('error', error);
            // Fall back to polling if WebSocket fails
            if (pollingManagerRef.current === null) {
              pollingManagerRef.current = new PollingManager(config, queryClient);
              pollingManagerRef.current.start();
            }
          },
          onIncidentUpdate: (incident) => {
            setState(prev => ({
              ...prev,
              isConnected: true,
              connectionStatus: 'connected',
              lastUpdate: new Date()
            }));
            config.onIncidentUpdate?.(incident);
            
            // Invalidate queries to trigger refresh
            queryClient.invalidateQueries({
              queryKey: ['incidents', config.incidentId]
            });
          },
          onNewIncident: (incident) => {
            setState(prev => ({
              ...prev,
              isConnected: true,
              connectionStatus: 'connected',
              lastUpdate: new Date()
            }));
            config.onNewIncident?.(incident);
            
            // Invalidate incidents list
            queryClient.invalidateQueries({
              queryKey: ['incidents']
            });
          }
        });

        wsManagerRef.current.connect();
      } catch (error) {
        // Fall back to polling if WebSocket is not available
        if (pollingManagerRef.current === null) {
          pollingManagerRef.current = new PollingManager(config, queryClient);
          pollingManagerRef.current.start();
        }
      }
    } else {
      // Use polling only
      if (pollingManagerRef.current === null) {
        pollingManagerRef.current = new PollingManager(config, queryClient);
        pollingManagerRef.current.start();
      }
    }

    return () => {
      // Cleanup on unmount
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
        wsManagerRef.current = null;
      }
      
      if (pollingManagerRef.current) {
        pollingManagerRef.current.stop();
        pollingManagerRef.current = null;
      }
    };
  }, [config.incidentId, config.enableWebSocket, updateStatus, config, queryClient]);

  // Connection status helper functions
  const getStatusColor = useCallback(() => {
    switch (state.connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'connecting':
        return 'text-blue-600 bg-blue-100';
      case 'disconnected':
        return 'text-gray-600 bg-gray-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }, [state.connectionStatus]);

  const getStatusIcon = useCallback(() => {
    switch (state.connectionStatus) {
      case 'connected':
        return '●'; // Green circle
      case 'connecting':
        return '⟳'; // Spinning circle
      case 'disconnected':
        return '○'; // Empty circle
      case 'error':
        return '✕'; // X mark
      default:
        return '?';
    }
  }, [state.connectionStatus]);

  return {
    // State
    isConnected: state.isConnected,
    connectionStatus: state.connectionStatus,
    lastUpdate: state.lastUpdate,
    retryCount: state.retryCount,
    
    // UI Helper functions
    getStatusColor,
    getStatusIcon,
    
    // Manual controls
    disconnect: useCallback(() => {
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
      if (pollingManagerRef.current) {
        pollingManagerRef.current.stop();
      }
      updateStatus('disconnected');
    }, []),
    
    reconnect: useCallback(() => {
      if (wsManagerRef.current) {
        wsManagerRef.current.connect();
      }
      if (pollingManagerRef.current) {
        pollingManagerRef.current.start();
      }
      updateStatus('connecting');
    }, [])
  };
}

export default useRealTimeMonitoring;