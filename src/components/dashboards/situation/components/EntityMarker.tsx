'use client';

import React, { useMemo, memo, useCallback } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { LatLngBounds, Icon, DivIcon } from 'leaflet';
import { EntityLocation } from '../InteractiveMap';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getBadgeClasses, getDotColor } from '@/components/shared/StatusBadge';
import { 
  MapPin, 
  Hospital, 
  Home, 
  Users, 
  Droplet, 
  Shield, 
  Utensils,
  Info,
  Package
} from 'lucide-react';

interface EntityMarkerProps {
  entity: EntityLocation;
  isSelected?: boolean;
  showDonorOverlay?: boolean;
  onClick?: (entity: EntityLocation) => void;
  onPopupOpen?: (entity: EntityLocation) => void;
}

interface EntityClusterProps {
  entities: EntityLocation[];
  selectedEntityId?: string;
  showDonorOverlay?: boolean;
  onEntityClick?: (entity: EntityLocation) => void;
  onPopupOpen?: (entity: EntityLocation) => void;
}

// Icon mapping for entity types
const ENTITY_TYPE_ICONS = {
  HOSPITAL: Hospital,
  SHELTER: Home,
  COMMUNITY: Users,
  WASH: Droplet,
  SECURITY: Shield,
  FOOD: Utensils,
  FACILITY: Hospital, // Use hospital icon for general facilities
  CAMP: Users,
  WARD: MapPin,
  LGA: MapPin,
  STATE: MapPin
} as const;

const SEVERITY_HEX_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#16a34a'
};

// Memoized icon cache to improve performance
const iconCache = new Map<string, Icon | DivIcon>();

// Custom icon for entities (memoized)
const createEntityIcon = (entity: EntityLocation, isSelected: boolean, showDonorOverlay: boolean): Icon | DivIcon => {
  const cacheKey = `${entity.id}-${isSelected}-${showDonorOverlay}-${entity.gapSummary.severity}`;
  
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const severity = entity.gapSummary.severity;
  const color = SEVERITY_HEX_COLORS[severity];
  const IconComponent = ENTITY_TYPE_ICONS[entity.type as keyof typeof ENTITY_TYPE_ICONS] || MapPin;
  
  // Count donor assignments for overlay indicator
  const donorCount = showDonorOverlay ? (entity.donorAssignments?.length || 0) : 0;
  
  // Get background color class based on severity
  const getSeverityClasses = (sev: string) => {
    const dot = getDotColor('severity', sev);
    const sevMap: Record<string, string> = {
      CRITICAL: 'bg-red-600 border-red-700 shadow-red-300',
      HIGH: 'bg-orange-600 border-orange-700 shadow-orange-300',
      MEDIUM: 'bg-yellow-600 border-yellow-700 shadow-yellow-300',
      LOW: 'bg-green-600 border-green-700 shadow-green-300'
    };
    return sevMap[sev] || 'bg-gray-600 border-gray-700';
  };
  
  // Create SVG for the entity type icon
  const createEntityIconSVG = () => {
    // Simplified icons - in production these would be more detailed
    const iconPaths: Record<string, string> = {
      HOSPITAL: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
      SHELTER: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
      COMMUNITY: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
      WASH: 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z',
      SECURITY: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
      FOOD: 'M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1z',
      FACILITY: 'M12 2l-5.5 9h11z M12 22l5.5-9h-11z M3.5 9l5.5 9v-11z M20.5 9l-5.5 9v-11z',
      CAMP: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
      default: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'
    };
    
    const path = iconPaths[entity.type] || iconPaths.default;
    
    return `
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        class="text-white"
      >
        <path d="${path}" />
      </svg>
    `;
  };
  
  const severityClasses = getSeverityClasses(severity);
  
  const iconHtml = `
    <div class="
      relative flex items-center justify-center
      w-8 h-8 rounded-full border-2 
      ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 ring-offset-white' : ''}
      transition-all duration-200 hover:scale-110 cursor-pointer
      ${severityClasses}
      shadow-lg
    ">
      ${createEntityIconSVG()}
      ${donorCount > 0 ? `
        <div class="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-md">
          <span class="text-xs text-white font-bold">${donorCount}</span>
        </div>
      ` : ''}
      ${isSelected ? `
        <div class="absolute inset-0 rounded-full ring-2 ring-blue-400 ring-opacity-50 animate-pulse"></div>
      ` : ''}
    </div>
  `;

  const icon = new DivIcon({
    html: iconHtml,
    className: 'entity-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32], // Anchor at bottom center
    popupAnchor: [0, -32]
  });

  // Cache the icon for performance
  iconCache.set(cacheKey, icon);
  
  // Limit cache size to prevent memory leaks
  if (iconCache.size > 1000) {
    const firstKey = iconCache.keys().next().value;
    if (firstKey) {
      iconCache.delete(firstKey);
    }
  }

  return icon;
};

