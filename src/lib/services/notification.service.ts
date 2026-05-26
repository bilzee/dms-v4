export interface InAppNotification {
  id: string;
  recipientId: string;
  type: 'achievement_unlocked' | 'ranking_change' | 'milestone_reached';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export interface NotificationPayload {
  recipientId: string;
  type: InAppNotification['type'];
  title: string;
  message: string;
  data?: Record<string, any>;
}

class NotificationService {
  private store: Map<string, InAppNotification[]> = new Map();
  private idCounter = 0;

  async send(payload: NotificationPayload): Promise<InAppNotification> {
    const notification: InAppNotification = {
      id: `notif_${++this.idCounter}`,
      recipientId: payload.recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      read: false,
      createdAt: new Date(),
    };

    const existing = this.store.get(payload.recipientId) || [];
    existing.unshift(notification);
    if (existing.length > 100) existing.length = 100;
    this.store.set(payload.recipientId, existing);

    return notification;
  }

  async getForRecipient(recipientId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<InAppNotification[]> {
    const all = this.store.get(recipientId) || [];
    let filtered = options?.unreadOnly ? all.filter(n => !n.read) : all;
    return filtered.slice(0, options?.limit || 50);
  }

  async markRead(notificationId: string, recipientId: string): Promise<boolean> {
    const all = this.store.get(recipientId) || [];
    const notif = all.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }

  async markAllRead(recipientId: string): Promise<number> {
    const all = this.store.get(recipientId) || [];
    let count = 0;
    for (const n of all) {
      if (!n.read) { n.read = true; count++; }
    }
    return count;
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    const all = this.store.get(recipientId) || [];
    return all.filter(n => !n.read).length;
  }
}

export const notificationService = new NotificationService();
