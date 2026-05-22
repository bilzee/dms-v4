import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthUser, RoleName } from '@/types/auth';
import { apiPost, ApiResponse } from '@/lib/api';
import { setAuthToken, removeAuthToken } from '@/lib/auth/token-utils';

/** Shape of login/refresh API response data (may be nested under 'data' or at top level) */
interface AuthResponseData {
  data?: {
    user?: Omit<AuthUser, 'passwordHash'>;
    token?: string;
  };
  user?: Omit<AuthUser, 'passwordHash'>;
  token?: string;
}

interface RoleSessionState {
  [key: string]: {
    activeDashboard?: string;
    lastPage?: string;
    formData?: Record<string, any>;
    filters?: Record<string, any>;
    selectedEntities?: string[];
  }
}

interface AuthState {
  // Authentication state
  user: Omit<AuthUser, 'passwordHash'> | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  roles: string[];
  currentRole: RoleName | null;
  availableRoles: RoleName[];
  
  // Role session state
  roleSessionState: RoleSessionState;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: Omit<AuthUser, 'passwordHash'>, token: string) => void;
  
  // Role switching
  switchRole: (role: RoleName) => void;
  canSwitchToRole: (role: RoleName) => boolean;
  
  // Role session management
  saveRoleSession: (role: RoleName, sessionData: Partial<RoleSessionState[string]>) => void;
  getRoleSession: (role: RoleName) => RoleSessionState[string] | undefined;
  clearRoleSession: (role: RoleName) => void;
  
  // Utility
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (...roles: string[]) => boolean;
  getCurrentRolePermissions: () => string[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
      roles: [],
      currentRole: null,
      availableRoles: [],
      roleSessionState: {},

      setUser: (user, token) => {
        const roles = user.roles.map(ur => ur.role.name) as RoleName[]
        const permissions = Array.from(
          new Set(
            user.roles.flatMap(ur => 
              ur.role.permissions.map(rp => rp.permission.code)
            )
          )
        )

        const rolePriority: RoleName[] = ['ADMIN', 'COORDINATOR', 'RESPONDER', 'ASSESSOR', 'DONOR'];

        set({
          user,
          token,
          isAuthenticated: true,
          roles,
          availableRoles: roles,
          permissions,
          isLoading: false
        })

        const existingRole = get().currentRole
        if (!existingRole || !roles.includes(existingRole)) {
          const highestPriorityRole = [...roles].sort((a, b) =>
            rolePriority.indexOf(a) - rolePriority.indexOf(b)
          )[0]
          set({ currentRole: highestPriorityRole || roles[0] })
        }

        if (typeof window !== 'undefined') {
          setAuthToken(token)
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const result = await apiPost('/api/v1/auth/login', { email, password })
          if (!result.success) {
            throw new Error(result.error || 'Login failed')
          }
          const d = result.data as AuthResponseData | undefined
          const user = d?.data?.user || d?.user
          const token = d?.data?.token || d?.token
          if (user && token) {
            get().setUser(user, token)
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Make logout API call (optional for JWT)
        const token = get().token
        if (token) {
          apiPost('/api/v1/auth/logout').catch(() => {})
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: [],
          roles: [],
          currentRole: null,
          availableRoles: [],
          roleSessionState: {},
          isLoading: false
        })

        // Clear token from localStorage
        if (typeof window !== 'undefined') {
          removeAuthToken()
          window.location.href = '/login'
        }
      },

      refresh: async () => {
        const token = get().token
        if (!token) {
          throw new Error('No token available')
        }

        try {
          const result = await apiPost('/api/v1/auth/me')
          if (result.success && result.data) {
            const userData = (result.data as any)?.user || result.data
            const newToken = (result.data as any)?.token || token
            const existingRole = get().currentRole
            get().setUser(userData, newToken)
            if (existingRole && get().availableRoles.includes(existingRole)) {
              set({ currentRole: existingRole })
            }
          } else {
            get().logout()
            throw new Error('Session refresh failed')
          }
        } catch (error) {
          get().logout()
          throw error
        }
      },

      hasPermission: (permission: string) => {
        return get().permissions.includes(permission)
      },

      hasRole: (role: string) => {
        return get().roles.includes(role)
      },

      hasAnyRole: (...roles: string[]) => {
        const userRoles = get().roles
        return roles.some(role => userRoles.includes(role))
      },

      // Role switching methods
      switchRole: (role: RoleName) => {
        const state = get()
        
        if (!state.canSwitchToRole(role)) {
          throw new Error(`Cannot switch to role: ${role}. Role not assigned to user.`)
        }

        // Save current role session before switching
        if (state.currentRole) {
          state.saveRoleSession(state.currentRole, {
            activeDashboard: window.location.pathname,
            lastPage: window.location.pathname,
          })
        }

        set({ currentRole: role })
      },

      canSwitchToRole: (role: RoleName) => {
        return get().availableRoles.includes(role)
      },

      // Role session management
      saveRoleSession: (role: RoleName, sessionData: Partial<RoleSessionState[string]>) => {
        const state = get()
        const currentSession = state.roleSessionState[role] || {}
        
        set({
          roleSessionState: {
            ...state.roleSessionState,
            [role]: { ...currentSession, ...sessionData }
          }
        })
      },

      getRoleSession: (role: RoleName) => {
        return get().roleSessionState[role]
      },

      clearRoleSession: (role: RoleName) => {
        const state = get()
        const newSessionState = { ...state.roleSessionState }
        delete newSessionState[role]
        
        set({ roleSessionState: newSessionState })
      },

      getCurrentRolePermissions: () => {
        const state = get()
        if (!state.user || !state.currentRole) return []
        
        const userRole = state.user.roles.find(ur => ur.role.name === state.currentRole)
        return userRole?.role.permissions.map(rp => rp.permission.code) || []
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        roles: state.roles,
        currentRole: state.currentRole,
        availableRoles: state.availableRoles,
        roleSessionState: state.roleSessionState
      })
    }
  )
);
