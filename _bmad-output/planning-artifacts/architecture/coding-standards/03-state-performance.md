# State Management & Performance Standards

## State Management (Zustand)

### 1. Store Structure
```typescript
// stores/auth.store.ts
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  isLoading: false,
  error: null,
  
  // Actions
  signIn: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(credentials);
      set({ user, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Sign in failed',
        isLoading: false 
      });
    }
  },
  
  signOut: () => {
    set({ user: null, error: null });
  },
  
  clearError: () => {
    set({ error: null });
  },
}));
```

### 2. Store Selectors and Performance

```typescript
// ✅ Use selectors for single values
const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => !!state.user);

// ✅ Use shallow for objects/arrays to prevent unnecessary re-renders
import { shallow } from 'zustand/shallow';

const { user, profile } = useAuthStore(
  (state) => ({ 
    user: state.user, 
    profile: state.profile 
  }),
  shallow
);

// ❌ ANTI-PATTERN: Object selector without shallow
const { user, profile } = useAuthStore((state) => ({ 
  user: state.user, 
  profile: state.profile 
})); // Causes re-render on any change

// ✅ Combine related selectors with shallow
const authData = useAuthStore(
  (state) => ({
    user: state.user,
    isLoading: state.isLoading,
    error: state.error
  }),
  shallow
);
```

### 3. Store Organization Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Monolithic store
interface GiantStore {
  user: User | null;
  assessments: Assessment[];
  ui: {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    modalOpen: boolean;
    modalContent: string;
  };
  filters: {
    status: string;
    dateRange: [Date, Date];
    location: string;
  };
  // ... 50 more properties
}

// ✅ BEST PRACTICE: Separate stores by domain
// stores/auth.store.ts - User authentication only
// stores/assessments.store.ts - Assessment-specific state
// stores/ui.store.ts - UI state only
// stores/filters.store.ts - Filter state only
```

### 4. Persistence and Hydration

```typescript
// ✅ Persist important state with proper hydration
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStorage } from '@/lib/storage/persist-storage';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Store implementation
      user: null,
      isLoading: false,
      error: null,
      
      signIn: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.signIn(credentials);
          set({ user, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Sign in failed',
            isLoading: false 
          });
        }
      },
      
      signOut: () => {
        set({ user: null, error: null });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => persistStorage), // Custom storage for PWA
      partialize: (state) => ({ user: state.user }), // Only persist user
      version: 1, // Version migrations
      onRehydrateStorage: () => (state) => {
        console.log('Auth store hydrated:', state);
      },
    }
  )
);

// ✅ Hydration guard for SSR
'use client';
import { useEffect } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore.persist.hasHydrated();
  
  useEffect(() => {
    // Force hydration if needed
    if (!hasHydrated) {
      useAuthStore.persist.rehydrate();
    }
  }, [hasHydrated]);
  
  if (!hasHydrated) {
    return <div>Loading authentication...</div>;
  }
  
  return <>{children}</>;
}
```

---

## State Orchestration: Zustand + TanStack Query

### 1. Core Principle

**Separation of Concerns:**
- **TanStack Query**: Server state (API data, database records)
- **Zustand**: Client state (UI preferences, form drafts, temporary data)

### 2. Implementation Pattern

```typescript
// ❌ ANTI-PATTERN: Mixing server and client state
const useBadStore = create((set) => ({
  // Server data - should be in TanStack Query
  users: [],
  assessments: [],
  
  // Client state - OK for Zustand
  sidebarOpen: true,
  selectedTab: 'overview',
  
  // Mixed responsibilities
  fetchUsers: async () => { /* API call */ },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

// ✅ BEST PRACTICE: Clear separation

// hooks/useAssessments.ts - Server state
export function useAssessments() {
  return useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.getAssessments(),
    staleTime: 60 * 1000, // 1 minute cache
    refetchOnWindowFocus: false,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateAssessmentData) => api.createAssessment(data),
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}

// stores/ui.store.ts - Client state only
interface UIState {
  sidebarOpen: boolean;
  activeTab: string;
  filters: AssessmentFilters;
  selectedAssessment: string | null;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTab: 'overview',
  filters: { status: 'all', dateRange: null },
  selectedAssessment: null,
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  setSelectedAssessment: (id) => set({ selectedAssessment: id }),
}));
```

### 3. Component Integration

```typescript
// ✅ Clean component pattern
export default function AssessmentsPage() {
  // Server state from TanStack Query
  const { data: assessments, isLoading, error } = useAssessments();
  const createAssessment = useCreateAssessment();
  
  // Client state from Zustand
  const { 
    sidebarOpen, 
    activeTab, 
    filters, 
    setFilters,
    selectedAssessment 
  } = useUIStore();
  
  const filteredAssessments = useMemo(() => {
    if (!assessments) return [];
    
    return assessments.filter(assessment => {
      if (filters.status !== 'all' && assessment.status !== filters.status) {
        return false;
      }
      if (filters.dateRange && assessment.createdAt) {
        const [start, end] = filters.dateRange;
        return assessment.createdAt >= start && assessment.createdAt <= end;
      }
      return true;
    });
  }, [assessments, filters]);

  return (
    <div className="flex">
      <AssessmentSidebar open={sidebarOpen} />
      <main className="flex-1">
        <AssessmentFilters 
          filters={filters} 
          onFiltersChange={setFilters} 
        />
        <AssessmentList 
          assessments={filteredAssessments}
          isLoading={isLoading}
          selectedId={selectedAssessment}
        />
      </main>
    </div>
  );
}
```

### 4. Form Editing Pattern

```typescript
// stores/form.store.ts - Form draft state
interface FormState {
  drafts: Record<string, any>;
  isDirty: Record<string, boolean>;
}

