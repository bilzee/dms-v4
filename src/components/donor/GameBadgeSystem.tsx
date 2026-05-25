'use client';

import React, { useState } from 'react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Star, 
  Award, 
  TrendingUp,
  Clock,
  Target,
  Crown,
  Trophy,
  X
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { BadgeType } from '@/types/gamification';

interface GameBadgeSystemProps {
  badges: BadgeType[];
  showProgress?: boolean;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
  className?: string;
}

interface BadgeDefinition {
  type: BadgeType;
  category: 'delivery' | 'volume' | 'speed' | 'consistency' | 'ranking';
  level: 'bronze' | 'silver' | 'gold' | 'special';
  threshold: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    text: string;
    border: string;
  };
}

// Badge definitions with visual properties
const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  'Reliable Delivery Bronze': {
    type: 'Reliable Delivery Bronze',
    category: 'delivery',
    level: 'bronze',
    threshold: 70,
    description: '70% verified delivery rate',
    icon: CheckCircle,
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300'
    }
  },
  'Reliable Delivery Silver': {
    type: 'Reliable Delivery Silver',
    category: 'delivery',
    level: 'silver',
    threshold: 85,
    description: '85% verified delivery rate',
    icon: CheckCircle,
    color: {
      bg: 'bg-muted',
      text: 'text-foreground',
      border: 'border-gray-300'
    }
  },
  'Reliable Delivery Gold': {
    type: 'Reliable Delivery Gold',
    category: 'delivery',
    level: 'gold',
    threshold: 95,
    description: '95% verified delivery rate',
    icon: Crown,
    color: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-300'
    }
  },
  'High Volume Bronze': {
    type: 'High Volume Bronze',
    category: 'volume',
    level: 'bronze',
    threshold: 10,
    description: '10+ completed commitments',
    icon: Target,
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300'
    }
  },
  'High Volume Silver': {
    type: 'High Volume Silver',
    category: 'volume',
    level: 'silver',
    threshold: 25,
    description: '25+ completed commitments',
    icon: Target,
    color: {
      bg: 'bg-muted',
      text: 'text-foreground',
      border: 'border-gray-300'
    }
  },
  'High Volume Gold': {
    type: 'High Volume Gold',
    category: 'volume',
    level: 'gold',
    threshold: 50,
    description: '50+ completed commitments',
    icon: Award,
    color: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-300'
    }
  },
  'Quick Response Bronze': {
    type: 'Quick Response Bronze',
    category: 'speed',
    level: 'bronze',
    threshold: 24,
    description: 'Average response under 24 hours',
    icon: Clock,
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300'
    }
  },
  'Quick Response Silver': {
    type: 'Quick Response Silver',
    category: 'speed',
    level: 'silver',
    threshold: 12,
    description: 'Average response under 12 hours',
    icon: Clock,
    color: {
      bg: 'bg-muted',
      text: 'text-foreground',
      border: 'border-gray-300'
    }
  },
  'Quick Response Gold': {
    type: 'Quick Response Gold',
    category: 'speed',
    level: 'gold',
    threshold: 6,
    description: 'Average response under 6 hours',
    icon: TrendingUp,
    color: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-300'
    }
  },
  'Consistency Bronze': {
    type: 'Consistency Bronze',
    category: 'consistency',
    level: 'bronze',
    threshold: 3,
    description: 'Active for 3+ consecutive months',
    icon: Star,
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300'
    }
  },
  'Consistency Silver': {
    type: 'Consistency Silver',
    category: 'consistency',
    level: 'silver',
    threshold: 6,
    description: 'Active for 6+ consecutive months',
    icon: Star,
    color: {
      bg: 'bg-muted',
      text: 'text-foreground',
      border: 'border-gray-300'
    }
  },
  'Consistency Gold': {
    type: 'Consistency Gold',
    category: 'consistency',
    level: 'gold',
    threshold: 12,
    description: 'Active for 12+ consecutive months',
    icon: Star,
    color: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-300'
    }
  },
  'Top Performer Regional': {
    type: 'Top Performer Regional',
    category: 'ranking',
    level: 'special',
    threshold: 0,
    description: 'Top 10% in regional rankings',
    icon: Trophy,
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-300'
    }
  },
  'Top Performer National': {
    type: 'Top Performer National',
    category: 'ranking',
    level: 'special',
    threshold: 0,
    description: 'Top 1% in national rankings',
    icon: Trophy,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-300'
    }
  }
};

// Size configurations
const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3',
    dialogTrigger: 'text-xs'
  },
  md: {
    badge: 'px-3 py-1 text-sm',
    icon: 'w-4 h-4',
    dialogTrigger: 'text-sm'
  },
  lg: {
    badge: 'px-4 py-2 text-base',
    icon: 'w-5 h-5',
    dialogTrigger: 'text-base'
  }
};

