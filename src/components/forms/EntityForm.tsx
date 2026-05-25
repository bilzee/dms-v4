'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormCard } from '@/components/shared/FormCard';
import { FormActionBar } from '@/components/shared/FormActionBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, CheckCircle, AlertCircle, MapIcon, Crosshair } from '@/lib/icons';
import { useAuth } from '@/hooks/useAuth';
import dynamic from 'next/dynamic';

// Dynamic import for map component to avoid SSR issues
const LocationSelector = dynamic(
  () => import('./LocationSelector').then(mod => ({ default: mod.LocationSelector })),
  { 
    ssr: false,
    loading: () => <div className="h-48 w-full flex items-center justify-center bg-muted rounded-lg">Loading map...</div>
  }
);

// Entity types from the database schema
const entityTypes = [
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'WARD', label: 'Ward' },
  { value: 'LGA', label: 'Local Government Area' },
  { value: 'STATE', label: 'State' },
  { value: 'FACILITY', label: 'Facility' },
  { value: 'CAMP', label: 'Camp' }
] as const;

// Validation schema
const entitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP']),
  location: z.string().optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).refine(
    (coords) => coords.latitude !== undefined && coords.longitude !== undefined,
    { message: 'Both latitude and longitude are required' }
  ),
  autoApproveEnabled: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
});

type EntityFormData = z.infer<typeof entitySchema>;

interface EntityFormProps {
  onSubmit: (data: EntityFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<EntityFormData>;
  isEditing?: boolean;
}

export function EntityForm({ onSubmit, onCancel, initialData, isEditing = false }: EntityFormProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showMapSelector, setShowMapSelector] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'COMMUNITY',
      location: initialData?.location || '',
      coordinates: initialData?.coordinates || { latitude: 11.8311, longitude: 13.1511 }, // Default to Maiduguri, Nigeria
      autoApproveEnabled: initialData?.autoApproveEnabled || false,
      metadata: initialData?.metadata || {}
    }
  });

  const watchedType = watch('type');
  const watchedCoordinates = watch('coordinates');

  // Handle location selection from map
  const handleLocationSelect = (latitude: number, longitude: number) => {
    setValue('coordinates.latitude', latitude);
    setValue('coordinates.longitude', longitude);
    setShowMapSelector(false);
  };

  const handleFormSubmit = async (data: EntityFormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      await onSubmit(data);
      
      setSubmitStatus({ 
        type: 'success', 
        message: `Entity ${isEditing ? 'updated' : 'created'} successfully!` 
      });
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'An error occurred while saving the entity' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FormCard
        title={isEditing ? 'Edit Entity' : 'Create New Entity'}
        description={isEditing ? 'Update the entity information below' : 'Fill in the details to create a new entity in the system'}
        variant="default"
        className="w-full max-w-2xl mx-auto"
      >
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Entity Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter entity name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Type Field */}
            <div className="space-y-2">
              <Label htmlFor="type">Entity Type *</Label>
              <Select 
                value={watchedType} 
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {entityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* Location Field */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="Enter location description"
              />
              <p className="text-xs text-muted-foreground">
                Optional descriptive location (e.g., &quot;Northern District&quot;, &quot;Downtown Area&quot;)
              </p>
            </div>

            {/* Coordinates */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Geographical Coordinates *
              </Label>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Manual Input */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Manual Entry</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        placeholder="e.g., 11.8311"
                        value={watchedCoordinates?.latitude || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : 0;
                          setValue('coordinates.latitude', value);
                        }}
                        className={errors.coordinates?.latitude ? 'border-red-500' : ''}
                      />
                      {errors.coordinates?.latitude && (
                        <p className="text-xs text-red-600">{errors.coordinates?.latitude.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        placeholder="e.g., 13.1511"
                        value={watchedCoordinates?.longitude || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : 0;
                          setValue('coordinates.longitude', value);
                        }}
                        className={errors.coordinates?.longitude ? 'border-red-500' : ''}
                      />
                      {errors.coordinates?.longitude && (
                        <p className="text-xs text-red-600">{errors.coordinates?.longitude.message}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter decimal coordinates (-90 to 90, -180 to 180)
                  </p>
                </div>

                {/* Map Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Map Selection</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowMapSelector(true)}
                    className="w-full h-48 border-2 border-dashed border-border hover:border-blue-300 flex flex-col items-center justify-center text-muted-foreground hover:text-blue-600 transition-colors"
                  >
                    <MapIcon className="h-8 w-8 mb-2" />
                    <span className="text-sm">Click to Select on Map</span>
                    <span className="text-xs">or drag to location</span>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Click on the map to select coordinates
                  </p>
                </div>
              </div>

              {/* Current coordinates display */}
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Crosshair className="h-4 w-4 text-primary" />
                  <span className="font-medium">Current Coordinates:</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Latitude: {watchedCoordinates?.latitude?.toFixed(6) || 'N/A'}, 
                  Longitude: {watchedCoordinates?.longitude?.toFixed(6) || 'N/A'}
                </div>
              </div>
            </div>

            {/* Auto-approval setting */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoApproveEnabled"
                checked={watch('autoApproveEnabled')}
                onCheckedChange={(checked) => setValue('autoApproveEnabled', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="autoApproveEnabled" className="text-sm font-medium">
                  Enable Auto-Approval
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically approve certain actions for this entity based on configured rules
                </p>
              </div>
            </div>

            {/* Submit Status */}
            {submitStatus && (
              <Alert variant={submitStatus.type === 'error' ? 'destructive' : 'default'}>
                {submitStatus.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{submitStatus.message}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <FormActionBar
              onCancel={onCancel}
              submitLabel={isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Entity' : 'Create Entity')}
              loading={isSubmitting}
              variant="bordered"
            />
          </form>
      </FormCard>

      {/* Map Selector Dialog */}
      <Dialog open={showMapSelector} onOpenChange={setShowMapSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Location on Map</DialogTitle>
            <DialogDescription>
              Click anywhere on the map to select coordinates for this entity, or close to cancel.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LocationSelector
              onLocationSelect={handleLocationSelect}
              initialCoordinates={{
                latitude: watchedCoordinates?.latitude || 11.8311,
                longitude: watchedCoordinates?.longitude || 13.1511
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}