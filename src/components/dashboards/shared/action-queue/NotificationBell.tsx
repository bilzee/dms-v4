'use client';

import React, { useState } from 'react';
import { Bell, Check } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkNotificationRead, useDismissNotification } from '@/hooks/useNotifications';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { NotificationItem } from '@/types/notification';

interface NotificationBellProps {
  className?: string;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function priorityVariant(priority: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (priority) {
    case 'CRITICAL': return 'destructive';
    case 'HIGH': return 'default';
    case 'MEDIUM': return 'secondary';
    default: return 'outline';
  }
}

function NotificationRow({
  item,
  onMarkRead,
  onDismiss,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const isUnread = !item.readAt;

  return (
    <div
      className={cn(
        'flex gap-2 p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0',
        isUnread && 'bg-primary/5',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
          )}
          <span className={cn('text-sm font-medium truncate', !isUnread && 'text-muted-foreground')}>
            {item.title}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
          {item.body}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {formatTimeAgo(item.createdAt)}
          </span>
          {item.signal && (
            <Badge variant={priorityVariant(item.priority)} className="text-[9px] px-1 py-0 h-4">
              {item.priority}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        {isUnread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onMarkRead(item.id)}
            title="Mark as read"
          >
            <Check size={12} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => onDismiss(item.id)}
          title="Dismiss"
        >
          <span className="text-xs leading-none">&times;</span>
        </Button>
      </div>
    </div>
  );
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: unreadCount, isLoading: countLoading } = useUnreadNotificationCount();
  const { data: notifResult, isLoading: listLoading } = useNotifications({ limit: 20 });
  const markRead = useMarkNotificationRead();
  const dismiss = useDismissNotification();

  const notifications = notifResult?.notifications ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={20} />
          {!countLoading && unreadCount !== undefined && unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                'min-w-[18px] h-[18px] text-[10px] font-bold text-white',
                'bg-red-500 rounded-full px-1',
                unreadCount > 9 && 'animate-pulse',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
          )}
        </div>
        {listLoading ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                item={n}
                onMarkRead={(id) => markRead.mutate(id)}
                onDismiss={(id) => dismiss.mutate(id)}
              />
            ))}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
