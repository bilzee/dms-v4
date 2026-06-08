import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

const STATIC_MANIFEST = {
  name: 'Disaster Response Management System (DRMS)',
  short_name: 'DRMS',
  description: 'Comprehensive disaster response management and humanitarian assessment PWA',
  start_url: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: '#2563eb',
  background_color: '#ffffff',
  categories: ['productivity', 'utilities'],
  lang: 'en',
  scope: '/',
  icons: [
    { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'maskable any' },
    { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'maskable any' },
    { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'maskable any' },
    { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'maskable any' },
    { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'maskable any' },
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
    { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'maskable any' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
  ],
  shortcuts: [
    { name: 'New Assessment', short_name: 'Assessment', description: 'Create a new disaster assessment', url: '/assessor/new-assessment', icons: [{ src: '/icons/shortcut-assessment.png', sizes: '96x96' }] },
    { name: 'Sync Queue', short_name: 'Sync', description: 'View pending synchronization queue', url: '/sync-queue', icons: [{ src: '/icons/shortcut-sync.png', sizes: '96x96' }] },
  ],
}

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { section: 'branding' },
    })

    const brandingMap = new Map(settings.map(s => [s.key, s.value as string]))

    const appName = brandingMap.get('appName') || STATIC_MANIFEST.short_name
    const appDescription = brandingMap.get('appDescription') || STATIC_MANIFEST.description
    const pwaIconUrl = brandingMap.get('pwaIconUrl')

    const manifest = {
      ...STATIC_MANIFEST,
      name: appName,
      short_name: appName,
      description: appDescription,
    }

    if (pwaIconUrl) {
      const iconType = pwaIconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
      manifest.icons = [
        { src: pwaIconUrl, sizes: '512x512', type: iconType, purpose: 'maskable any' },
        { src: pwaIconUrl, sizes: '192x192', type: iconType, purpose: 'maskable any' },
        { src: pwaIconUrl, sizes: '144x144', type: iconType, purpose: 'maskable any' },
        ...STATIC_MANIFEST.icons,
      ]
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('Manifest error, serving static fallback:', error)
    return NextResponse.json(STATIC_MANIFEST, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=60',
      },
    })
  }
}