export const useFormStore = create<FormState>((set) => ({
  drafts: {},
  isDirty: {},
  
  setDraft: (formId: string, data: any) => set((state) => ({
    drafts: { ...state.drafts, [formId]: data },
    isDirty: { ...state.isDirty, [formId]: true }
  })),
  
  clearDraft: (formId: string) => set((state) => {
    const newDrafts = { ...state.drafts };
    const newIsDirty = { ...state.isDirty };
    delete newDrafts[formId];
    delete newIsDirty[formId];
    return { drafts: newDrafts, isDirty: newIsDirty };
  }),
}));

// Component usage
export function AssessmentForm({ assessmentId }: { assessmentId: string }) {
  // Server data
  const { data: assessment } = useAssessment(assessmentId);
  const updateAssessment = useUpdateAssessment();
  
  // Client form state
  const { drafts, isDirty, setDraft, clearDraft } = useFormStore();
  const draft = drafts[assessmentId] || assessment || {};
  
  const handleSubmit = async (formData: AssessmentData) => {
    await updateAssessment.mutateAsync({ id: assessmentId, data: formData });
    clearDraft(assessmentId); // Clear client draft after successful save
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields use draft data */}
    </form>
  );
}
```

---

## Performance Standards

### 1. Code Splitting

```typescript
// ✅ Dynamic imports for heavy components
const MapComponent = dynamic(() => import('@/components/InteractiveMap'), {
  loading: () => <p>Loading map...</p>,
  ssr: false
});

// ✅ Route-based code splitting happens automatically with App Router
```

### 2. Memoization

```typescript
// ✅ Memoize expensive calculations
function ExpensiveComponent({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('');
  
  // ✅ Memoized calculation
  const filteredItems = useMemo(() => 
    items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    ), [items, filter]
  );
  
  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      {filteredItems.map(item => <Item key={item.id} item={item} />)}
    </div>
  );
}

// ✅ Memoize callbacks
const handleSubmit = useCallback(async (data: FormData) => {
  await onSubmit(data);
}, [onSubmit]);
```

### 3. Image Optimization

```typescript
// ✅ Use Next.js Image component
import Image from 'next/image';

<Image
  src="/disaster-icon.png"
  alt="Disaster icon"
  width={64}
  height={64}
  priority // For above-the-fold images
/>
```

### 4. Bundle Optimization

```typescript
// ❌ ANTI-PATTERN: Large bundle imports
import _ from 'lodash'; // 🚨 entire library
import { Chart } from 'chart.js'; // 🚨 all chart types

// ✅ CORRECT: Tree-shakeable imports
import { debounce } from 'lodash-es/debounce';
import { Line } from 'react-chartjs-2';
```

### 5. Bundle Analysis

```typescript
// ✅ Regular bundle analysis
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

---

## PWA-Specific Standards

### 1. Service Worker

```typescript
// public/sw.js - Keep minimal
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
});

self.addEventListener('fetch', (event) => {
  // Handle fetch events
});
```

### 2. Offline Storage

```typescript
// lib/db/offline.ts
import Dexie, { Table } from 'dexie';

interface OfflineAssessment {
  id: string;
  data: AssessmentData;
  timestamp: number;
  synced: boolean;
}

class OfflineDatabase extends Dexie {
  assessments!: Table<OfflineAssessment>;
  
  constructor() {
    super('DisasterManagementDB');
    this.version(1).stores({
      assessments: 'id, timestamp, synced'
    });
  }
}

export const offlineDb = new OfflineDatabase();
```

### 3. Sync Strategy

```typescript
// lib/sync/engine.ts
export class SyncEngine {
  async syncPendingData() {
    const pendingItems = await offlineDb.assessments
      .where('synced')
      .equals(false)
      .toArray();
      
    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        await offlineDb.assessments.update(item.id, { synced: true });
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
      }
    }
  }
}
```

---

## Summary

These state management and performance standards ensure:
- **Performance**: Optimized re-renders with shallow comparison
- **Separation**: Clear client vs server state boundaries
- **Persistence**: Proper hydration and storage patterns
- **Caching**: Effective use of TanStack Query
- **Bundle Size**: Optimized imports and code splitting
- **PWA Performance**: Offline-first capabilities and sync strategies