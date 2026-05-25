'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBounds, LatLng, Map as LeafletMap } from 'leaflet';
import { cn } from '@/lib/utils';
import '@/components/dashboards/situation/map-styles.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ZoomIn, 
  ZoomOut, 
  Home, 
  Layers,
  Maximize2,
  Minimize2
} from '@/lib/icons';
// import { OfflineTileLayer } from './components/OfflineTileLayer';
import { EntityCluster } from './components/EntityMarker';
import { DonorOverlayControl } from './components/DonorOverlayControl';
import type { DonorOverlayControlProps } from './components/DonorOverlayControl';
import { useDashboardLayoutStore } from '@/stores/dashboardLayout.store';
import { useTouchGestures } from '@/hooks/useTouchGestures';

// Since this is a client component, we can import directly

export interface MapBounds {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

export interface EntityLocation {
  id: string;
  name: string;
  type: EntityType;
  coordinates: { latitude: number; longitude: number };
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  gapSummary: {
    totalGaps: number;
    totalNoGaps: number;
    criticalGaps: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  };
  donorAssignments?: Array<{
    donorId: string;
    donorName: string;
    commitmentStatus: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>;
  }>;
}

export type EntityType = 
  | 'COMMUNITY' 
  | 'WARD' 
  | 'LGA' 
  | 'STATE' 
  | 'FACILITY' 
  | 'CAMP';

interface InteractiveMapProps {
  incidentId: string;
  selectedEntityId?: string;
  donorOverlayEnabled?: boolean;
  className?: string;
  onEntitySelect?: (entityId: string) => void;
  onDonorOverlayToggle?: (enabled: boolean) => void;
  onViewportChange?: (bounds: MapBounds, zoom: number) => void;
  entities?: EntityLocation[];
  initialBounds?: MapBounds;
  initialZoom?: number;
}

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

interface MapSkeletonProps {
  className?: string;
}

function MapSkeleton({ className }: MapSkeletonProps) {
  return (
    <Card className={cn('relative h-full min-h-[400px] overflow-hidden', className)}>
      <Skeleton className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-pulse">
            <div className="h-8 w-8 mx-auto bg-muted rounded-full" />
          </div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    </Card>
  );
}

function MapControls({ 
  onZoomIn, 
  onZoomOut, 
  onResetView, 
  onToggleFullscreen, 
  isFullscreen 
}: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Card className="p-1 shadow-lg">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            className="h-8 w-8 p-0"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            className="h-8 w-8 p-0"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetView}
            className="h-8 w-8 p-0"
            aria-label="Reset view"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="h-8 w-8 p-0"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface MapEventHandlerProps {
  onViewportChange?: (bounds: MapBounds, zoom: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapEventHandler({ onViewportChange, onMapClick }: MapEventHandlerProps) {
  useMapEvents({
    moveend: (event) => {
      const map = event.target;
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      onViewportChange?.({
        northEast: {
          lat: bounds.getNorthEast().lat,
          lng: bounds.getNorthEast().lng
        },
        southWest: {
          lat: bounds.getSouthWest().lat,
          lng: bounds.getSouthWest().lng
        }
      }, zoom);
    },
    click: (event) => {
      onMapClick?.(event.latlng.lat, event.latlng.lng);
    }
  });

  return null;
}

interface ViewStateManagerProps {
  initialBounds?: MapBounds;
  initialZoom?: number;
  onViewportChange?: (bounds: MapBounds, zoom: number) => void;
}

function ViewStateManager({ 
  initialBounds, 
  initialZoom = 10, 
  onViewportChange 
}: ViewStateManagerProps) {
  const map = useMap();
  
  useEffect(() => {
    if (initialBounds) {
      const bounds = new LatLngBounds([
        [initialBounds.southWest.lat, initialBounds.southWest.lng],
        [initialBounds.northEast.lat, initialBounds.northEast.lng]
      ]);
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (initialZoom) {
      map.setZoom(initialZoom);
    }
  }, [initialBounds, initialZoom, map]);

  return null;
}

function InteractiveMapCore({
  entities = [],
  selectedEntityId,
  donorOverlayEnabled = false,
  onEntitySelect,
  onViewportChange,
  onMapClick,
  initialBounds,
  initialZoom = 10,
  className
}: InteractiveMapProps & { onMapClick?: (lat: number, lng: number) => void }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Dashboard store integration
  const {
    mapViewport,
    setMapViewport,
    setSelectedEntityFromMap,
    setDonorOverlayEnabled,
    setMapInitialized
  } = useDashboardLayoutStore();

  // Map control handlers
  const handleZoomIn = useCallback(() => {
    if (map) {
      map.zoomIn();
    }
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (map) {
      map.zoomOut();
    }
  }, [map]);

  const handleResetView = useCallback(() => {
    if (map && initialBounds) {
      const bounds = new LatLngBounds([
        [initialBounds.southWest.lat, initialBounds.southWest.lng],
        [initialBounds.northEast.lat, initialBounds.northEast.lng]
      ]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, initialBounds]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleMapCreated = useCallback((mapInstance: LeafletMap) => {
    if (!mapInstance) return;
    
    setMap(mapInstance);
    setMapInitialized(true);
    
    // Restore viewport from store if available
    if (mapViewport.center && mapViewport.zoom) {
      mapInstance.setView([mapViewport.center.lat, mapViewport.center.lng], mapViewport.zoom);
    }
  }, [mapViewport, setMapInitialized]);

  // Handle entity selection from dashboard
  const handleEntitySelect = useCallback((entityId: string) => {
    setSelectedEntityFromMap(entityId);
    onEntitySelect?.(entityId);
  }, [setSelectedEntityFromMap, onEntitySelect]);

  // Handle donor overlay toggle
  const handleDonorOverlayToggle = useCallback((enabled: boolean) => {
    setDonorOverlayEnabled(enabled);
    // Call parent callback if provided
    if (onEntitySelect && typeof onEntitySelect === 'function') {
      (onEntitySelect as any)(enabled);
    }
  }, [setDonorOverlayEnabled, onEntitySelect]);

  // Handle viewport changes
  const handleViewportChangeInternal = useCallback((bounds: any, zoom: number) => {
    const center = bounds ? {
      lat: (bounds.northEast.lat + bounds.southWest.lat) / 2,
      lng: (bounds.northEast.lng + bounds.southWest.lng) / 2
    } : null;
    
    setMapViewport(center, zoom, bounds);
    onViewportChange?.(bounds, zoom);
  }, [setMapViewport, onViewportChange]);

  // Mobile gesture handlers
  const handlePinchZoom = useCallback((scale: number, centerX: number, centerY: number) => {
    if (!map) return;
    
    const currentZoom = map.getZoom();
    const newZoom = Math.min(Math.max(currentZoom + Math.log2(scale), 0), 20); // Clamp between 0-20
    map.setZoom(newZoom);
  }, [map]);

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    if (!map) return;
    
    map.panBy([-deltaX, -deltaY]);
  }, [map]);

  const handleDoubleTap = useCallback((x: number, y: number) => {
    if (!map) return;
    
    // Convert screen coordinates to map coordinates and zoom in
    const point = map.containerPointToLayerPoint([x, y]);
    const targetLatLng = map.layerPointToLatLng(point);
    
    map.setView(targetLatLng, Math.min(map.getZoom() + 1, 18));
  }, [map]);

  // Add touch gesture support
  useTouchGestures(mapRef, {
    onPinchZoom: handlePinchZoom,
    onPan: handlePan,
    onDoubleTap: handleDoubleTap,
    preventDefault: true,
    threshold: 5
  });

  return (
    <Card className={cn('relative h-full min-h-[400px] overflow-hidden', className)}>
      {/* Leaflet CSS will be loaded dynamically */}
      <div 
        ref={mapRef}
        className={cn(
          'relative w-full h-full min-h-[400px]',
          isFullscreen && 'fixed inset-0 z-50'
        )}
      >
        <MapContainer
            center={[9.0820, 8.6753]} // Default to Nigeria
            zoom={initialZoom}
            className="w-full h-full"
            ref={(mapInstance) => {
              if (mapInstance) {
                handleMapCreated(mapInstance);
              }
            }}
          >
            {/* Standard tile layer - offline caching temporarily disabled for SSR */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Event handlers */}
            <MapEventHandler 
              onViewportChange={handleViewportChangeInternal}
              onMapClick={onMapClick}
            />
            
            {/* View state management */}
            <ViewStateManager 
              initialBounds={initialBounds}
              initialZoom={initialZoom}
              onViewportChange={handleViewportChangeInternal}
            />
            
            {/* Entity markers with clustering */}
            {(entities && entities.length > 0) && (
              <EntityCluster
                entities={entities}
                selectedEntityId={selectedEntityId}
                showDonorOverlay={donorOverlayEnabled}
                onEntityClick={(entity) => handleEntitySelect(entity.id)}
                onPopupOpen={(entity) => console.log('Popup opened for entity:', entity.name)}
              />
            )}
          </MapContainer>
      </div>
      
      {/* Map controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
      />
      
      {/* Donor Overlay Control */}
      <DonorOverlayControl
        enabled={donorOverlayEnabled}
        onEnabledChange={handleDonorOverlayToggle}
        donorAssignments={entities?.flatMap(entity => 
          entity.donorAssignments?.map(donor => ({
            ...donor,
            entityCount: 1
          })) || []
        ).reduce((acc: any[], donor) => {
          const existing = acc.find((d: any) => d.donorId === donor.donorId);
          if (existing) {
            existing.entityCount += 1;
          } else {
            acc.push({ ...donor });
          }
          return acc;
        }, [] as any[])}
      />
      
      {/* Map legend will be added in Task 3 */}
    </Card>
  );
}

export function InteractiveMap(props: InteractiveMapProps) {
  return <InteractiveMapCore {...props} />;
}

// Default export for dynamic imports
export default InteractiveMap;