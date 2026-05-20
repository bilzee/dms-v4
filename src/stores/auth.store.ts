import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthUser, RoleName } from '@/types/auth';
import { apiGet, apiPost } from '@/lib/api';
import { getAuthToken, setAuthToken, removeAuthToken } from '@/lib/auth/token-utils';

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

// Initialize authentication state from localStorage
const initializeAuthFromStorage = async () => {
  if (typeof window !== 'undefined') {
    // Check both token keys (consistent with token-utils.ts)
    const token = getAuthToken()
    if (token) {
      try {
        // Validate token with backend using the /me endpoint
        const result = await apiGet<{ user: Omit<AuthUser, 'passwordHash'> }>('/api/v1/auth/me')
        
        if (result.success && result.data?.user) {
          useAuthStore.getState().setUser(result.data.user, token)
        } else {
          // Token is invalid, clear both keys
          removeAuthToken()
          useAuthStore.getState().logout()
        }
      } catch (error) {
        // Network error or invalid response, clear both keys
        removeAuthToken()
        useAuthStore.getState().logout()
      }
    }
  }
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

        // Set current role based on role switching priority
        // For donor users, prioritize DONOR role over other roles
        const getHighestPriorityRole = (roleList: RoleName[]): RoleName | null => {
          if (roleList.length === 0) return null;
          
          // Priority order for role selection
          const rolePriority = ['DONOR', 'ASSESSOR', 'COORDINATOR', 'RESPONDER', 'ADMIN'];
          
          return roleList.reduce((highest: RoleName | null, role: RoleName) => {
            if (!highest) return role;
            return rolePriority.indexOf(role) < rolePriority.indexOf(highest) ? role : highest;
          }, null);
        };

        // Always set the highest priority role, especially for single-role users
        // This ensures donor-only users always get DONOR role even if currentRole was previously set to something else
        const currentRole = roles.length === 1 
          ? roles[0] 
          : (get().currentRole && roles.includes(get().currentRole!) ? get().currentRole! : getHighestPriorityRole(roles) || roles[0]);

        set({
          user,
          token,
          isAuthenticated: true,
          roles,
          availableRoles: roles,
          permissions,
          currentRole,
          isLoading: false
        })

        // Save token to localStorage for API calls
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
          const d = result.data as any
          get().setUser(d?.data?.user || d?.user, d?.data?.token || d?.token)
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

        const result = await apiPost('/api/v1/auth/refresh')
        if (!result.success) {
          get().logout()
          throw new Error(result.error || 'Token refresh failed')
        }
        const d = result.data as any
        set({ token: d?.data?.token || d?.token })
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

// Export the initialization function
export { initializeAuthFromStorage };