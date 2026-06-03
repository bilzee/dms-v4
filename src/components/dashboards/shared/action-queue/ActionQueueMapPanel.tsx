'use client';

import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  CircleMarker,
} from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useMapConfig } from '@/hooks/useMapConfig';
import { Badge } from '@/components/ui/badge';
import '@/components/dashboards/situation/map-styles.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

interface MapEntity {
  id: string;
  name: string;
  type: string;
  location: string | null;
  coordinates: unknown;
}

interface EntityPriorityInfo {
  entityId: string;
  highestPriority: string;
  signalCount: number;
}

function getCoords(entity: MapEntity): { lat: number; lng: number } | null {
  const c = entity.coordinates as any;
  if (!c) return null;
  const lat = parseFloat(c.latitude ?? c.lat ?? 0);
  const lng = parseFloat(c.longitude ?? c.lng ?? 0);
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function FlyToEntity({ entityId, entities }: { entityId: string | null; entities: MapEntity[] }) {
  const map = useMap();

  useEffect(() => {
    if (!entityId) return;
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;
    const coords = getCoords(entity);
    if (!coords) return;
    map.flyTo([coords.lat, coords.lng], 13, { duration: 0.8 });
  }, [entityId, entities, map]);

  return null;
}

interface ActionQueueMapPanelProps {
  activeEntityIds: string[];
  entityPriorities?: Record<string, EntityPriorityInfo>;
  selectedEntityId?: string | null;
  onEntitySelect?: (entityId: string) => void;
}

function EntityMarker({
  entity,
  priority,
  isSelected,
  onSelect,
}: {
  entity: MapEntity;
  priority: EntityPriorityInfo | undefined;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const coords = getCoords(entity);
  if (!coords) return null;

  const highestPriority = priority?.highestPriority || 'MEDIUM';
  const color = PRIORITY_COLORS[highestPriority] || '#6b7280';

  if (isSelected) {
    return (
      <Marker position={[coords.lat, coords.lng]} eventHandlers={{ click: onSelect }}>
        <Popup>
          <div className="text-sm">
            <strong>{entity.name}</strong>
            <br />
            <span style={{ color }}>{highestPriority}</span> · {entity.type}
            {priority && (
              <>
                <br />
                {priority.signalCount} signal{priority.signalCount !== 1 ? 's' : ''}
              </>
            )}
          </div>
        </Popup>
      </Marker>
    );
  }

  return (
    <CircleMarker
      center={[coords.lat, coords.lng]}
      radius={10}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
      eventHandlers={{ click: onSelect }}
    >
      <Popup>
        <div className="text-sm">
          <strong>{entity.name}</strong>
          <br />
          <span style={{ color }}>{highestPriority}</span> · {entity.type}
          {priority && (
            <>
              <br />
              {priority.signalCount} signal{priority.signalCount !== 1 ? 's' : ''}
            </>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export function ActionQueueMapPanel({
  activeEntityIds,
  entityPriorities,
  selectedEntityId,
  onEntitySelect,
}: ActionQueueMapPanelProps) {
  const { center: configCenter, zoom: configZoom } = useMapConfig();

  const { data: entitiesData } = useQuery({
    queryKey: ['map-entities'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/entities?limit=100');
      if (!result.success) return [];
      const data = (result as any).data;
      if (Array.isArray(data)) return data as MapEntity[];
      if (data?.items) return data.items as MapEntity[];
      return [];
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const activeEntities = useMemo(() => {
    const allEntities = entitiesData ?? [];
    const activeSet = new Set(activeEntityIds);
    return allEntities.filter(e => activeSet.has(e.id));
  }, [entitiesData, activeEntityIds]);

  const entitiesWithCoords = useMemo(() => {
    return activeEntities.filter(e => getCoords(e) !== null);
  }, [activeEntities]);

  if (entitiesWithCoords.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        <div className="text-center">
          <p>No entity coordinates available</p>
          <p className="text-xs mt-1">
            {activeEntityIds.length > 0
              ? `${activeEntityIds.length} active entities without coordinates`
              : 'No active entities'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <MapContainer
        center={configCenter}
        zoom={configZoom}
        className="h-full w-full rounded-lg"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyToEntity entityId={selectedEntityId ?? null} entities={entitiesWithCoords} />
        {entitiesWithCoords.map(entity => (
          <EntityMarker
            key={entity.id}
            entity={entity}
            priority={entityPriorities?.[entity.id]}
            isSelected={entity.id === selectedEntityId}
            onSelect={() => onEntitySelect?.(entity.id)}
          />
        ))}
        {selectedEntityId && (() => {
          const selected = entitiesWithCoords.find(e => e.id === selectedEntityId);
          if (!selected) return null;
          const coords = getCoords(selected);
          if (!coords) return null;
          return (
            <CircleMarker
              center={[coords.lat, coords.lng]}
              radius={16}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '4 4',
              }}
            />
          );
        })()}
      </MapContainer>
    </div>
  );
}
