'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft, Settings, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { ResourceManagement } from '@/components/dashboards/crisis/ResourceManagement';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

export default function ResourceDonationManagement() {
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
            <h1 className="text-3xl font-bold text-gray-900">Resource & Donation Management</h1>
            <p className="text-gray-600 mt-2">
              Coordinate resource allocation and manage donation workflows for effective crisis response
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Management Settings
            </Button>
            <Button>
              <Package className="h-4 w-4 mr-2" />
              New Resource Request
            </Button>
          </div>
        </div>

        {/* Resource Management Section */}
        <ResourceManagement />

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Management Overview</CardTitle>
            <CardDescription>
              Understanding the resource and donation coordination system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Key Capabilities:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Real-time resource inventory tracking</li>
                  <li>• Donation flow monitoring and management</li>
                  <li>• Automated resource allocation optimization</li>
                  <li>• Multi-agency coordination support</li>
                  <li>• Priority-based distribution planning</li>
                  <li>• Comprehensive reporting and analytics</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Resource Categories:</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="text-sm">
                    <p className="font-medium mb-1">Emergency Supplies:</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Medical equipment and supplies</li>
                      <li>• Food and water provisions</li>
                      <li>• Shelter and blankets</li>
                      <li>• Personal protective equipment</li>
                    </ul>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium mb-1">Operational Resources:</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Transportation vehicles</li>
                      <li>• Communication equipment</li>
                      <li>• Personnel deployment</li>
                      <li>• Temporary infrastructure</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Related Actions</CardTitle>
            <CardDescription>
              Quick access to related resource management tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/coordinator/donors">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Donor Management
                </Button>
              </Link>
              <Link href="/coordinator/donors/metrics">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Donor Metrics
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