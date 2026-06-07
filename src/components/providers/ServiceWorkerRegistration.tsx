'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[PWA] Service worker activated')
              }
            })
          }
        })

        console.log('[PWA] Service worker registered:', registration.scope)
      } catch (error) {
        console.warn('[PWA] Service worker registration failed:', error)
      }
    }

    registerSW()
  }, [])

  return null
}
