'use client'

import { useEffect, useState } from 'react';
import { VerificationDashboard } from '@/components/verification/VerificationDashboard';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, User, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import Link from 'next/link';

export default function VerificationPage() {
  const { currentRole, availableRoles } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Custom error message for multi-role users who haven't selected COORDINATOR role
  const RoleAccessError = () => {
    const hasCoordinatorRole = availableRoles.includes('COORDINATOR');
    
    if (!hasCoordinatorRole) {
      return (
        <div className="container mx-auto p-6">
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              You do not have permission to access this page. Coordinator role is required to verify assessments.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <User className="h-4 w-4" />
              You need to select the <strong>Coordinator</strong> role to access this page.
            </AlertDescription>
          </Alert>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Role Selection Required
              </h3>
              <p className="text-blue-700 mb-4">
                You have the Coordinator role assigned, but you need to actively select it to access this page.
              </p>
              <p className="text-sm text-blue-600 mb-6">
                Switch to the Coordinator role using the role selector in the top-right corner of the page.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Refresh Page After Selecting Role
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <RoleBasedRoute 
      requiredRole="COORDINATOR" 
      fallbackPath="/dashboard"
      loadingComponent={
        <div className="container mx-auto p-6">
          <ContentSkeleton variant="card" />
        </div>
      }
      errorComponent={isClient ? <RoleAccessError /> : null}
    >
      <div className="mb-4">
        <Link href="/verification/metrics">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Verification Metrics
          </Button>
        </Link>
      </div>
      <VerificationDashboard />
    </RoleBasedRoute>
  );
}