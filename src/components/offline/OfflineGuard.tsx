// Offline Guard Component
// Ensures required data is available before allowing offline operations

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Download, RefreshCw, WifiOff, CheckCircle } from '@/lib/icons';
import { offlineBootstrap, BootstrapProgress } from '@/lib/offline/bootstrap';
import { useAuth } from '@/hooks/useAuth';

interface OfflineGuardProps {
  children: React.ReactNode;
  requiredFor: 'ASSESSMENT_CREATION' | 'RESPONSE_PLANNING' | 'BOTH';
  fallbackMessage?: string;
}

export function OfflineGuard({ 
  children, 
  requiredFor, 
  fallbackMessage = 'This feature requires offline data to be downloaded first.' 
}: OfflineGuardProps) {
  
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapProgress, setBootstrapProgress] = useState<BootstrapProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Listen for online/offline changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    checkOfflineReadiness();
  }, [user, requiredFor]);

  const checkOfflineReadiness = async () => {
    if (!user) return;

    try {
      // Check if required data is available
      const status = offlineBootstrap.getBootstrapStatus();
      
      if (!status.needsBootstrap && !status.isBootstrapping) {
        // Verify data exists based on requirements
        const hasRequiredData = await verifyRequiredData();
        setIsReady(hasRequiredData);
      } else {
        setIsReady(false);
      }
    } catch (error) {
      console.error('Error checking offline readiness:', error);
      setIsReady(false);
    }
  };

  const verifyRequiredData = async (): Promise<boolean> => {
    try {
      // Check entities (required for both assessments and responses)
      const entitiesData = localStorage.getItem('drms_offline_entities');
      if (!entitiesData) return false;

      // Check incidents (required for both)
      const incidentsData = localStorage.getItem('drms_offline_incidents');
      if (!incidentsData) return false;

      if (requiredFor === 'ASSESSMENT_CREATION' || requiredFor === 'BOTH') {
        // Check assessment types
        const assessmentTypes = localStorage.getItem('drms_offline_assessment_types');
        if (!assessmentTypes) return false;
      }

      if (requiredFor === 'RESPONSE_PLANNING' || requiredFor === 'BOTH') {
        // Check verified assessments for response planning
        const verifiedAssessments = localStorage.getItem('drms_offline_verified_assessments');
        if (!verifiedAssessments) return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying required data:', error);
      return false;
    }
  };

  const handleBootstrap = async () => {
    if (!user?.roles?.[0]?.role?.name) return;

    setIsBootstrapping(true);
    setError(null);

    const userRole = user.roles[0].role.name as any;
    
    const success = await offlineBootstrap.bootstrap(userRole, (progress) => {
      setBootstrapProgress(progress);
    });

    if (success) {
      setIsReady(true);
      setBootstrapProgress(null);
    } else {
      setError('Failed to download offline data. Please check your connection and try again.');
    }

    setIsBootstrapping(false);
  };

  const handleRefresh = async () => {
    setError(null);
    const success = await offlineBootstrap.refreshOfflineData();
    
    if (success) {
      setIsReady(true);
    } else {
      setError('Failed to refresh offline data. Please try again.');
    }
  };

  // Show loading state during initial check
  if (user && isReady === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking offline data...</p>
        </div>
      </div>
    );
  }

  // If data is ready, show the protected content
  if (isReady) {
    return <>{children}</>;
  }

  // Show offline data download UI
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Download className="w-6 h-6 text-blue-600" />
            ) : (
              <WifiOff className="w-6 h-6 text-orange-500" />
            )}
            <div>
              <CardTitle className="text-lg">
                {isBootstrapping ? 'Downloading Data...' : 'Offline Data Required'}
              </CardTitle>
              <CardDescription>
                {isOnline 
                  ? 'Download required data for offline operation' 
                  : 'No internet connection - offline data needed'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Bootstrap Progress */}
          {isBootstrapping && bootstrapProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{bootstrapProgress.stage.replace('_', ' ')}</span>
                <span>{bootstrapProgress.progress}%</span>
              </div>
              <Progress value={bootstrapProgress.progress} className="w-full" />
              <p className="text-xs text-muted-foreground">{bootstrapProgress.message}</p>
              
              {bootstrapProgress.errors.length > 0 && (
                <div className="text-xs text-red-600">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {bootstrapProgress.errors.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Data Requirements */}
          {!isBootstrapping && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{fallbackMessage}</p>
              
              <div className="space-y-2 text-xs">
                <p className="font-medium text-foreground">Required offline data:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Entities and locations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Active incidents
                  </li>
                  {(requiredFor === 'ASSESSMENT_CREATION' || requiredFor === 'BOTH') && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Assessment templates
                    </li>
                  )}
                  {(requiredFor === 'RESPONSE_PLANNING' || requiredFor === 'BOTH') && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Verified assessments
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          {!isBootstrapping && (
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleBootstrap} 
                disabled={!isOnline}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                {isOnline ? 'Download Data' : 'No Internet'}
              </Button>
              
              {isReady === false && (
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={!isOnline}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {/* Offline Help */}
          {!isOnline && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <WifiOff className="w-3 h-3 inline mr-1" />
              Connect to internet to download required offline data
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Specialized guards for specific workflows
export function AssessmentOfflineGuard({ children }: { children: React.ReactNode }) {
  return (
    <OfflineGuard 
      requiredFor="ASSESSMENT_CREATION"
      fallbackMessage="Download incident and entity data to create assessments offline."
    >
      {children}
    </OfflineGuard>
  );
}

export function ResponseOfflineGuard({ children }: { children: React.ReactNode }) {
  return (
    <OfflineGuard 
      requiredFor="RESPONSE_PLANNING"
      fallbackMessage="Download verified assessments and entity data to plan responses offline."
    >
      {children}
    </OfflineGuard>
  );
}