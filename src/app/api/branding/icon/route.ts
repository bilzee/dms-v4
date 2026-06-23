import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { storageService } from '@/lib/storage/storage.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { section: 'branding' },
    })
    const map = new Map(settings.map(s => [s.key, s.value as string]))

    const pwaIconUrl = map.get('pwaIconUrl') || ''
    const headerIconUrl = map.get('headerIconUrl') || ''

    const iconUrl = pwaIconUrl || headerIconUrl

    if (!iconUrl) {
      return NextResponse.redirect(new URL('/icons/icon-512x512.png', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
    }

    let key: string | null = null

    if (iconUrl.startsWith('/api/v1/storage/download?key=')) {
      key = decodeURIComponent(iconUrl.split('key=')[1])
    } else if (iconUrl.startsWith('/uploads/')) {
      key = iconUrl.replace('/uploads/', '')
    } else if (iconUrl.startsWith('http')) {
      return NextResponse.redirect(iconUrl)
    } else if (iconUrl.startsWith('/icons/')) {
      return NextResponse.redirect(new URL(iconUrl, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
    }

    if (!key) {
      return NextResponse.redirect(new URL('/icons/icon-512x512.png', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
    }

    const exists = await storageService.fileExists(key)
    if (!exists) {
      return NextResponse.redirect(new URL('/icons/icon-512x512.png', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
    }

    const buffer = await storageService.downloadToBuffer(key)

    const ext = key.slice(key.lastIndexOf('.')).toLowerCase()
    const CONTENT_TYPES: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const contentType = CONTENT_TYPES[ext] || 'image/png'

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Branding icon error:', error)
    return NextResponse.redirect(new URL('/icons/icon-512x512.png', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
  }
}
