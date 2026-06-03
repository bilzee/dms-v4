'use client'

import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const prevCenterRef = useRef<string>('')
  const prevZoomRef = useRef<number>(-1)

  useEffect(() => {
    const centerKey = `${center[0]},${center[1]}`
    if (centerKey !== prevCenterRef.current || zoom !== prevZoomRef.current) {
      map.setView(center, zoom, { animate: true })
      prevCenterRef.current = centerKey
      prevZoomRef.current = zoom
    }
  }, [center, zoom, map])

  return null
}

interface MapPreviewProps {
  center: [number, number]
  zoom: number
}

export default function MapPreview({ center, zoom }: MapPreviewProps) {
  return (
    <div className="space-y-2">
      <div className="h-80 w-full rounded-lg overflow-hidden border border-border">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={center} />
          <MapUpdater center={center} zoom={zoom} />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Center: {center[0].toFixed(4)}, {center[1].toFixed(4)}</span>
        <span>Zoom: {zoom}</span>
      </div>
    </div>
  )
}
