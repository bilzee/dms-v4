import { NextRequest, NextResponse } from 'next/server'
import { storageService } from '@/lib/storage/storage.service'

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
  }

  try {
    const exists = await storageService.fileExists(key)
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = await storageService.downloadToBuffer(key)

    const ext = key.slice(key.lastIndexOf('.')).toLowerCase()
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Storage download error:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
