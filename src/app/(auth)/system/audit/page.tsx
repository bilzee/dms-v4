import { Metadata } from 'next';
import { Suspense } from 'react';
import AuditLogDashboard from '@/components/dashboards/admin/AuditLogDashboard';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

export const metadata: Metadata = {
  title: 'Audit Trail & Monitoring | Disaster Management System',
  description: 'Comprehensive audit trail and system monitoring for administrators',
};

interface AuditPageProps {
  searchParams: Promise<{
    tab?: string;
    actions?: string;
    resources?: string;
    userIds?: string;
    dateRange?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
    searchText?: string;
    export?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  // Parse search parameters
  const resolvedParams = await searchParams;
  
  // Extract filters from URL parameters
  const filters = {
    tab: resolvedParams.tab || 'overview',
    actions: resolvedParams.actions ? resolvedParams.actions.split(',') : undefined,
    resources: resolvedParams.resources ? resolvedParams.resources.split(',') : undefined,
    userIds: resolvedParams.userIds ? resolvedParams.userIds.split(',') : undefined,
    page: resolvedParams.page ? parseInt(resolvedParams.page) : 1,
    pageSize: resolvedParams.pageSize ? parseInt(resolvedParams.pageSize) : 50,
    sortBy: resolvedParams.sortBy || 'timestamp',
    sortOrder: (resolvedParams.sortOrder as 'asc' | 'desc') || 'desc',
    searchText: resolvedParams.searchText,
    dateRange: resolvedParams.dateRange ? JSON.parse(resolvedParams.dateRange) : undefined,
    export: resolvedParams.export,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Audit Trail & Monitoring
          </h1>
          <p className="text-muted-foreground hidden sm:block">
            Comprehensive system activity tracking, security monitoring, and compliance reporting
          </p>
        </div>

        {/* Main Dashboard */}
        <Suspense fallback={<AuditPageLoading />}>
          <AuditLogDashboard 
            initialFilters={filters}
            className="w-full"
          />
        </Suspense>
      </div>
    </div>
  );
}

function AuditPageLoading() {
  return (
    <div className="space-y-6">
      {/* Loading Header */}
      <ContentSkeleton variant="card" />

      {/* Loading Summary Cards */}
      <ContentSkeleton variant="metric" count={4} />

      {/* Loading Search & Table */}
      <ContentSkeleton variant="table" rows={10} cols={4} />
    </div>
  );
}