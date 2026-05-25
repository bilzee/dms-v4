// Enhanced Layout for Offline-First PWA Operation
'use client';

import { useEffect, useState } from 'react';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { offlineBootstrap } from '@/lib/offline/bootstrap';
import { useSyncStore } from '@/stores/sync.store';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Battery,
  Signal
} from '@/lib/icons';

interface OfflineLayoutProps {
  children: React.ReactNode;
}

export function OfflineLayout({ children }: OfflineLayoutProps) {
  const { user } = useAuth();
  const { status, triggerManualSync } = useSyncStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installReady, setInstallReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Battery API (for field device monitoring)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Check if required offline data is available
    checkDataReadiness();
  }, [user]);

  const checkDataReadiness = async () => {
    if (!user) return;

    try {
      const bootstrapStatus = offlineBootstrap.getBootstrapStatus();
      setDataReady(!bootstrapStatus.needsBootstrap);
    } catch (error) {
      console.error('Error checking data readiness:', error);
      setDataReady(false);
    }
  };

  const handleForceSync = async () => {
    if (isOnline) {
      await triggerManualSync();
    }
  };

  const getConnectionType = (): string => {
    if (!isOnline) return 'Offline';
    
    // Use Network Information API if available
    const connection = (navigator as any).connection;
    if (connection) {
      return connection.effectiveType?.toUpperCase() || 'Unknown';
    }
    
    return 'Online';
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Status Bar for Field Operations */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between text-sm">
        {/* Left: Connection Status */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-xs font-medium">{getConnectionType()}</span>
          </div>
          
          {/* Sync Status */}
          <div className="flex items-center gap-1">
            {status.isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
            ) : status.lastSuccessfulSync ? (
              <CheckCircle className="w-3 h-3 text-green-600" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-orange-600" />
            )}
            <span className="text-xs">
              {status.isSyncing ? 'Syncing...' : 
               status.lastSuccessfulSync ? 'Synced' : 'Not synced'}
            </span>
          </div>
        </div>

        {/* Right: Device Status */}
        <div className="flex items-center gap-4">
          {/* Data Status */}
          <div className={`flex items-center gap-1 ${dataReady ? 'text-green-600' : 'text-orange-600'}`}>
            <Download className="w-3 h-3" />
            <span className="text-xs">
              {dataReady ? 'Data Ready' : 'Data Needed'}
            </span>
          </div>

          {/* Battery Level (if available) */}
          {batteryLevel !== null && (
            <div className={`flex items-center gap-1 ${
              batteryLevel > 50 ? 'text-green-600' : 
              batteryLevel > 20 ? 'text-orange-600' : 'text-red-600'
            }`}>
              <Battery className="w-3 h-3" />
              <span className="text-xs">{batteryLevel}%</span>
            </div>
          )}

          {/* Manual Sync Button */}
          {isOnline && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleForceSync}
              disabled={status.isSyncing}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${status.isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
          <div className="flex items-center gap-2 text-orange-800">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline Mode</span>
            <span className="text-xs">
              - Data will sync when connection is restored
            </span>
          </div>
        </div>
      )}

      {/* Data Not Ready Alert */}
      {!dataReady && user && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <Download className="w-4 h-4" />
              <span className="text-sm">
                Download offline data to work without internet connection
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              disabled={!isOnline}
              onClick={() => {
                // Trigger bootstrap for current user role
                const userRole = user?.roles?.[0]?.role?.name as any;
                if (userRole) {
                  offlineBootstrap.bootstrap(userRole).then(() => {
                    setDataReady(true);
                  });
                }
              }}
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>

      {/* Install Prompt Component */}
      <InstallPrompt autoShow={true} showDelay={5000} />

      {/* PWA Update Notification */}
      {/* This would show when a new version is available */}
      
      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
          <div>PWA: {typeof window !== 'undefined' && 'serviceWorker' in navigator ? 'Supported' : 'Not Supported'}</div>
          <div>Offline: {!isOnline ? 'Yes' : 'No'}</div>
          <div>Standalone: {window.matchMedia('(display-mode: standalone)').matches ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
}