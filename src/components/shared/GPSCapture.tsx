'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, AlertTriangle } from '@/lib/icons'

interface GPSCaptureProps {
  onLocationCapture: (lat: number, lng: number) => void
  initialLocation?: { lat: number; lng: number }
  disabled?: boolean
  required?: boolean
}

export function GPSCapture({ 
  onLocationCapture, 
  initialLocation, 
  disabled = false,
  required = false 
}: GPSCaptureProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  )
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualLat, setManualLat] = useState<string>(initialLocation?.lat.toString() || '')
  const [manualLng, setManualLng] = useState<string>(initialLocation?.lng.toString() || '')

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation)
      setManualLat(initialLocation.lat.toString())
      setManualLng(initialLocation.lng.toString())
    }
  }, [initialLocation])

  const captureGPS = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setIsCapturing(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        )
      })

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      setLocation(newLocation)
      setManualLat(newLocation.lat.toString())
      setManualLng(newLocation.lng.toString())
      onLocationCapture(newLocation.lat, newLocation.lng)
      setError(null)
    } catch (error: any) {
      let errorMessage = 'Failed to get location'
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied. Please enable location services.'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.'
          break
        case error.TIMEOUT:
          errorMessage = 'Location request timed out.'
          break
      }
      
      setError(errorMessage)
    } finally {
      setIsCapturing(false)
    }
  }

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)

    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid latitude and longitude values')
      return
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90')
      return
    }

    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180')
      return
    }

    const newLocation = { lat, lng }
    setLocation(newLocation)
    onLocationCapture(lat, lng)
    setError(null)
  }

  const handleClear = () => {
    setLocation(null)
    setManualLat('')
    setManualLng('')
    setError(null)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          GPS Location Capture
          {required && <Badge variant="destructive">Required</Badge>}
        </CardTitle>
        <CardDescription>
          Capture GPS coordinates automatically or enter them manually
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {location && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              <strong>Current Location:</strong><br />
              Latitude: {location.lat.toFixed(6)}<br />
              Longitude: {location.lng.toFixed(6)}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={captureGPS}
            disabled={disabled || isCapturing}
            variant="default"
            className="flex-1"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isCapturing ? 'Capturing...' : 'Capture GPS'}
          </Button>
          
          <Button
            type="button"
            onClick={() => setManualMode(!manualMode)}
            variant="outline"
            disabled={disabled}
          >
            Manual Entry
          </Button>
        </div>

        {manualMode && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-lat">Latitude</Label>
                <Input
                  id="manual-lat"
                  type="number"
                  step="any"
                  placeholder="e.g., 9.072264"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  disabled={disabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-lng">Longitude</Label>
                <Input
                  id="manual-lng"
                  type="number"
                  step="any"
                  placeholder="e.g., 7.491302"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleManualSubmit}
                disabled={disabled || !manualLat || !manualLng}
                className="flex-1"
              >
                Set Location
              </Button>
              
              {location && (
                <Button
                  type="button"
                  onClick={handleClear}
                  variant="outline"
                  disabled={disabled}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}