// Entity popup content component (memoized for performance)
const EntityPopup = memo<{ entity: EntityLocation; onMoreInfo?: () => void }>(function EntityPopup({ 
  entity, 
  onMoreInfo 
}) {
  const IconComponent = ENTITY_TYPE_ICONS[entity.type as keyof typeof ENTITY_TYPE_ICONS] || MapPin;
  
  return (
    <Card className="p-4 min-w-[250px] max-w-[300px]">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-lg truncate">{entity.name}</h3>
        </div>
        
        {/* Type and Severity */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {entity.type}
          </Badge>
          <Badge 
            variant="outline"
            className={cn("text-xs", getBadgeClasses('severity', entity.gapSummary.severity))}
          >
            {entity.gapSummary.severity}
          </Badge>
        </div>
        
        {/* Gap Summary */}
        <div className={cn(
          "p-3 rounded-lg border",
          getBadgeClasses('severity', entity.gapSummary.severity).replace(/text-\S+/g, '').replace(/border-\S+/g, '').trim()
        )}>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-medium">Gap Analysis</h4>
            <Badge 
              variant="outline"
              className={cn("text-xs", getBadgeClasses('severity', entity.gapSummary.severity))}
            >
              {entity.gapSummary.severity}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Total Gaps:</span>
              <span className="font-medium">{entity.gapSummary.totalGaps}</span>
            </div>
            <div className="flex justify-between">
              <span>No Gaps:</span>
              <span className="font-medium text-green-600">{entity.gapSummary.totalNoGaps}</span>
            </div>
            <div className="flex justify-between">
              <span>Critical:</span>
              <span className="font-medium text-red-600">{entity.gapSummary.criticalGaps}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={cn(
                "font-medium",
                entity.gapSummary.totalGaps > 0 ? "text-red-600" : "text-green-600"
              )}>
                {entity.gapSummary.totalGaps > 0 ? 'Needs Attention' : 'Healthy'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Donor Assignments */}
        {entity.donorAssignments && entity.donorAssignments.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Package className="h-3 w-3" />
              Donor Assignments
            </h4>
            <div className="space-y-1">
              {entity.donorAssignments.slice(0, 3).map((donor, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium">{donor.donorName}</span>
                  <Badge variant={donor.commitmentStatus === 'FULFILLED' ? 'default' : 'secondary'} className="text-xs">
                    {donor.commitmentStatus}
                  </Badge>
                </div>
              ))}
              {entity.donorAssignments.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{entity.donorAssignments.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={onMoreInfo}
          >
            <Info className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </div>
    </Card>
  );
});

const EntityMarkerComponent: React.FC<EntityMarkerProps> = memo(function EntityMarkerComponent({ 
  entity, 
  isSelected, 
  showDonorOverlay, 
  onClick, 
  onPopupOpen 
}) {
  const icon = useMemo(() => 
    createEntityIcon(entity, isSelected || false, showDonorOverlay || false),
    [entity, isSelected, showDonorOverlay]
  );

  const handleClick = React.useCallback(() => {
    onClick?.(entity);
  }, [entity, onClick]);

  const handlePopupOpen = React.useCallback(() => {
    onPopupOpen?.(entity);
  }, [entity, onPopupOpen]);

  return (
    <Marker
      position={[entity.coordinates.latitude, entity.coordinates.longitude]}
      icon={icon}
      eventHandlers={{
        click: handleClick,
        popupopen: handlePopupOpen,
      }}
    >
      <Popup>
        <EntityPopup 
          entity={entity}
          onMoreInfo={() => onClick?.(entity)}
        />
      </Popup>
    </Marker>
  );
});

export function EntityCluster({ 
  entities, 
  selectedEntityId, 
  showDonorOverlay, 
  onEntityClick, 
  onPopupOpen 
}: EntityClusterProps) {
  const map = useMap();

  // Custom cluster icon
  const createClusterIcon = (cluster: any) => {
    const count = cluster.getChildCount();
    let size = 'small';
    let color = 'bg-green-500';
    
    if (count > 50) {
      size = 'large';
      color = 'bg-red-500';
    } else if (count > 20) {
      size = 'medium';
      color = 'bg-yellow-500';
    } else if (count > 10) {
      size = 'medium';
      color = 'bg-blue-500';
    }

    const iconHtml = `
      <div class="
        relative flex items-center justify-center
        ${size === 'large' ? 'w-12 h-12' : size === 'medium' ? 'w-10 h-10' : 'w-8 h-8'}
        ${color} text-white rounded-full
        shadow-lg border-2 border-white
        transition-all duration-200 hover:scale-110
      ">
        <span class="${size === 'large' ? 'text-sm font-bold' : 'text-xs font-medium'}">
          ${count}
        </span>
      </div>
    `;

    return new DivIcon({
      html: iconHtml,
      className: 'entity-cluster',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  };

  return (
    <MarkerClusterGroup
      iconCreateFunction={createClusterIcon}
      chunkedLoading={true}
      maxClusterRadius={50}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={true}
      zoomToBoundsOnClick={true}
    >
      {entities.map(entity => (
        <EntityMarkerComponent
          key={entity.id}
          entity={entity}
          isSelected={selectedEntityId === entity.id}
          showDonorOverlay={showDonorOverlay}
          onClick={onEntityClick}
          onPopupOpen={onPopupOpen}
        />
      ))}
    </MarkerClusterGroup>
  );
}

export default EntityCluster;