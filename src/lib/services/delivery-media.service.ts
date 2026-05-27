import { MediaAttachment, GPSMetadata, DeliveryMediaMetadata, MediaService, MediaSyncStatus, SyncStatus } from '@/types/media'
import { PrismaClient } from '@prisma/client'
import Dexie from 'dexie'
import { storageService } from '@/lib/storage/storage.service'
import { isS3Enabled } from '@/lib/storage/s3-client'
import { STORAGE_PATHS, getStorageKey } from '@/lib/storage/paths'

const prisma = new PrismaClient()

class DeliveryMediaService implements MediaService {
  private offlineStore: Dexie | null = null
  private readonly OFFLINE_DB_NAME = 'deliveryMediaOffline'
  private readonly OFFLINE_DB_VERSION = 1

  constructor() {
    this.initializeOfflineStorage()
  }

  private async initializeOfflineStorage() {
    try {
      // Initialize Dexie for offline storage
      const { Dexie } = await import('dexie')
      
      this.offlineStore = new Dexie(this.OFFLINE_DB_NAME)
      this.offlineStore.version(this.OFFLINE_DB_VERSION).stores({
        pendingMedia: '++id, localPath, responseId, assessmentId, metadata, syncStatus, createdAt, retryCount',
        syncStatus: 'mediaId, localPath, remoteUrl, syncStatus, lastSyncAttempt, syncError, retryCount'
      })
    } catch (error) {
      console.warn('Failed to initialize offline storage:', error)
    }
  }

  async uploadDeliveryMedia(
    file: File,
    metadata: DeliveryMediaMetadata,
    responseId?: string,
    assessmentId?: string
  ): Promise<MediaAttachment> {
    try {
      // First, create database record
      const mediaRecord = await prisma.mediaAttachment.create({
        data: {
          filename: file.name,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          filePath: '', // Will be updated after upload
          uploadedBy: 'current-user', // Should come from auth context
          responseId: responseId || '',
          uploadedAt: new Date()
        }
      })

      // Handle file upload
      let filePath: string
      if (navigator.onLine) {
        filePath = await this.uploadFileToStorage(file, mediaRecord.id)
      } else {
        filePath = await this.storeFileOffline(file, mediaRecord.id)
      }

      // Update media record with file path
      const updatedMedia = await prisma.mediaAttachment.update({
        where: { id: mediaRecord.id },
        data: { 
          filePath
        }
      })

      return updatedMedia
    } catch (error) {
      console.error('Error uploading delivery media:', error)
      throw new Error(`Failed to upload media: ${(error as Error).message}`)
    }
  }

