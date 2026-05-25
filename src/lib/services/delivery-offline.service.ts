import { v4 as uuidv4 } from 'uuid'
import { ConfirmDeliveryInput } from '@/lib/validation/response'
import { deliveryMediaService } from './delivery-media.service'
import { offlineDB } from '@/lib/db/offline'
import { GPSLocation } from '@/hooks/useGPS'
import { apiPost } from '@/lib/api'

export interface DeliveryOfflineOperation {
  uuid: string
  type: 'delivery_confirmation' | 'media_upload' | 'location_capture'
  action: 'create' | 'update' | 'delete'
  responseId: string
  data: any
  metadata: {
    timestamp: Date
    gpsLocation?: GPSLocation
    mediaFiles?: Array<{
      id: string
      file: File
      localPath: string
      originalName: string
      mimeType: string
      fileSize: number
      metadata: any
    }>
    responderId: string
    deviceId?: string
    networkStatus: 'online' | 'offline'
    userContext?: any
  }
  priority: number // 1-10, lower number = higher priority
  attempts: number
  lastAttempt: Date
  nextRetry?: Date
  error?: string
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed' | 'cancelled'
  completedAt?: Date
}

export interface DeliveryOfflineQueue {
  pending: DeliveryOfflineOperation[]
  inProgress: DeliveryOfflineOperation[]
  completed: DeliveryOfflineOperation[]
  failed: DeliveryOfflineOperation[]
  cancelled: DeliveryOfflineOperation[]
}

export interface DeliveryOfflineStats {
  totalOperations: number
  pendingCount: number
  inProgressCount: number
  completedCount: number
  failedCount: number
  oldestPending?: Date
  averageRetryTime?: number
  lastSync?: Date
}

export class DeliveryOfflineService {
  private static readonly MAX_RETRY_ATTEMPTS = 5
  private static readonly BASE_RETRY_DELAY = 30 * 1000 // 30 seconds
  private static readonly MAX_RETRY_DELAY = 30 * 60 * 1000 // 30 minutes
  private static readonly HIGH_PRIORITY_THRESHOLD = 3
  private static readonly MEDIUM_PRIORITY_THRESHOLD = 6

  // Store delivery confirmation offline
  static async storeDeliveryConfirmation(
    deliveryData: ConfirmDeliveryInput,
    responseId: string,
    gpsLocation: GPSLocation,
    mediaFiles: Array<{
      id: string
      file: File
      localPath: string
      metadata: any
    }>,
    responderId: string
  ): Promise<{
    success: boolean
    operationId: string
    timestamp: Date
    networkStatus: 'online' | 'offline'
  }> {
    try {
      // Try online first
      const response = await this.submitDeliveryConfirmationOnline(deliveryData, responseId)
      
      // Store successful confirmation in offline cache
      await this.storeDeliveryConfirmationOffline({
        responseId,
        data: { ...deliveryData, ...response },
        syncStatus: 'synced',
        completedAt: new Date()
      })
      
      return {
        success: true,
        operationId: uuidv4(),
        timestamp: new Date(),
        networkStatus: 'online'
      }
    } catch (error) {
      console.warn('Online delivery confirmation failed, storing offline:', error)
      
      // Store for offline sync
      const operationId = uuidv4()
      const operation: DeliveryOfflineOperation = {
        uuid: operationId,
        type: 'delivery_confirmation',
        action: 'create',
        responseId,
        data: deliveryData,
        metadata: {
          timestamp: new Date(),
          gpsLocation,
          mediaFiles: mediaFiles.map(file => ({
            id: file.id,
            file: file.file,
            localPath: file.localPath,
            originalName: file.file.name,
            mimeType: file.file.type,
            fileSize: file.file.size,
            metadata: file.metadata
          })),
          responderId,
          networkStatus: 'offline',
          deviceId: await this.getDeviceId()
        },
        priority: this.calculatePriority('delivery_confirmation', 'create', mediaFiles.length),
        attempts: 0,
        lastAttempt: new Date(),
        syncStatus: 'pending'
      }
      
      await offlineDB.syncQueue.add({
        uuid: operation.uuid,
        type: 'response' as const,
        action: operation.action,
        entityUuid: operation.responseId,
        data: JSON.stringify(operation.data),
        priority: operation.priority,
        attempts: operation.attempts,
        lastAttempt: operation.lastAttempt,
        timestamp: new Date()
      })
      
      // Store in offline responses cache
      await this.storeDeliveryConfirmationOffline({
        responseId,
        data: {
          ...deliveryData,
          id: responseId,
          deliveryStatus: 'DELIVERED',
          verificationStatus: 'SUBMITTED',
          responseDate: new Date().toISOString(),
          // Store delivery metadata
          timeline: {
            delivery: {
              confirmedAt: new Date().toISOString(),
              deliveredBy: responderId,
              deliveryLocation: gpsLocation,
              deliveredItems: deliveryData.deliveredItems,
              mediaAttachmentIds: mediaFiles.map(f => f.id),
              capturedAt: new Date().toISOString()
            }
          }
        },
        syncStatus: 'pending'
      })
      
      return {
        success: false,
        operationId,
        timestamp: new Date(),
        networkStatus: 'offline'
      }
    }
  }