export function GameBadgeSystem({
  badges,
  showProgress = true,
  interactive = true,
  size = 'md',
  maxVisible = 5,
  className
}: GameBadgeSystemProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  
  const sizeConfig = SIZE_CONFIG[size];
  const visibleBadges = badges.slice(0, maxVisible);
  const hasMoreBadges = badges.length > maxVisible;
  
  // Group badges by category for better organization
  const groupedBadges = badges.reduce((acc, badge) => {
    const category = BADGE_DEFINITIONS[badge]?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(badge);
    return acc;
  }, {} as Record<string, BadgeType[]>);

  const renderBadge = (badgeType: BadgeType, showTooltip = true) => {
    const definition = BADGE_DEFINITIONS[badgeType];
    const Icon = definition?.icon || Star;
    
    if (!definition) {
      // Fallback for unknown badges
      return (
        <Badge variant="outline" className={sizeConfig.badge}>
          <Icon className={cn(sizeConfig.icon, "mr-1")} />
          {badgeType}
        </Badge>
      );
    }

    const badgeElement = (
      <Badge 
        variant="outline" 
        className={cn(
          sizeConfig.badge,
          definition.color.bg,
          definition.color.text,
          definition.color.border,
          "flex items-center gap-1 border-2"
        )}
      >
        <Icon className={sizeConfig.icon} />
        <span className="hidden sm:inline">
          {badgeType.replace(/ (Bronze|Silver|Gold)/, ' $1')}
        </span>
        <span className="sm:hidden">
          {badgeType.includes('Gold') && '🏆'}
          {badgeType.includes('Silver') && '🥈'}
          {badgeType.includes('Bronze') && '🥉'}
          {!badgeType.includes('Bronze') && !badgeType.includes('Silver') && !badgeType.includes('Gold') && '🎖️'}
        </span>
      </Badge>
    );

    if (!showTooltip) return badgeElement;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeElement}
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-semibold">{badgeType}</p>
              <p className="text-xs text-muted-foreground">{definition.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderBadgeDialog = () => (
    <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedBadge && BADGE_DEFINITIONS[selectedBadge]?.icon && 
              React.createElement(BADGE_DEFINITIONS[selectedBadge]!.icon, { className: "w-5 h-5" })
            }
            {selectedBadge}
          </DialogTitle>
          <DialogDescription>
            Achievement details and requirements
          </DialogDescription>
        </DialogHeader>
        
        {selectedBadge && BADGE_DEFINITIONS[selectedBadge] && (
          <div className="space-y-4">
            {renderBadge(selectedBadge, false)}
            
            <div className="space-y-2">
              <h4 className="font-semibold">Description</h4>
              <p className="text-sm text-muted-foreground">
                {BADGE_DEFINITIONS[selectedBadge].description}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Category</h4>
              <Badge 
                variant="secondary" 
                className={BADGE_DEFINITIONS[selectedBadge].color.bg + ' ' + BADGE_DEFINITIONS[selectedBadge].color.text}
              >
                {BADGE_DEFINITIONS[selectedBadge].category}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Level</h4>
              <Badge variant="outline">
                {BADGE_DEFINITIONS[selectedBadge].level}
              </Badge>
            </div>
            
            {showProgress && (
              <div className="space-y-2">
                <h4 className="font-semibold">Progress</h4>
                <ProgressBar value={100} variant="success" size="sm" />
                <p className="text-xs text-green-600">Achievement Unlocked!</p>
              </div>
            )}
          </div>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => setSelectedBadge(null)}
          className="w-full"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={cn("flex items-center flex-wrap gap-2", className)}>
      <TooltipProvider>
        {visibleBadges.map((badge) => (
          <div key={badge}>
            {interactive ? (
              <button
                onClick={() => setSelectedBadge(badge)}
                className="transition-transform hover:scale-105"
              >
                {renderBadge(badge)}
              </button>
            ) : (
              renderBadge(badge)
            )}
          </div>
        ))}
        
        {hasMoreBadges && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn(sizeConfig.badge, "cursor-pointer")}
                onClick={() => setSelectedBadge(badges[maxVisible])}
              >
                +{badges.length - maxVisible}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-semibold">{badges.length - maxVisible} more achievements</p>
                <p className="text-xs text-muted-foreground">Click to view all badges</p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
      
      {renderBadgeDialog()}
      
      {showProgress && groupedBadges && Object.keys(groupedBadges).length > 0 && (
        <div className="mt-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
              <div key={category} className="text-center">
                <h4 className="text-sm font-semibold mb-2 capitalize">{category}</h4>
                <div className="flex flex-wrap justify-center gap-1">
                  {categoryBadges.map((badge) => (
                    <div key={badge} className="transform scale-75 origin-left">
                      {renderBadge(badge, false)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BadgeProgress({
  currentBadges,
  totalPossibleBadges,
  showPercentage = true
}: {
  currentBadges: BadgeType[];
  totalPossibleBadges: number;
  showPercentage?: boolean;
}) {
  const percentage = (currentBadges.length / totalPossibleBadges) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Achievements: {currentBadges.length}/{totalPossibleBadges}
        </span>
        {showPercentage && (
          <span className="text-sm text-muted-foreground">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      
      <ProgressBar value={percentage} variant="gradient" size="sm" />
      
      {currentBadges.length === totalPossibleBadges && (
        <div className="text-center">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            🎉 All Achievements Unlocked!
          </Badge>
        </div>
      )}
    </div>
  );
}