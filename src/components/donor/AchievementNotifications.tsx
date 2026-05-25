'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Check, Trophy, Star, Award, Crown } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Achievement, BadgeType } from '@/types/gamification';

interface AchievementNotification {
  id: string;
  achievement: Achievement;
  isNew: boolean;
  showAnimation: boolean;
}

interface AchievementNotificationsProps {
  achievements: Achievement[];
  onDismiss?: (achievementId: string) => void;
  onAcknowledge?: (achievementId: string) => void;
  className?: string;
}

export function AchievementNotifications({
  achievements,
  onDismiss,
  onAcknowledge,
  className
}: AchievementNotificationsProps) {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(true);

  // Process new achievements into notifications
  useEffect(() => {
    const newNotifications = achievements
      .filter(achievement => achievement.badge) // Only badge-worthy achievements
      .map((achievement, index) => ({
        id: `${achievement.date}-${achievement.type}-${index}`,
        achievement,
        isNew: true,
        showAnimation: true
      }));

    setNotifications(prev => [...prev, ...newNotifications]);

    // Auto-hide old notifications after 10 seconds
    const timer = setTimeout(() => {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, showAnimation: false }))
      );
    }, 10000);

    return () => clearTimeout(timer);
  }, [achievements]);

  const handleDismiss = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    onDismiss?.(notificationId);
  };

  const handleAcknowledge = (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      onAcknowledge?.(notificationId);
      handleDismiss(notificationId);
    }
  };

  const getIconForBadge = (badgeType: string) => {
    if (badgeType.includes('Gold') || badgeType.includes('Top Performer')) {
      return <Crown className="w-6 h-6 text-yellow-500" />;
    }
    if (badgeType.includes('Silver')) {
      return <Award className="w-6 h-6 text-muted-foreground" />;
    }
    if (badgeType.includes('Bronze')) {
      return <Trophy className="w-6 h-6 text-amber-600" />;
    }
    return <Star className="w-6 h-6 text-blue-500" />;
  };

  const getAnimationClass = (showAnimation: boolean, isNew: boolean) => {
    if (!showAnimation) return 'opacity-0 scale-95';
    if (isNew) return 'animate-pulse';
    return 'opacity-100 scale-100';
  };

  if (notifications.length === 0 || !showNotifications) {
    return null;
  }

  return (
    <div className={cn("fixed top-4 right-4 z-50 space-y-3 max-w-sm", className)}>
      {notifications.slice(0, 3).map((notification) => (
        <Card
          key={notification.id}
          className={cn(
            "relative overflow-hidden transition-all duration-300 ease-in-out",
            getAnimationClass(notification.showAnimation, notification.isNew),
            "shadow-lg bg-amber-500/5 border-amber-500/15"
          )}
        >
          {/* Background gradient for new achievements */}
          {notification.isNew && notification.showAnimation && (
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-50 to-orange-50 opacity-50" />
          )}
          
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0">
                  {getIconForBadge(notification.achievement.badge || '')}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground mb-1">
                    New Achievement!
                  </h4>
                  <p className="text-sm text-foreground mb-2">
                    {notification.achievement.description}
                  </p>
                  {notification.achievement.badge && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300"
                    >
                      {notification.achievement.badge}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAcknowledge(notification.id)}
                  className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(notification.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Summary for multiple achievements */}
      {notifications.length > 3 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-center">
            <p className="text-sm text-blue-800">
              +{notifications.length - 3} more achievements
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotifications([])}
              className="text-blue-600 hover:text-blue-800 mt-2"
            >
              Hide all
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Component for showing achievement progress
interface AchievementProgressProps {
  currentBadges: BadgeType[];
  category: 'delivery' | 'volume' | 'speed' | 'consistency';
  className?: string;
}

export function AchievementProgress({ currentBadges, category, className }: AchievementProgressProps) {
  const getCategoryInfo = () => {
    switch (category) {
      case 'delivery':
        return {
          title: 'Delivery Excellence',
          icon: <Trophy className="w-5 h-5" />,
          levels: [
            { threshold: 70, name: 'Bronze', description: '70% verified delivery rate' },
            { threshold: 85, name: 'Silver', description: '85% verified delivery rate' },
            { threshold: 95, name: 'Gold', description: '95% verified delivery rate' }
          ]
        };
      case 'volume':
        return {
          title: 'Commitment Volume',
          icon: <Award className="w-5 h-5" />,
          levels: [
            { threshold: 10, name: 'Bronze', description: '10+ completed commitments' },
            { threshold: 25, name: 'Silver', description: '25+ completed commitments' },
            { threshold: 50, name: 'Gold', description: '50+ completed commitments' }
          ]
        };
      case 'speed':
        return {
          title: 'Response Speed',
          icon: <Star className="w-5 h-5" />,
          levels: [
            { threshold: 24, name: 'Bronze', description: 'Under 24h average response' },
            { threshold: 12, name: 'Silver', description: 'Under 12h average response' },
            { threshold: 6, name: 'Gold', description: 'Under 6h average response' }
          ]
        };
      case 'consistency':
        return {
          title: 'Consistency',
          icon: <Crown className="w-5 h-5" />,
          levels: [
            { threshold: 3, name: 'Bronze', description: '3+ consecutive months active' },
            { threshold: 6, name: 'Silver', description: '6+ consecutive months active' },
            { threshold: 12, name: 'Gold', description: '12+ consecutive months active' }
          ]
        };
      default:
        return {
          title: 'Achievement',
          icon: <Star className="w-5 h-5" />,
          levels: []
        };
    }
  };

  const categoryInfo = getCategoryInfo();
  const categoryBadges = currentBadges.filter(badge => 
    badge.toLowerCase().includes(category.toLowerCase())
  );

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        {categoryInfo.icon}
        <h4 className="font-semibold">{categoryInfo.title}</h4>
      </div>
      
      <div className="space-y-3">
        {categoryInfo.levels.map((level, index) => {
          const isUnlocked = categoryBadges.some(badge => badge.includes(level.name));
          const isCurrent = isUnlocked && index === categoryBadges.length - 1;
          
          return (
            <div
              key={level.name}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border transition-all",
                isUnlocked 
                  ? "bg-green-50 border-green-200" 
                  : "bg-muted border-border"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                isUnlocked
                  ? level.name === 'Gold' ? "bg-yellow-500 text-white"
                    : level.name === 'Silver' ? "bg-gray-400 text-white"
                    : "bg-amber-600 text-white"
                  : "bg-gray-200 text-muted-foreground"
              )}>
                {isUnlocked ? '✓' : index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium",
                    isUnlocked ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {level.name} Level
                  </span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{level.description}</p>
              </div>
              
              {isUnlocked && (
                <Trophy className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}