'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { getAuthToken, removeAuthToken } from '@/lib/auth/token-utils'
import { apiGet } from '@/lib/api'

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined') {
        setIsInitialized(true)
        return
      }

      const store = useAuthStore
      if (!store.persist) {
        setIsInitialized(true)
        return
      }

      if (store.persist.hasHydrated()) {
        await validateAndRestore()
      } else {
        store.persist.onFinishHydration(() => {
          validateAndRestore()
        })
        if (!store.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = store.persist.onFinishHydration(() => {
              unsub()
              resolve()
            })
            if (store.persist.hasHydrated()) {
              unsub()
              resolve()
            }
          })
        }
        await validateAndRestore()
      }
    }

    const validateAndRestore = async () => {
      const token = getAuthToken()
      const { isAuthenticated } = useAuthStore.getState()

      if (token && !isAuthenticated) {
        try {
          const result = await apiGet('/api/v1/auth/me')
          if (result.success) {
            const data = result.data as any
            const user = data?.data?.user || data?.user
            if (user) {
              useAuthStore.getState().setUser(user, token)
            } else {
              removeAuthToken()
              useAuthStore.getState().logout()
            }
          } else {
            removeAuthToken()
            useAuthStore.getState().logout()
          }
        } catch {
          removeAuthToken()
          useAuthStore.getState().logout()
        }
      } else if (!token && isAuthenticated) {
        useAuthStore.getState().logout()
      }

      setIsInitialized(true)
    }

    initializeAuth()
  }, [])

  if (!isInitialized) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Initializing...</div>
    </div>
  }

  return <>{children}</>
}