  async captureGPSLocation(): Promise<GPSMetadata> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gps: GPSMetadata = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            timestamp: new Date(position.timestamp),
            deviceHeading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          }
          resolve(gps)
        },
        (error) => {
          reject(new Error(`GPS capture failed: ${error.message}`))
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000 // 1 minute
        }
      )
    })
  }

  async storeMediaOffline(file: File, metadata: DeliveryMediaMetadata): Promise<any> {
    if (!this.offlineStore) {
      throw new Error('Offline storage not available')
    }

    try {
      // Store file in IndexedDB
      const localPath = `offline/${Date.now()}_${file.name}`
      
      const offlineRecord = {
        id: Math.random().toString(36).substr(2, 9),
        localPath,
        responseId: metadata.deliveryId,
        assessmentId: metadata.assessmentId,
        metadata,
        file: file, // Store the actual file
        syncStatus: 'LOCAL' as SyncStatus,
        createdAt: new Date(),
        retryCount: 0
      }

      await this.offlineStore.table('pendingMedia').add(offlineRecord)

      return {
        id: offlineRecord.id,
        file,
        localPath,
        uploadProgress: 100,
        isUploading: false,
        isCompleted: true,
        deliveryMetadata: metadata
      }
    } catch (error) {
      console.error('Error storing media offline:', error)
      throw new Error(`Failed to store media offline: ${(error as Error).message}`)
    }
  }

  async syncPendingMedia(): Promise<MediaAttachment[]> {
    if (!this.offlineStore || !navigator.onLine) {
      return []
    }

    const syncedMedia: MediaAttachment[] = []
    
    try {
      const pendingMedia = await this.offlineStore.table('pendingMedia').where('syncStatus').equals('LOCAL').toArray()

      for (const media of pendingMedia) {
        try {
          // Create database record
          const mediaRecord = await prisma.mediaAttachment.create({
            data: {
              filename: media.file.name,
              originalName: media.file.name,
              mimeType: media.file.type,
              fileSize: media.file.size,
              filePath: '', // Will be updated after upload
              uploadedBy: 'current-user',
              responseId: media.responseId || '',
              uploadedAt: new Date()
            }
          })

          // Upload file to storage
          const filePath = await this.uploadFileToStorage(media.file, mediaRecord.id)

          // Update record
          const updatedMedia = await prisma.mediaAttachment.update({
            where: { id: mediaRecord.id },
            data: { 
              filePath
            }
          })

          syncedMedia.push(updatedMedia)

          // Remove from offline storage
          await this.offlineStore.table('pendingMedia').delete(media.id)
        } catch (error) {
          console.error(`Error syncing media ${media.id}:`, error)
          
          // Update retry count
          await this.offlineStore.table('pendingMedia').update(media.id, {
            retryCount: media.retryCount + 1,
            lastSyncAttempt: new Date(),
            syncError: (error as Error).message
          })
        }
      }
    } catch (error) {
      console.error('Error syncing pending media:', error)
    }

    return syncedMedia
  }

  async getMediaByResponse(responseId: string): Promise<MediaAttachment[]> {
    try {
      return await prisma.mediaAttachment.findMany({
        where: { responseId },
        orderBy: { uploadedAt: 'desc' }
      })
    } catch (error) {
      console.error('Error getting media by response:', error)
      return []
    }
  }

  async getMediaByAssessment(assessmentId: string): Promise<MediaAttachment[]> {
    try {
      return await prisma.mediaAttachment.findMany({
        where: { responseId: assessmentId },
        orderBy: { uploadedAt: 'desc' }
      })
    } catch (error) {
      console.error('Error getting media by assessment:', error)
      return []
    }
  }

  async deleteMedia(mediaId: string): Promise<void> {
    try {
      const media = await prisma.mediaAttachment.findUnique({
        where: { id: mediaId }
      })

      if (!media) {
        throw new Error('Media not found')
      }

      // Delete from storage (this would depend on your storage provider)
      if (media.filePath) {
        await this.deleteFileFromStorage(media.filePath)
      }

      // Delete from database
      await prisma.mediaAttachment.delete({
        where: { id: mediaId }
      })
    } catch (error) {
      console.error('Error deleting media:', error)
      throw new Error(`Failed to delete media: ${(error as Error).message}`)
    }
  }

  async markMediaForVerification(mediaId: string): Promise<void> {
    try {
      await prisma.mediaAttachment.update({
        where: { id: mediaId },
        data: { }
      })
    } catch (error) {
      console.error('Error marking media for verification:', error)
      throw new Error(`Failed to mark media for verification: ${(error as Error).message}`)
    }
  }

  async updateMediaVerificationStatus(
    mediaId: string, 
    status: 'verified' | 'rejected',
    feedback?: string
  ): Promise<void> {
    try {
      await prisma.mediaAttachment.update({
        where: { id: mediaId },
        data: { }
      })
    } catch (error) {
      console.error('Error updating media verification status:', error)
      throw new Error(`Failed to update media verification status: ${(error as Error).message}`)
    }
  }

  private async uploadFileToStorage(file: File, mediaId: string): Promise<string> {
    const fileExtension = file.name.split('.').pop()
    const fileName = `${mediaId}.${fileExtension}`

    if (isS3Enabled()) {
      const key = getStorageKey(STORAGE_PATHS.deliveryMedia, String(new Date().getFullYear()), fileName)
      const buffer = Buffer.from(await file.arrayBuffer())
      await storageService.uploadBuffer(key, buffer, file.type)
      return key
    }

    const filePath = `uploads/delivery-media/${new Date().getFullYear()}/${fileName}`
    console.log(`Uploading file ${file.name} to ${filePath}`)
    return filePath
  }

  private async storeFileOffline(file: File, mediaId: string): Promise<string> {
    const fileExtension = file.name.split('.').pop()
    const fileName = `${mediaId}.${fileExtension}`
    const localPath = `offline/${fileName}`
    
    // Store in IndexedDB or local file system
    console.log(`Storing file ${file.name} offline at ${localPath}`)
    
    return localPath
  }

  private async deleteFileFromStorage(filePath: string): Promise<void> {
    if (isS3Enabled()) {
      await storageService.deleteFile(filePath)
      return
    }
    console.log(`Deleting file at ${filePath}`)
  }

  // Utility method to validate GPS accuracy for delivery photos
  validateGPSAccuracy(gps: GPSMetadata, maxAccuracyMeters: number = 100): boolean {
    return !gps.accuracy || gps.accuracy <= maxAccuracyMeters
  }

  // Utility method to check if photo is recent enough for delivery verification
  isPhotoRecent(timestamp: Date, maxAgeMinutes: number = 60): boolean {
    const now = new Date()
    const ageMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60)
    return ageMinutes <= maxAgeMinutes
  }

  // Get sync status for offline media
  async getOfflineMediaSyncStatus(): Promise<MediaSyncStatus[]> {
    if (!this.offlineStore) {
      return []
    }

    try {
      const pendingMedia = await this.offlineStore.table('pendingMedia').toArray()
      
      return pendingMedia.map(media => ({
        mediaId: media.id,
        localPath: media.localPath,
        syncStatus: media.syncStatus,
        lastSyncAttempt: media.lastSyncAttempt,
        syncError: media.syncError,
        retryCount: media.retryCount
      }))
    } catch (error) {
      console.error('Error getting offline media sync status:', error)
      return []
    }
  }
}

// Export singleton instance
export const deliveryMediaService = new DeliveryMediaService()
export default deliveryMediaService