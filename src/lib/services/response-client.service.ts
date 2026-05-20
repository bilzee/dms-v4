import { CreatePlannedResponseInput, CreateDeliveredResponseInput, ResponseItem } from '@/lib/validation/response'
import { apiGet, apiPost, apiPut } from '@/lib/api'

export class ResponseService {
  private static readonly BASE_URL = '/api/v1/responses'

  static async createPlannedResponse(data: CreatePlannedResponseInput) {
    const result = await apiPost(`${this.BASE_URL}/planned`, data)
    if (!result.success) {
      throw new Error(result.error || 'Failed to create planned response')
    }
    const d = result.data as any
    return d?.data || d
  }

  static async createDeliveredResponse(data: CreateDeliveredResponseInput) {
    const result = await apiPost(`${this.BASE_URL}/delivered`, data)
    if (!result.success) {
      throw new Error(result.error || 'Failed to create delivered response')
    }
    const d = result.data as any
    return d?.data || d
  }

  static async getResponseById(id: string) {
    const result = await apiGet(`${this.BASE_URL}/${id}`)
    if (!result.success) {
      throw new Error(result.error || 'Failed to get response')
    }
    const d = result.data as any
    return d?.data || d
  }

  static async updatePlannedResponse(id: string, data: Partial<CreatePlannedResponseInput>) {
    const result = await apiPut(`${this.BASE_URL}/${id}`, data)
    if (!result.success) {
      throw new Error(result.error || 'Failed to update response')
    }
    const d = result.data as any
    return d?.data || d
  }

  static async getPlannedResponsesForResponder(query: {
    assessmentId?: string
    entityId?: string
    type?: string
    page?: number
    limit?: number
  } = {}) {
    const searchParams = new URLSearchParams()

    if (query.assessmentId) searchParams.append('assessmentId', query.assessmentId)
    if (query.entityId) searchParams.append('entityId', query.entityId)
    if (query.type) searchParams.append('type', query.type)
    if (query.page) searchParams.append('page', query.page.toString())
    if (query.limit) searchParams.append('limit', query.limit.toString())

    const result = await apiGet(`${this.BASE_URL}/planned/assigned?${searchParams}`)
    if (!result.success) {
      throw new Error(result.error || 'Failed to get assigned responses')
    }
    const d = result.data as any
    return {
      responses: d?.data || d || [],
      total: d?.meta?.total || (result.meta as any)?.total || 0
    }
  }

  static async checkAssessmentConflicts(assessmentId: string) {
    const result = await apiGet(`${this.BASE_URL}/conflicts/${assessmentId}`)
    if (!result.success) {
      throw new Error(result.error || 'Failed to check assessment conflicts')
    }
    const d = result.data as any
    return d?.data || d
  }

  static async getCollaborationStatus(responseId: string) {
    const result = await apiGet(`${this.BASE_URL}/${responseId}/collaboration`)
    if (!result.success) {
      throw new Error(result.error || 'Failed to get collaboration status')
    }
    const d = result.data as any
    return d?.data || d
  }

  static async updateCollaboration(responseId: string, action: 'join' | 'leave' | 'start_editing' | 'stop_editing') {
    const result = await apiPost(`${this.BASE_URL}/${responseId}/collaboration`, { action })
    if (!result.success) {
      throw new Error(result.error || 'Failed to update collaboration')
    }
    const d = result.data as any
    return d?.data || d
  }
}

export const responseService = new ResponseService()
