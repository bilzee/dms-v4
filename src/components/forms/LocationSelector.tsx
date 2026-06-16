'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { MapPin, Crosshair, Maximize2 } from '@/lib/icons';
import { useMapConfig } from '@/hooks/useMapConfig';

// Fix Leaflet default markers for SSR
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationSelectorProps {
  onLocationSelect: (latitude: number, longitude: number) => void;
  initialCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface LocationMarkerProps {
  position: [number, number];
  onLocationSelect: (latitude: number, longitude: number) => void;
  onPositionChange: (position: [number, number]) => void;
}

function LocationMarker({ position, onLocationSelect, onPositionChange }: LocationMarkerProps) {
  const map = useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const newPosition: [number, number] = [lat, lng];
      onPositionChange(newPosition);
      onLocationSelect(lat, lng);
    },
  });

  return (
    <Marker
      position={position}
      eventHandlers={{
        click: () => {
          onLocationSelect(position[0], position[1]);
        },
      }}
    />
  );
}

export function LocationSelector({ onLocationSelect, initialCoordinates }: LocationSelectorProps) {
  const { center: configCenter } = useMapConfig();
  const coords = initialCoordinates ?? { latitude: configCenter[0], longitude: configCenter[1] };
  const [position, setPosition] = useState<[number, number]>([coords.latitude, coords.longitude]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<L.Map>(null);

  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPosition([latitude, longitude]);
          onLocationSelect(latitude, longitude);
          
          // Center map on current location
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 13);
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentLocation}
            className="flex items-center gap-2"
          >
            <Crosshair className="h-4 w-4" />
            My Location
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      <div className={isFullscreen ? "fixed inset-0 z-50" : "h-96 w-full rounded-lg overflow-hidden"}>
        <MapContainer
          ref={mapRef}
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <LocationMarker
            position={position}
            onLocationSelect={onLocationSelect}
            onPositionChange={setPosition}
          />
        </MapContainer>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Click on the map to select coordinates or use &quot;My Location&quot; button
      </div>
    </div>
  );
}