'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthUser } from '@/types/auth'

interface AuthContextType {
  user: Omit<AuthUser, 'passwordHash'> | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<any>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { 
    user, 
    isAuthenticated, 
    login, 
    logout 
  } = useAuthStore()

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}