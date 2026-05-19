import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from '@/stores/auth.store';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

export interface EntityAssignment {
  id: string;
  userId: string;
  entityId: string;
  assignedAt: string;
  assignedBy: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: Array<{
      role: {
        id: string;
        name: string;
      }
    }>;
  };
  entity: {
    id: string;
    name: string;
    type: string;
    location: string | null;
  };
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  location: string | null;
  coordinates?: { lat: number; lng: number } | null;
  metadata?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Array<{
    role: {
      id: string;
      name: string;
    }
  }>;
}

function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

interface EntityState {
  assignments: EntityAssignment[];
  entities: Entity[];
  assignableUsers: User[];
  
  isLoading: boolean;
  selectedEntities: string[];
  selectedUsers: string[];
  bulkAssignModalOpen: boolean;
  assignmentSearchQuery: string;
  
  currentPage: number;
  totalPages: number;
  
  setAssignments: (assignments: EntityAssignment[]) => void;
  setEntities: (entities: Entity[]) => void;
  setAssignableUsers: (users: User[]) => void;
  addAssignment: (assignment: EntityAssignment) => void;
  removeAssignment: (assignmentId: string) => void;
  
  createAssignment: (userId: string, entityId: string) => Promise<boolean>;
  createBulkAssignments: (userIds: string[], entityIds: string[]) => Promise<boolean>;
  deleteAssignment: (assignmentId: string) => Promise<boolean>;
  
  fetchAssignments: (page?: number) => Promise<void>;
  fetchEntities: () => Promise<void>;
  fetchAssignableUsers: () => Promise<void>;
  fetchUserAssignments: (userId: string) => Promise<EntityAssignment[]>;
  fetchEntityAssignments: (entityId: string) => Promise<EntityAssignment[]>;
  
  setLoading: (loading: boolean) => void;
  setSelectedEntities: (entityIds: string[]) => void;
  setSelectedUsers: (userIds: string[]) => void;
  toggleEntitySelection: (entityId: string) => void;
  toggleUserSelection: (userId: string) => void;
  clearSelections: () => void;
  setBulkAssignModalOpen: (open: boolean) => void;
  setAssignmentSearchQuery: (query: string) => void;
  
  getUserAssignedEntities: (userId: string) => Entity[];
  getEntityAssignedUsers: (entityId: string) => User[];
  isUserAssignedToEntity: (userId: string, entityId: string) => boolean;
}