  // Store media files offline for later sync
  static async storeMediaFilesOffline(
    mediaFiles: Array<{
      file: File
      metadata: any
    }>,
    responseId: string,
    responderId: string
  ): Promise<Array<{
      id: string
      localPath: string
      success: boolean
    }>> {
    const storedFiles = []
    
    for (const mediaFile of mediaFiles) {
      try {
        // Generate unique local path
        const localPath = `offline/delivery_media/${Date.now()}_${mediaFile.file.name}`
        
        // Store in IndexedDB
        await this.storeFileInIndexedDB(mediaFile.file, localPath, mediaFile.metadata)
        
        storedFiles.push({
          id: uuidv4(),
          localPath,
          success: true
        })
      } catch (error) {
        console.error('Failed to store media file offline:', error)
        storedFiles.push({
          id: uuidv4(),
          localPath: '',
          success: false
        })
      }
    }
    
    return storedFiles
  }

  // Submit delivery confirmation when online
  private static async submitDeliveryConfirmationOnline(
    deliveryData: ConfirmDeliveryInput,
    responseId: string
  ): Promise<any> {
    const result = await apiPost(`/api/v1/responses/${responseId}/deliver`, deliveryData)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to submit delivery confirmation')
    }
    
    return result.data
  }

  // Store delivery confirmation data in offline cache
  private static async storeDeliveryConfirmationOffline(deliveryData: {
    responseId: string
    data: any
    syncStatus: string
    completedAt?: Date
  }): Promise<void> {
    // Store in responses table for now
    await offlineDB.responses.add({
      uuid: deliveryData.responseId,
      responderId: 'unknown',
      assessmentId: 'unknown',
      data: JSON.stringify(deliveryData),
      timestamp: new Date(),
      syncStatus: 'pending',
      lastModified: new Date()
    })
  }

  // Get delivery confirmation from offline cache
  static async getDeliveryConfirmationOffline(responseId: string): Promise<any> {
    try {
      const offlineDelivery = await offlineDB.responses.where('uuid').equals(responseId).first()
      return offlineDelivery
    } catch (error) {
      console.warn('No offline delivery confirmation found:', error)
      return null
    }
  }

  // Store file in IndexedDB
  private static async storeFileInIndexedDB(
    file: File,
    localPath: string,
    metadata: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer
        if (!arrayBuffer) {
          reject(new Error('Failed to read file'))
          return
        }

        // Store file metadata in sync queue for later upload
        offlineDB.addToSyncQueue({
          uuid: `media-${Date.now()}-${Math.random()}`,
          type: 'response' as const,
          action: 'create',
          entityUuid: localPath,
          data: {
            type: 'media',
            originalName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            metadata,
            // Store file data as base64 for sync
            fileData: Array.from(new Uint8Array(arrayBuffer)).join(',')
          },
          priority: 1,
          attempts: 0,
          timestamp: new Date()
        }).then(() => resolve()).catch(reject)
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  // Get offline queue status
  static async getOfflineQueueStatus(): Promise<DeliveryOfflineQueue> {
    try {
      // Use existing sync queue to get delivery operations
      const syncItems = await offlineDB.getSyncQueue()
      const deliveryOperations = syncItems.filter(item => 
        item.decryptedData?.type === 'delivery' || item.decryptedData?.type === 'media'
      )
      
      // Transform sync queue items to delivery operations
      const transformedOps = deliveryOperations.map((item: any) => ({
        uuid: item.uuid,
        type: item.decryptedData?.type === 'media' ? 'media_upload' : 'delivery_confirmation',
        action: item.action,
        responseId: item.entityUuid,
        data: item.decryptedData || {},
        priority: item.priority,
        attempts: item.attempts,
        lastAttempt: item.lastAttempt,
        syncStatus: item.attempts === 0 ? 'pending' : (item.attempts < 3 ? 'syncing' : 'failed'),
        metadata: {
          timestamp: item.timestamp,
          ...item.decryptedData
        },
        timestamp: item.timestamp
      } as DeliveryOfflineOperation))

      const queue: DeliveryOfflineQueue = {
        pending: transformedOps.filter(op => op.syncStatus === 'pending'),
        inProgress: transformedOps.filter(op => op.syncStatus === 'syncing'),
        completed: [], // These would be removed from queue when completed
        failed: transformedOps.filter(op => op.syncStatus === 'failed'),
        cancelled: [] // Not supported in current sync queue
      }
      
      // Sort by priority and timestamp
      queue.pending.sort((a, b) => {
        // First sort by priority (lower number = higher priority)
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // Then sort by last attempt (earlier first for equal priority)
        return a.lastAttempt.getTime() - b.lastAttempt.getTime()
      })
      
      return queue
    } catch (error) {
      console.error('Failed to get offline queue status:', error)
      return {
        pending: [],
        inProgress: [],
        completed: [],
        failed: [],
        cancelled: []
      }
    }
  }

  // Get offline queue statistics
  static async getOfflineStats(): Promise<DeliveryOfflineStats> {
    try {
      const queue = await this.getOfflineQueueStatus()
      const allOperations = [...queue.pending, ...queue.inProgress, ...queue.completed, ...queue.failed, ...queue.cancelled]
      
      const stats: DeliveryOfflineStats = {
        totalOperations: allOperations.length,
        pendingCount: queue.pending.length,
        inProgressCount: queue.inProgress.length,
        completedCount: queue.completed.length,
        failedCount: queue.failed.length,
        oldestPending: queue.pending.length > 0 ? queue.pending[0].lastAttempt : undefined,
        averageRetryTime: undefined,
        lastSync: allOperations.length > 0 ? 
          new Date(Math.max(...allOperations.map(op => op.lastAttempt.getTime()))) : undefined
      }
      
      // Calculate average retry time for failed operations
      const failedWithRetries = queue.failed.filter(op => op.attempts > 1)
      if (failedWithRetries.length > 0) {
        const totalRetryTime = failedWithRetries.reduce((sum, op) => {
          return sum + (op.lastAttempt.getTime() - new Date(op.lastAttempt.getTime() - Math.pow(2, op.attempts) * this.BASE_RETRY_DELAY * 1000).getTime())
        }, 0)
        stats.averageRetryTime = totalRetryTime / failedWithRetries.length
      }
      
      return stats
    } catch (error) {
      console.error('Failed to get offline stats:', error)
      return {
        totalOperations: 0,
        pendingCount: 0,
        inProgressCount: 0,
        completedCount: 0,
        failedCount: 0
      }
    }
  }

  // Sync pending offline operations
  static async syncPendingOperations(): Promise<{
    synced: number
    failed: number
    skipped: number
    errors: Array<{
      operationId: string
      error: string
      operationType: string
    }>
  }> {
    const queue = await this.getOfflineQueueStatus()
    const results = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ operationId: string; error: string; operationType: string }>
    }

    // Process pending operations (high priority first)
    for (const operation of queue.pending) {
      if (operation.attempts >= this.MAX_RETRY_ATTEMPTS) {
        console.warn(`Skipping operation ${operation.uuid} - max attempts reached`)
        results.skipped++
        continue
      }

      try {
        await this.processOperation(operation)
        results.synced++
        
        // Update sync status
        await this.updateOperationStatus(operation.uuid, 'synced')
      } catch (error) {
        console.error(`Failed to sync operation ${operation.uuid}:`, error)
        results.failed++
        results.errors.push({
          operationId: operation.uuid,
          error: error instanceof Error ? error.message : 'Unknown error',
          operationType: operation.type
        })
        
        // Update retry count and next retry time
        await this.updateOperationRetry(operation)
      }
    }

    return results
  }

  // Process individual offline operation
  private static async processOperation(operation: DeliveryOfflineOperation): Promise<void> {
    switch (operation.type) {
      case 'delivery_confirmation':
        await this.processDeliveryConfirmationOperation(operation)
        break
      case 'media_upload':
        await this.processMediaUploadOperation(operation)
        break
      case 'location_capture':
        await this.processLocationCaptureOperation(operation)
        break
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }
  }

  // Process delivery confirmation operation
  private static async processDeliveryConfirmationOperation(operation: DeliveryOfflineOperation): Promise<void> {
    // Update status to syncing
    await this.updateOperationStatus(operation.uuid, 'syncing')
    
    // Submit delivery confirmation
    const result = await this.submitDeliveryConfirmationOnline(
      operation.data,
      operation.responseId
    )
    
    // Update offline cache with successful response
    await this.storeDeliveryConfirmationOffline({
      responseId: operation.responseId,
      data: { ...operation.data, ...result.data },
      syncStatus: 'synced',
      completedAt: new Date()
    })
  }

  // Process media upload operation
  private static async processMediaUploadOperation(operation: DeliveryOfflineOperation): Promise<void> {
    if (!operation.metadata?.mediaFiles || operation.metadata.mediaFiles.length === 0) {
      throw new Error('No media files found in operation metadata')
    }
    
    // Upload each media file
    for (const mediaFile of operation.metadata.mediaFiles) {
      await deliveryMediaService.uploadDeliveryMedia(
        mediaFile.file,
        {
          capturedFor: 'delivery_proof',
          deliveryId: operation.responseId,
          gps: operation.metadata.gpsLocation || {
            latitude: 0,
            longitude: 0,
            accuracy: 999999,
            timestamp: operation.metadata.timestamp
          },
          deliveryTimestamp: operation.metadata.timestamp,
          verificationStatus: 'pending'
        },
        operation.responseId
      )
    }
  }

  // Process location capture operation
  private static async processLocationCaptureOperation(operation: DeliveryOfflineOperation): Promise<void> {
    // Location capture operations are typically metadata only
    // This might store additional GPS data or update location-based metadata
    console.log(`Processing location capture for delivery ${operation.responseId}`)
  }

  // Update operation status
  private static async updateOperationStatus(operationId: string, status: DeliveryOfflineOperation['syncStatus']): Promise<void> {
    const updates: Partial<any> = {}
    if (status === 'synced') {
      // Remove from sync queue when completed
      await offlineDB.removeSyncQueueItem(operationId)
    } else if (status === 'syncing') {
      updates.lastAttempt = new Date()
      await offlineDB.updateSyncQueueItem(operationId, updates)
    }
  }

  // Update operation retry information
  private static async updateOperationRetry(operation: DeliveryOfflineOperation): Promise<void> {
    const retryDelay = Math.min(
      Math.pow(2, operation.attempts) * this.BASE_RETRY_DELAY,
      this.MAX_RETRY_DELAY
    )
    
    await offlineDB.updateSyncQueueItem(operation.uuid, {
      attempts: operation.attempts + 1,
      lastAttempt: new Date(),
      nextRetry: new Date(Date.now() + retryDelay),
      error: operation.error || 'Unknown error'
    })
  }

  // Calculate operation priority
  private static calculatePriority(
    type: DeliveryOfflineOperation['type'],
    action: DeliveryOfflineOperation['action'],
    mediaCount: number = 0
  ): number {
    let priority = 5 // Default priority
    
    // Delivery confirmations are highest priority
    if (type === 'delivery_confirmation') {
      priority = 1
    }
    
    // Media uploads are medium priority
    if (type === 'media_upload') {
      priority = 3 + Math.min(mediaCount / 2, 2)
    }
    
    // Create operations are higher priority than updates
    if (action === 'create') {
      priority -= 1
    }
    
    return Math.max(1, Math.min(10, priority))
  }

  // Get device identifier for offline tracking
  private static async getDeviceId(): Promise<string> {
    try {
      // Check if device ID is already stored
      let deviceId = localStorage.getItem('delivery-device-id')
      if (deviceId) return deviceId
      
      // Generate new device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('delivery-device-id', deviceId)
      return deviceId
    } catch (error) {
      console.warn('Failed to get device ID:', error)
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  // Get operations for specific response
  static async getOperationsForResponse(responseId: string): Promise<DeliveryOfflineOperation[]> {
    try {
      const syncItems = await offlineDB.getSyncQueue()
      const deliveryOperations = syncItems.filter(item => 
        (item.decryptedData?.type === 'delivery' || item.decryptedData?.type === 'media') &&
        item.entityUuid === responseId
      )
      
      // Transform to delivery operations format
      return deliveryOperations.map((item: any) => ({
        uuid: item.uuid,
        type: item.decryptedData?.type === 'media' ? 'media_upload' : 'delivery_confirmation',
        action: item.action,
        responseId: item.entityUuid,
        data: item.decryptedData || {},
        priority: item.priority,
        attempts: item.attempts,
        lastAttempt: item.lastAttempt,
        syncStatus: item.attempts === 0 ? 'pending' : (item.attempts < 3 ? 'syncing' : 'failed'),
        metadata: {
          timestamp: item.timestamp,
          ...item.decryptedData
        },
        timestamp: item.timestamp
      } as DeliveryOfflineOperation))
    } catch (error) {
      console.error('Failed to get operations for response:', error)
      return []
    }
  }

  // Cancel offline operation
  static async cancelOperation(operationId: string): Promise<boolean> {
    try {
      // For cancelled operations, just remove them from the sync queue
      await offlineDB.removeSyncQueueItem(operationId)
      return true
    } catch (error) {
      console.error('Failed to cancel operation:', error)
      return false
    }
  }

  // Clear completed operations
  static async clearCompletedOperations(olderThan?: Date): Promise<number> {
    try {
      const cutoffDate = olderThan || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default: 7 days
      // In the sync queue system, completed operations are automatically removed
      // This method is mainly for cleanup of older records that might still exist
      // For now, return 0 as completed items are already removed from queue
      return 0
    } catch (error) {
      console.error('Failed to clear completed operations:', error)
      return 0
    }
  }

  // Get pending operations for sync
  static async getPendingOperations(): Promise<DeliveryOfflineOperation[]> {
    try {
      const syncItems = await offlineDB.getSyncQueue()
      const deliveryOperations = syncItems.filter(item => 
        (item.decryptedData?.type === 'delivery' || item.decryptedData?.type === 'media') &&
        item.attempts === 0
      )
      
      // Transform to delivery operations format
      return deliveryOperations.map((item: any) => ({
        uuid: item.uuid,
        type: item.decryptedData?.type === 'media' ? 'media_upload' : 'delivery_confirmation',
        action: item.action,
        responseId: item.entityUuid,
        data: item.decryptedData || {},
        priority: item.priority,
        attempts: item.attempts,
        lastAttempt: item.lastAttempt,
        syncStatus: 'pending',
        metadata: {
          timestamp: item.timestamp,
          ...item.decryptedData
        },
        timestamp: item.timestamp
      } as DeliveryOfflineOperation))
    } catch (error) {
      console.error('Failed to get pending operations:', error)
      return []
    }
  }
}

// Export singleton instance
export const deliveryOfflineService = new DeliveryOfflineService()
export default deliveryOfflineService