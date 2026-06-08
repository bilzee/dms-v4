import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { storageService } from '@/lib/storage/storage.service'
import { getStorageKey, STORAGE_PATHS } from '@/lib/storage/paths'
import crypto from 'crypto'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_SIZE = 2 * 1024 * 1024

export const POST = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context
  if (!permissions.includes('MANAGE_USERS')) {
    return errorResponse('Insufficient permissions.', 403)
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return errorResponse('No file provided.', 400)
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse('Invalid file type. Allowed: PNG, JPG, SVG.', 400)
    }

    if (file.size > MAX_SIZE) {
      return errorResponse('File too large. Maximum size: 2MB.', 400)
    }

    const ext = file.type === 'image/svg+xml' ? 'svg' : file.type === 'image/png' ? 'png' : 'jpg'
    const hash = crypto.randomBytes(8).toString('hex')
    const key = getStorageKey(STORAGE_PATHS.branding, `icon-${hash}.${ext}`)

    const buffer = Buffer.from(await file.arrayBuffer())
    await storageService.uploadBuffer(key, buffer, file.type)

    const url = `/api/v1/storage/download?key=${encodeURIComponent(key)}`

    return successResponse({ url })
  } catch (error) {
    console.error('Branding upload error:', error)
    return handleApiError(error)
  }
})
