import { CreatePlannedResponseInput, UpdatePlannedResponseInput } from '@/lib/validation/response'
import { ResponseService } from './response-client.service'
import { offlineDB } from '@/lib/db/offline'
import { syncEngine } from '@/lib/sync/engine'

export class ResponseOfflineService {
  private static readonly BASE_URL = '/api/v1/responses'

  // Create planned response with offline support
  async createPlannedResponse(data: CreatePlannedResponseInput): Promise<any> {
    try {
      // Try online first
      const response = await ResponseService.createPlannedResponse(data)
      
      // Store successful response in offline cache for reference
      await offlineDB.addResponse({
        uuid: response.id,
        responderId: 'system', // TODO: Get from auth context
        assessmentId: data.assessmentId,
        data: {
          ...data,
          ...response,
          syncStatus: 'synced'
        },
        timestamp: new Date(),
        lastModified: new Date(),
        syncStatus: 'synced'
      })
      
      return response
    } catch (error) {
      // If online fails, store for offline sync
      const responseId = crypto.randomUUID()
      const offlineResponse = {
        uuid: responseId,
        responderId: 'system', // TODO: Get from auth context
        assessmentId: data.assessmentId,
        data: {
          ...data,
          id: responseId,
          deliveryStatus: 'PLANNED',
          createdAt: new Date().toISOString(),
          syncStatus: 'pending' as const
        },
        timestamp: new Date(),
        lastModified: new Date(),
        syncStatus: 'pending' as const
      }
      
      await offlineDB.addResponse(offlineResponse)
      
      try {
        await syncEngine.addToQueue(
          'response',
          'create',
          data.entityId,
          offlineResponse.data,
          5
        )
      } catch (queueError) {
        console.error('Failed to add to sync queue:', queueError)
      }
      
      return offlineResponse.data
    }
  }

  // Update planned response with offline support
  async updatePlannedResponse(id: string, data: UpdatePlannedResponseInput): Promise<any> {
    try {
      // Try online first
      const response = await ResponseService.updatePlannedResponse(id, data)
      
      // Update offline cache
      await offlineDB.updateResponse(id, {
        data: {
          ...data,
          ...response,
          syncStatus: 'synced'
        },
        syncStatus: 'synced'
      })
      
      return response
    } catch (error) {
      // If online fails, store for offline sync
      const offlineUpdate = {
        data: {
          ...data,
          id,
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending' as const
        },
        syncStatus: 'pending' as const
      }
      
      await offlineDB.updateResponse(id, offlineUpdate)
      
      try {
        const existingResponse = await offlineDB.getResponse(id)
        const entityId = (data as any).entityId || (existingResponse?.data as any)?.entityId
        
        await syncEngine.addToQueue(
          'response',
          'update',
          entityId || id,
          offlineUpdate.data,
          5
        )
      } catch (queueError) {
        console.error('Failed to add to sync queue:', queueError)
      }
      
      return offlineUpdate.data
    }
  }

  // Get response by ID with offline fallback
  static async getResponseById(id: string): Promise<any> {
    try {
      // Try online first
      const response = await ResponseService.getResponseById(id)
      
      // Update offline cache
      await offlineDB.updateResponse(id, {
        data: { ...response, syncStatus: 'synced' },
        syncStatus: 'synced'
      })
      
      return response
    } catch (error) {
      // Fallback to offline cache
      const offlineResponse = await offlineDB.getResponse(id)
      if (offlineResponse) {
        return offlineResponse.decryptedData
      }
      throw error
    }
  }

