import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import { getAuthToken } from '@/lib/auth/token-utils';
import { toast } from 'sonner';
import type { NotificationItem, NotificationListResponse } from '@/types/notification';

interface UseNotificationsOptions {
  unreadOnly?: boolean;
  includeExpired?: boolean;
  page?: number;
  limit?: number;
  refetchInterval?: number;
}

interface NotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    unreadOnly = false,
    includeExpired = false,
    page = 1,
    limit = 50,
    refetchInterval = 60000,
  } = options;

  return useQuery<NotificationsResult>({
    queryKey: ['notifications', { unreadOnly, includeExpired, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('unreadOnly', String(unreadOnly));
      params.append('includeExpired', String(includeExpired));
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const result = await apiGet<NotificationListResponse>(`/api/v1/notifications?${params}`);
      if (!result.success) {
        throw new Error((result as any).error || 'Failed to fetch notifications');
      }
      const data = (result as any).data as NotificationsResult;
      return data;
    },
    staleTime: 30000,
    refetchInterval,
    enabled: !!getAuthToken(),
  });
}

export function useUnreadNotificationCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const result = await apiGet<NotificationListResponse>('/api/v1/notifications?unreadOnly=true&limit=1');
      if (!result.success) return 0;
      return (result as any).data?.unreadCount ?? 0;
    },
    staleTime: 30000,
    refetchInterval: 60000,
    enabled: !!getAuthToken(),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await apiPatch(`/api/v1/notifications/${notificationId}/read`);
      if (!result.success) {
        throw new Error((result as any).error || 'Failed to mark notification as read');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error('Failed to mark notification as read', { description: error.message });
    },
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await apiPatch(`/api/v1/notifications/${notificationId}/dismiss`);
      if (!result.success) {
        throw new Error((result as any).error || 'Failed to dismiss notification');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error('Failed to dismiss notification', { description: error.message });
    },
  });
}

export function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
}
