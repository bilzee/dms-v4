export interface NotificationItem {
  id: string;
  userId: string;
  signalId: string;
  title: string;
  body: string;
  priority: string;
  readAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  signal?: {
    id: string;
    entityId: string;
    incidentId: string | null;
    type: string;
    signalReason: string;
    priority: string;
    entity: {
      id: string;
      name: string;
    };
  } | null;
}

export interface NotificationListResponse {
  success: boolean;
  data: {
    notifications: NotificationItem[];
    unreadCount: number;
    totalCount: number;
  };
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