  // Get planned responses for responder with offline fallback
  static async getPlannedResponsesForResponder(query: {
    assessmentId?: string
    entityId?: string
    type?: string
    page?: number
    limit?: number
  } = {}): Promise<any> {
    try {
      // Try online first
      const responses = await ResponseService.getPlannedResponsesForResponder(query)
      
      // Update offline cache for each response
      for (const response of responses.responses || responses) {
        try {
          await offlineDB.updateResponse(response.id, {
            data: { ...response, syncStatus: 'synced' },
            syncStatus: 'synced'
          })
        } catch (cacheError) {
          console.warn('Failed to cache response:', cacheError)
        }
      }
      
      return responses
    } catch (error) {
      // Fallback to offline cache
      console.warn('Online fetch failed, using offline cache:', error)
      
      try {
        const offlineResponses = await offlineDB.responses
          .where('syncStatus').equals('synced')
          .or('syncStatus').equals('pending')
          .toArray()
        
        const responsesData = await Promise.all(
          offlineResponses.map(async (response) => {
            const decryptedData = await offlineDB.decryptData(response.data, (response as any).keyVersion)
            return decryptedData
          })
        )
        
        // Apply filters
        let filteredResponses = responsesData
        
        if (query.assessmentId) {
          filteredResponses = filteredResponses.filter(r => r.assessmentId === query.assessmentId)
        }
        if (query.entityId) {
          filteredResponses = filteredResponses.filter(r => r.entityId === query.entityId)
        }
        if (query.type) {
          filteredResponses = filteredResponses.filter(r => r.type === query.type)
        }
        
        // Apply pagination
        const page = query.page || 1
        const limit = query.limit || 10
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        
        const paginatedResponses = filteredResponses.slice(startIndex, endIndex)
        
        return {
          data: paginatedResponses,
          meta: {
            total: filteredResponses.length,
            page,
            limit,
            totalPages: Math.ceil(filteredResponses.length / limit),
            fromCache: true
          }
        }
      } catch (offlineError) {
        console.error('Offline fallback failed:', offlineError)
        throw error
      }
    }
  }

  // Sync pending responses
  static async syncPendingResponses(): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const pendingResponses = await offlineDB.getSyncQueue()
    const responseQueue = pendingResponses.filter(item => item.type === 'response')
    
    let success = 0
    let failed = 0
    const errors: string[] = []
    
    for (const item of responseQueue) {
      try {
        const data = item.decryptedData
        
        if (item.action === 'create') {
          await ResponseService.createPlannedResponse(data)
        } else if (item.action === 'update') {
          await ResponseService.updatePlannedResponse(item.entityUuid, data)
        }
        
        // Update sync status
        await offlineDB.updateResponse(item.entityUuid, {
          syncStatus: 'synced'
        })
        
        // Remove from sync queue
        await offlineDB.removeSyncQueueItem(item.uuid)
        
        success++
      } catch (error) {
        failed++
        errors.push(`Failed to sync ${item.action} for response ${item.entityUuid}: ${error}`)
        
        // Update retry count
        const updatedItem = {
          attempts: item.attempts + 1,
          lastAttempt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          nextRetry: new Date(Date.now() + Math.pow(2, item.attempts + 1) * 60 * 1000) // Exponential backoff
        }
        
        await offlineDB.updateSyncQueueItem(item.uuid, updatedItem)
      }
    }
    
    return { success, failed, errors }
  }

  // Check assessment conflicts with offline fallback
  static async checkAssessmentConflicts(assessmentId: string): Promise<any> {
    try {
      return await ResponseService.checkAssessmentConflicts(assessmentId)
    } catch (error) {
      // Fallback: check offline cache for conflicts
      const conflictingResponses = await offlineDB.responses
        .where('assessmentId').equals(assessmentId)
        .and(response => response.syncStatus !== 'failed')
        .toArray()
      
      return {
        hasConflict: conflictingResponses.length > 0,
        conflictingResponses: conflictingResponses.map(r => r.uuid),
        message: conflictingResponses.length > 0 
          ? `${conflictingResponses.length} existing response(s) found for this assessment`
          : 'No conflicts detected'
      }
    }
  }
}

// Export singleton instance for client-side use
export const responseOfflineService = new ResponseOfflineService()