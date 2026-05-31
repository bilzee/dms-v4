'use client';

import React from 'react';
import { Bell } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationBellProps {
  className?: string;
  onViewAll?: () => void;
}

export function NotificationBell({ className, onViewAll }: NotificationBellProps) {
  const { data: unreadCount, isLoading } = useUnreadNotificationCount();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={20} />
          {!isLoading && unreadCount !== undefined && unreadCount > 0 && (
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
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount !== undefined && unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            )}
          </div>
        </div>
        <div className="p-4 text-center text-sm text-muted-foreground">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : unreadCount === 0 ? (
            'No new notifications'
          ) : (
            `${unreadCount!} unread notification${unreadCount! > 1 ? 's' : ''}`
          )}
        </div>
        {onViewAll && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onViewAll}>
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
