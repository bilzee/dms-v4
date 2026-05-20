import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { createAuthenticatedFetch } from '@/lib/auth/token-utils';
import { ConflictApiResponse, ConflictSummary, ConflictFilters, PaginatedConflictResponse } from '@/types/conflict';

interface UseConflictsReturn {
  conflicts: ConflictApiResponse[];
  summary: ConflictSummary | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  fetchConflicts: (filters?: ConflictFilters) => Promise<void>;
  fetchSummary: () => Promise<void>;
  exportConflicts: (filters?: ConflictFilters) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useConflicts(): UseConflictsReturn {
  const [conflicts, setConflicts] = useState<ConflictApiResponse[]>([]);
  const [summary, setSummary] = useState<ConflictSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseConflictsReturn['pagination']>(null);
  const [currentFilters, setCurrentFilters] = useState<ConflictFilters>({});

  const fetchConflicts = useCallback(async (filters: ConflictFilters = {}) => {
    setLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      const queryParams = new URLSearchParams();
      
      if (filters.page) queryParams.set('page', filters.page.toString());
      if (filters.limit) queryParams.set('limit', filters.limit.toString());
      if (filters.entityType) queryParams.set('entityType', filters.entityType);
      if (filters.resolved !== undefined) queryParams.set('resolved', filters.resolved.toString());
      if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);

      const result = await apiGet<PaginatedConflictResponse>(`/api/v1/sync/conflicts?${queryParams.toString()}`);
      
      if (result.success && result.data) {
        setConflicts(result.data.data);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.error || 'Failed to fetch conflicts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conflicts');
      console.error('Error fetching conflicts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const result = await apiGet<ConflictSummary>('/api/v1/sync/conflicts/summary');
      
      if (result.success && result.data) {
        setSummary(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch conflict summary');
      }
    } catch (err) {
      console.error('Error fetching conflict summary:', err);
      // Don't set error state for summary failures, as it's not critical
    }
  }, []);

  const exportConflicts = useCallback(async (filters: ConflictFilters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.entityType) queryParams.set('entityType', filters.entityType);
      if (filters.resolved !== undefined) queryParams.set('resolved', filters.resolved.toString());
      if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);

      const response = await createAuthenticatedFetch(`/api/v1/sync/conflicts/export?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'conflict-report.csv';

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export conflicts');
      console.error('Error exporting conflicts:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchConflicts(currentFilters),
      fetchSummary()
    ]);
  }, [fetchConflicts, fetchSummary, currentFilters]);

  // Auto-refresh conflicts every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refresh();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refresh, loading]);

  return {
    conflicts,
    summary,
    loading,
    error,
    pagination,
    fetchConflicts,
    fetchSummary,
    exportConflicts,
    refresh
  };
}