export const useEntityStore = create<EntityState>()(
  persist(
    (set, get) => ({
      assignments: [],
      entities: [],
      assignableUsers: [],
      isLoading: false,
      selectedEntities: [],
      selectedUsers: [],
      bulkAssignModalOpen: false,
      assignmentSearchQuery: '',
      currentPage: 1,
      totalPages: 1,

      setAssignments: (assignments) => set({ assignments }),
      setEntities: (entities) => set({ entities }),
      setAssignableUsers: (users) => set({ assignableUsers: users }),
      addAssignment: (assignment) => set((state) => ({ 
        assignments: [...state.assignments, assignment] 
      })),
      removeAssignment: (assignmentId) => set((state) => ({
        assignments: state.assignments.filter(a => a.id !== assignmentId)
      })),

      createAssignment: async (userId: string, entityId: string) => {
        const token = getAuthToken();
        if (!token) return false;

        const assignedBy = useAuthStore.getState().user?.id;
        const result = await apiPost('/api/v1/entity-assignments', { userId, entityId, assignedBy });

        if (!result.success) return false;

        get().addAssignment(result.data);
        return true;
      },

      createBulkAssignments: async (userIds: string[], entityIds: string[]) => {
        const token = getAuthToken();
        if (!token) return false;

        const assignedBy = useAuthStore.getState().user?.id;
        const result = await apiPost('/api/v1/entity-assignments/bulk', { userIds, entityIds, assignedBy });

        if (!result.success) return false;

        const currentAssignments = get().assignments;
        set({ assignments: [...currentAssignments, ...result.data] });
        return true;
      },

      deleteAssignment: async (assignmentId: string) => {
        const token = getAuthToken();
        if (!token) return false;

        const result = await apiDelete(`/api/v1/entity-assignments/${assignmentId}`);

        if (!result.success) return false;

        get().removeAssignment(assignmentId);
        return true;
      },

      fetchAssignments: async (page = 1) => {
        const token = getAuthToken();
        if (!token) return;

        set({ isLoading: true });

        const result = await apiGet<{ assignments: EntityAssignment[]; pagination: { page: number; totalPages: number } }>(`/api/v1/entity-assignments?page=${page}&limit=10`);

        if (result.success && result.data) {
          set({ 
            assignments: result.data.assignments,
            currentPage: result.data.pagination?.page ?? page,
            totalPages: result.data.pagination?.totalPages ?? 1,
            isLoading: false 
          });
        } else {
          set({ isLoading: false });
        }
      },

      fetchEntities: async () => {
        const token = getAuthToken();
        if (!token) return;

        const result = await apiGet<Entity[]>('/api/v1/entities');

        if (result.success && result.data) {
          set({ entities: result.data });
        }
      },

      fetchAssignableUsers: async () => {
        const token = getAuthToken();
        if (!token) return;

        const result = await apiGet<User[]>('/api/v1/users?roles=ASSESSOR,RESPONDER');

        if (result.success && result.data) {
          set({ assignableUsers: result.data });
        }
      },

      fetchUserAssignments: async (userId: string) => {
        const token = getAuthToken();
        if (!token) return [];

        const result = await apiGet<EntityAssignment[]>(`/api/v1/entity-assignments/user/${userId}`);
        return result.success && result.data ? result.data : [];
      },

      fetchEntityAssignments: async (entityId: string) => {
        const token = getAuthToken();
        if (!token) return [];

        const result = await apiGet<EntityAssignment[]>(`/api/v1/entity-assignments/entity/${entityId}`);
        return result.success && result.data ? result.data : [];
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setSelectedEntities: (entityIds) => set({ selectedEntities: entityIds }),
      setSelectedUsers: (userIds) => set({ selectedUsers: userIds }),
      toggleEntitySelection: (entityId) => set((state) => ({
        selectedEntities: state.selectedEntities.includes(entityId)
          ? state.selectedEntities.filter(id => id !== entityId)
          : [...state.selectedEntities, entityId]
      })),
      toggleUserSelection: (userId) => set((state) => ({
        selectedUsers: state.selectedUsers.includes(userId)
          ? state.selectedUsers.filter(id => id !== userId)
          : [...state.selectedUsers, userId]
      })),
      clearSelections: () => set({ selectedEntities: [], selectedUsers: [] }),
      setBulkAssignModalOpen: (open) => set({ bulkAssignModalOpen: open }),
      setAssignmentSearchQuery: (query) => set({ assignmentSearchQuery: query }),

      getUserAssignedEntities: (userId: string) => {
        const state = get();
        const userAssignments = state.assignments.filter(a => a.userId === userId);
        return userAssignments.map(a => a.entity).map(entityData => {
          const fullEntity = state.entities.find(e => e.id === entityData.id);
          return fullEntity || {
            id: entityData.id,
            name: entityData.name,
            type: entityData.type,
            location: entityData.location,
            coordinates: null as { lat: number; lng: number } | null,
            metadata: null as Record<string, unknown> | null,
            isActive: true,
            createdAt: '',
            updatedAt: ''
          };
        });
      },
      
      getEntityAssignedUsers: (entityId: string) => {
        const state = get();
        const entityAssignments = state.assignments.filter(a => a.entityId === entityId);
        return entityAssignments.map(a => a.user);
      },
      
      isUserAssignedToEntity: (userId: string, entityId: string) => {
        const state = get();
        return state.assignments.some(a => a.userId === userId && a.entityId === entityId);
      }
    }),
    {
      name: 'entity-assignment-storage',
      partialize: (state) => ({
        assignments: state.assignments,
        entities: state.entities,
        assignableUsers: state.assignableUsers,
        selectedEntities: state.selectedEntities,
        selectedUsers: state.selectedUsers,
        assignmentSearchQuery: state.assignmentSearchQuery
      })
    }
  )
);
