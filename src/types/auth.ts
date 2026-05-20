import { User, Role, Permission } from '@prisma/client'

export type RoleName = 'ASSESSOR' | 'COORDINATOR' | 'RESPONDER' | 'DONOR' | 'ADMIN'

export interface AuthUser extends User {
  roles: Array<{
    role: Role & {
      permissions: Array<{
        permission: Permission
      }>
    }
  }>
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success?: true
  data: {
    user: Omit<AuthUser, 'passwordHash'>
    token: string
    roles: Role[]
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface RefreshTokenRequest {
  refreshToken?: string
}

export interface RefreshTokenResponse {
  success?: true
  data: {
    token: string
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface CreateUserRequest {
  email: string
  username: string
  password: string
  name: string
  phone?: string
  organization?: string
  roleIds: string[]
}

export interface CreateUserResponse {
  success?: true
  data: {
    user: Omit<AuthUser, 'passwordHash'>
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface AssignRolesRequest {
  roleIds: string[]
}

export interface UserMeResponse {
  success?: true
  data: {
    user: Omit<AuthUser, 'passwordHash'>
    permissions: string[]
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}


export interface AuthState {
  user: Omit<AuthUser, 'passwordHash'> | null
  token: string | null
  isAuthenticated: boolean
  permissions: string[]
  roles: string[]
}

// Frontend hook interfaces
export interface UseAuthReturn {
  user: Omit<AuthUser, 'passwordHash'> | null
  token: string | null
  isAuthenticated: boolean
  permissions: string[]
  roles: string[]
  currentRole: RoleName | null
  availableRoles: RoleName[]
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  
  // Role switching
  switchRole: (role: RoleName) => void
  canSwitchToRole: (role: RoleName) => boolean
  
  // Role session management
  saveRoleSession: (role: RoleName, sessionData: any) => void
  getRoleSession: (role: RoleName) => any
  clearRoleSession: (role: RoleName) => void
  getCurrentRolePermissions: () => string[]
  
  // Utility
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (...roles: string[]) => boolean
}