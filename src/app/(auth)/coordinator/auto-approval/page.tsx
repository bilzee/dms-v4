'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft, Settings } from '@/lib/icons';
import Link from 'next/link';
import { EnhancedAutoApprovalConfig } from '@/components/verification/EnhancedAutoApprovalConfig';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

export default function AutoApprovalManagement() {
  const { currentRole } = useAuth();
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by showing loading state on server
  if (!isClient) {
    return (
      <div className="container mx-auto p-6">
        <ContentSkeleton variant="card" />
      </div>
    );
  }

  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/coordinator/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Auto-Approval Management</h1>
            <p className="text-gray-600 mt-2 hidden sm:block">
              Configure automatic verification settings for rapid response coordination
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Advanced Settings</span>
            </Button>
          </div>
        </div>

        {/* Auto-Approval Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Auto-Approval Management
            </CardTitle>
            <CardDescription>
              Manage automatic verification settings and rules for streamlined coordination workflow.
              Configure thresholds, priority levels, and approval criteria for various assessment and delivery types.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <EnhancedAutoApprovalConfig compactMode={false} />
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Auto-Approval Overview</CardTitle>
            <CardDescription>
              Understanding the auto-approval system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Key Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Priority-based approval thresholds</li>
                  <li>• Automated verification for trusted sources</li>
                  <li>• Configurable rules per assessment type</li>
                  <li>• Real-time monitoring and alerts</li>
                  <li>• Audit trail for all automated decisions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Benefits:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Faster response times for critical situations</li>
                  <li>• Reduced manual workload for coordinators</li>
                  <li>• Consistent application of approval criteria</li>
                  <li>• Improved resource allocation efficiency</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Related Actions</CardTitle>
            <CardDescription>
              Quick access to related coordination tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/coordinator/verification">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verification Queue
                </Button>
              </Link>
              <Link href="/coordinator/dashboard">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Coordinator Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleBasedRoute>
  );
}