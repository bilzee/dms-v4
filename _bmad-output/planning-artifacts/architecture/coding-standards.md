# Coding Standards - Disaster Management PWA

## Document Information
- **Version**: 1.0
- **Last Updated**: 2025-01-06
- **Purpose**: Comprehensive coding standards for Next.js 14 PWA project
- **Tech Stack**: Next.js 14, TypeScript, Shadcn/ui, Zustand, PostgreSQL/Prisma, IndexedDB

## Table of Contents
1. [TypeScript Standards](#typescript-standards)
2. [Next.js App Router Conventions](#nextjs-app-router-conventions)
3. [React Component Standards](#react-component-standards)
4. [State Management (Zustand)](#state-management-zustand)
5. [Database & API Standards](#database--api-standards)
6. [File Organization](#file-organization)
7. [Import/Export Standards](#importexport-standards)
8. [Styling Standards](#styling-standards)
9. [Testing Standards](#testing-standards)
10. [PWA-Specific Standards](#pwa-specific-standards)
11. [Error Handling](#error-handling)
12. [Performance Standards](#performance-standards)

---

## TypeScript Standards

### 1. Strict Configuration
```typescript
// tsconfig.json - Use strict mode
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 2. Type Definitions
```typescript
// ✅ Use interfaces for objects
interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

// ✅ Use types for unions and primitives
type UserRole = 'assessor' | 'coordinator' | 'responder' | 'donor' | 'admin';
type Status = 'pending' | 'approved' | 'rejected';

// ❌ Avoid any
const data: any = {}; // Bad

// ✅ Use proper typing
const data: Record<string, unknown> = {}; // Good
```

### 3. Generic Constraints
```typescript
// ✅ Use proper generic constraints
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// ✅ Constrain generics when needed
function processEntity<T extends { id: string }>(entity: T): T {
  // Implementation
}
```

---

## Next.js App Router Conventions

### 1. File Structure
```
src/app/
├── (auth)/              # Route groups for protected routes
├── (public)/            # Public routes
├── api/v1/             # API routes
├── layout.tsx          # Root layout
├── page.tsx            # Root page
├── loading.tsx         # Loading UI
├── error.tsx           # Error boundaries
└── not-found.tsx       # 404 page
```

### 2. Server vs Client Components

**Server Components (Default):**
```typescript
// ✅ Use Server Components by default - no interactivity needed
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db/client';

export default function AssessmentPage() {
  // Server-side data fetching
  const session = await getServerSession();
  const assessments = await db.assessment.findMany();
  
  return <AssessmentList assessments={assessments} />;
}

// ✅ Server Components can access all environment variables
const secretKey = process.env.SUPABASE_SERVICE_KEY; // ✅ Safe
```

**Client Components (When Needed):**
```typescript
// ✅ Use 'use client' only for interactivity
'use client';
import { useState } from 'react';

export default function InteractiveMap() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  return <div>Interactive Map</div>;
}

// ❌ NEVER access secrets in client components
const secretKey = process.env.SUPABASE_SERVICE_KEY; // 🚨 ANTI-PATTERN!
const publicApiKey = process.env.NEXT_PUBLIC_SUPABASE_URL; // ✅ Correct
```

### 3. Server Component Best Practices

```typescript
// ✅ Server-first architecture
export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Server-side data fetching with caching
  const assessments = await db.assessment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    cacheStrategy: { ttl: 60 } // 1 minute cache
  });
  
  return (
    <div>
      <h1>Dashboard</h1>
      <AssessmentGrid assessments={assessments} />
    </div>
  );
}

// ✅ Dynamic data with Suspense for better UX
import { Suspense } from 'react';

export default function AssessmentPage() {
  return (
    <div>
      <h1>Assessments</h1>
      <Suspense fallback={<AssessmentSkeleton />}>
        <AssessmentList />
      </Suspense>
    </div>
  );
}

async function AssessmentList() {
  const assessments = await db.assessment.findMany();
  return <AssessmentGrid assessments={assessments} />;
}
```

### 4. Environment Variable Security

```typescript
// ✅ Server Components - Full access to secrets
export async function ServerComponent() {
  const dbUrl = process.env.DATABASE_URL; // ✅ Safe
  const apiKey = process.env.SUPABASE_SERVICE_KEY; // ✅ Safe
  
  // Server-side logic
  return <div>Server Data</div>;
}

// ❌ Client Components - Only public variables
'use client';
export function ClientComponent() {
  const dbUrl = process.env.DATABASE_URL; // 🚨 undefined/unsafe
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; // ✅ Available
  
  return <div>Client Data</div>;
}

// ✅ Proper pattern - Pass data from server to client
export default function SecurePage() {
  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
  
  return <ClientDashboard config={config} />;
}
```

### 5. Page Components with Metadata

```typescript
// ✅ Use proper metadata export
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assessment Dashboard',
  description: 'View and manage disaster assessments',
  openGraph: {
    title: 'Assessment Dashboard',
    description: 'Disaster Management PWA',
    type: 'website',
  },
};

export default function AssessmentPage() {
  return <div>Assessment Dashboard</div>;
}
```

### 6. API Routes
```typescript
// app/api/v1/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Implementation
    return NextResponse.json({ data: [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## React Component Standards

### 1. Component Structure
```typescript
// ✅ Functional components with TypeScript
interface AssessmentFormProps {
  assessment?: Assessment;
  onSubmit: (data: AssessmentData) => Promise<void>;
  isLoading?: boolean;
}

export function AssessmentForm({ 
  assessment, 
  onSubmit, 
  isLoading = false 
}: AssessmentFormProps) {
  // Hooks first
  const [errors, setErrors] = useState<string[]>([]);
  const { user } = useAuthStore();
  
  // Event handlers
  const handleSubmit = async (data: AssessmentData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      setErrors(['Failed to submit assessment']);
    }
  };
  
  // Early returns
  if (!user) {
    return <div>Please log in to continue</div>;
  }
  
  // Main render
  return (
    <form onSubmit={handleSubmit}>
      {/* Component JSX */}
    </form>
  );
}
```

### 2. Props and Default Values
```typescript
// ✅ Use interface for props
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// ✅ Default values in destructuring
export function Button({ 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  children, 
  onClick 
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### 3. Modern React Patterns

```typescript
// ✅ React Hook Form + Zod + Radix UI integration
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Select from '@radix-ui/react-select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const assessmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['rapid', 'comprehensive', 'follow-up']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().optional(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface AssessmentFormProps {
  assessment?: AssessmentFormData;
  onSubmit: (data: AssessmentFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AssessmentForm({ 
  assessment, 
  onSubmit, 
  isLoading = false 
}: AssessmentFormProps) {
  const form = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: assessment || {
      title: '',
      type: 'rapid',
      priority: 'medium',
      description: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      form.reset(); // Reset form on successful submission
    } catch (error) {
      // Error handling is managed by the form
      console.error('Submission failed:', error);
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Assessment Title
        </label>
        <input
          id="title"
          {...form.register('title')}
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            form.formState.errors.title && "border-red-500"
          )}
          placeholder="Enter assessment title"
        />
        {form.formState.errors.title && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Assessment Type
        </label>
        <Select.Root
          value={form.watch('type')}
          onValueChange={(value) => form.setValue('type', value as any)}
        >
          <Select.Trigger className="w-full px-3 py-2 border rounded-md">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="rapid">
              <Select.ItemText>Rapid Assessment</Select.ItemText>
            </Select.Item>
            <Select.Item value="comprehensive">
              <Select.ItemText>Comprehensive Assessment</Select.ItemText>
            </Select.Item>
            <Select.Item value="follow-up">
              <Select.ItemText>Follow-up Assessment</Select.ItemText>
            </Select.Item>
          </Select.Content>
        </Select.Root>
      </div>

      <Button 
        type="submit" 
        disabled={isLoading || !form.formState.isValid}
        className="w-full"
      >
        {isLoading ? 'Submitting...' : 'Submit Assessment'}
      </Button>
    </form>
  );
}
```

### 4. Error Boundaries

```typescript
// components/ErrorBoundary.tsx
'use client';
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps, 
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { 
  error?: Error; 
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      </div>
    </div>
  );
}
```

### 5. Event Handlers

```typescript
// ✅ Proper event handler typing
const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setInput(event.target.value);
};

const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // Handle submission
};

// ✅ Custom event handlers with proper typing
interface AssessmentCardProps {
  assessment: Assessment;
  onSelect: (assessment: Assessment) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function AssessmentCard({ 
  assessment, 
  onSelect, 
  onEdit, 
  onDelete 
}: AssessmentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelect = useCallback(() => {
    onSelect(assessment);
  }, [assessment, onSelect]);

  const handleEdit = useCallback((event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card selection
    onEdit(assessment.id);
  }, [assessment.id, onEdit]);

  const handleDelete = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (isDeleting) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this assessment?'
    );
    
    if (confirmed) {
      setIsDeleting(true);
      try {
        await onDelete(assessment.id);
      } finally {
        setIsDeleting(false);
      }
    }
  }, [assessment.id, onDelete, isDeleting]);

  return (
    <div 
      onClick={handleSelect}
      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
    >
      <h3>{assessment.title}</h3>
      <div className="flex gap-2 mt-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleEdit}
          disabled={isDeleting}
        >
          Edit
        </Button>
        <Button 
          size="sm" 
          variant="destructive" 
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}
```

---

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

### 5. Server vs Client State Separation

```typescript
// ❌ ANTI-PATTERN: Storing server data in Zustand
const useAssessmentsStore = create((set) => ({
  assessments: [], // 🚨 Server data duplicated here
  loading: false,
  fetchAssessments: async () => {
    set({ loading: true });
    const assessments = await fetch('/api/assessments');
    set({ assessments, loading: false });
  }
}));

// ✅ BEST PRACTICE: Zustand for client state only
// Use TanStack Query for server state

// stores/ui.store.ts - Client UI state only
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  activeTab: 'overview',
  filters: {
    status: 'all',
    dateRange: null,
  },
  
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  setFilters: (filters: Partial<Filters>) => 
    set((state) => ({ 
      filters: { ...state.filters, ...filters } 
    })),
}));

// Server data handled by TanStack Query
const { data: assessments, isLoading, error } = useQuery({
  queryKey: ['assessments'],
  queryFn: () => fetch('/api/assessments').then(res => res.json()),
  staleTime: 60 * 1000, // 1 minute
});
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
  
  // Mixed actions - confusing responsibility
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

## Database & API Standards

### 1. Prisma + Supabase Integration

#### Schema Design Best Practices

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ✅ Use consistent naming and proper types
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      UserRole
  isActive  Boolean  @default(true)
  
  // Supabase Auth integration
  supabaseId String? @unique @map("supabase_id")
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  assessments Assessment[]
  assignments  Assignment[]

  @@map("users")
  @@index([supabaseId])
  @@index([role])
}

enum UserRole {
  ASSESSOR
  COORDINATOR
  RESPONDER
  DONOR
  ADMIN

  @@map("user_role")
}

model Assessment {
  id          String       @id @default(cuid())
  title       String
  description String?
  type        AssessmentType
  status      AssessmentStatus @default(PENDING)
  priority    Priority     @default(MEDIUM)
  
  // Location data
  latitude    Float?
  longitude   Float?
  address     String?
  
  // Metadata
  metadata    Json?        // For flexible assessment data
  
  // Relations
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  @@map("assessments")
  @@index([userId])
  @@index([status])
  @@index([type])
  @@index([priority])
}

enum AssessmentType {
  RAPID
  COMPREHENSIVE
  FOLLOW_UP
  SECURITY
  HEALTH

  @@map("assessment_type")
}

enum AssessmentStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED

  @@map("assessment_status")
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL

  @@map("priority")
}
```

#### Database Connection and Pooling

```typescript
// lib/db/client.ts
import { PrismaClient } from '@prisma/client';

// Global singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Connection pooling for Supabase
export const dbWithPooling = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Supabase connection pooling
  // Use connection pooler for serverless environments
  // Direct connection for long-running processes
});

// Health check function
export async function checkDatabaseHealth() {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}
```

#### Row-Level Security (RLS) Integration

```typescript
// lib/db/rls.ts
import { db } from './client';

// RLS-aware queries - automatically filter by user permissions
export const secureQueries = {
  // Only returns assessments user has access to
  getAssessments: (userId: string) => 
    db.assessment.findMany({
      where: {
        OR: [
          { userId }, // Own assessments
          // Add other RLS conditions based on role
          // Example: Coordinators can see assessments in their region
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),

  // Create assessment with automatic user association
  createAssessment: (data: Omit<Assessment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, userId: string) =>
    db.assessment.create({
      data: {
        ...data,
        userId
      },
      include: {
        user: true
      }
    }),

  // Update with permission check
  updateAssessment: (id: string, userId: string, data: Partial<Assessment>) =>
    db.assessment.updateMany({
      where: {
        id,
        userId // Can only update own assessments
      },
      data
    }),
};
```

#### Database Transactions

```typescript
// lib/db/transactions.ts
import { db } from './client';

// Transaction for assessment creation with related data
export async function createAssessmentWithRelatedData(
  assessmentData: CreateAssessmentData,
  userId: string
) {
  return await db.$transaction(async (tx) => {
    // 1. Create assessment
    const assessment = await tx.assessment.create({
      data: {
        ...assessmentData,
        userId
      }
    });

    // 2. Create related assignments if needed
    if (assessmentData.assigneeIds?.length > 0) {
      await tx.assignment.createMany({
        data: assessmentData.assigneeIds.map(assigneeId => ({
          assessmentId: assessment.id,
          userId: assigneeId,
          role: 'ASSESSOR'
        }))
      });
    }

    // 3. Log creation event
    await tx.auditLog.create({
      data: {
        action: 'ASSESSMENT_CREATED',
        userId,
        assessmentId: assessment.id,
        metadata: assessmentData
      }
    });

    return assessment;
  });
}

// Transaction with retry logic for concurrent operations
export async function safeTransaction<T>(
  callback: (tx: PrismaTransaction) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await db.$transaction(callback);
    } catch (error) {
      // Retry on serialization failures
      if (error instanceof Prisma.PrismaClientKnownRequestError && 
          error.code === 'P2002' && 
          attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Transaction failed after maximum retries');
}
```

#### Database Migrations and Seeding

```typescript
// prisma/migrations/migration-utils.ts
import { PrismaClient } from '@prisma/client';

// Migration helpers for Supabase
export const migrationHelpers = {
  // Enable RLS for tables
  enableRLS: async (tableName: string) => {
    await db.$executeRaw`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`;
  },

  // Create RLS policies
  createRLSPolicy: async (
    tableName: string,
    policyName: string,
    definition: string
  ) => {
    await db.$executeRaw`
      CREATE POLICY ${policyName} ON ${tableName}
      ${definition};
    `;
  },

  // Add indexes for performance
  addIndex: async (tableName: string, columns: string[], unique = false) => {
    const indexName = `idx_${tableName}_${columns.join('_')}`;
    const uniqueKeyword = unique ? 'UNIQUE' : '';
    await db.$executeRaw`
      CREATE ${uniqueKeyword} INDEX ${indexName} 
      ON ${tableName} (${columns.join(', ')});
    `;
  }
};

// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users with different roles
  const testUsers = [
    {
      email: 'assessor@test.com',
      name: 'Test Assessor',
      role: 'ASSESSOR' as const,
      password: await bcrypt.hash('password123', 10)
    },
    {
      email: 'coordinator@test.com',
      name: 'Test Coordinator', 
      role: 'COORDINATOR' as const,
      password: await bcrypt.hash('password123', 10)
    },
    {
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'ADMIN' as const,
      password: await bcrypt.hash('password123', 10)
    }
  ];

  for (const userData of testUsers) {
    await db.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        role: userData.role
      }
    });
  }

  // Create sample assessments
  const assessor = await db.user.findUnique({
    where: { email: 'assessor@test.com' }
  });

  if (assessor) {
    await db.assessment.createMany({
      data: [
        {
          title: 'Rapid Needs Assessment - Flood Zone',
          description: 'Initial assessment of affected areas after recent flooding',
          type: 'RAPID',
          status: 'COMPLETED',
          priority: 'HIGH',
          userId: assessor.id,
          latitude: 6.5244,
          longitude: 3.3792,
          metadata: {
            affectedPopulation: 1500,
            immediateNeeds: ['shelter', 'food', 'medical'],
            assessmentDate: new Date().toISOString()
          }
        },
        {
          title: 'Health Facility Assessment',
          description: 'Comprehensive assessment of local healthcare capacity',
          type: 'HEALTH',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          userId: assessor.id,
          latitude: 6.5244,
          longitude: 3.3792,
          metadata: {
            facilityType: 'primary_health_center',
            staffCount: 12,
            bedCapacity: 25
          }
        }
      ]
    });
  }

  console.log('✅ Database seeding completed');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

### 2. API Response Types
```typescript
// types/api.ts
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3. Error Handling
```typescript
// lib/api/error-handler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): ApiResponse {
  if (error instanceof ApiError) {
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
  
  return {
    success: false,
    message: 'Internal server error',
    data: null,
  };
}
```

---

## File Organization

### 1. Component Files
```typescript
// components/forms/assessment/AssessmentForm/
├── index.ts              # Re-export
├── AssessmentForm.tsx    # Main component
├── AssessmentForm.test.tsx
├── AssessmentForm.types.ts
└── hooks/
    └── useAssessmentForm.ts
```

### 2. Index Files
```typescript
// components/forms/assessment/index.ts
export { AssessmentForm } from './AssessmentForm';
export { QuickAssessmentForm } from './QuickAssessmentForm';
export type { AssessmentFormProps } from './AssessmentForm.types';
```

### 3. Barrel Exports
```typescript
// components/ui/index.ts - Avoid deep barrel exports
export { Button } from './button';
export { Card } from './card';
export { Input } from './input';
// Don't re-export everything from subdirectories
```

---

## Import/Export Standards

### 1. Import Order
```typescript
// ✅ Standard import order
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

// 2. UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3. Internal components
import { AssessmentForm } from '@/components/forms/assessment';

// 4. Stores and hooks
import { useAuthStore } from '@/stores/auth.store';
import { useOffline } from '@/hooks/useOffline';

// 5. Utilities
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';

// 6. Types (always last)
import type { Assessment, User } from '@/types/entities';
```

### 2. Export Standards
```typescript
// ✅ Named exports preferred
export function AssessmentForm() {}
export const AssessmentSchema = z.object({});

// ✅ Default exports for pages and main components
export default function AssessmentPage() {}

// ✅ Type exports
export type { AssessmentFormProps };
```

---

## Styling Standards

### 1. Tailwind CSS
```typescript
// ✅ Use consistent class ordering
<div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm">

// ✅ Use cn() utility for conditional classes
import { cn } from '@/lib/utils';

<button 
  className={cn(
    "px-4 py-2 rounded-md font-medium transition-colors",
    variant === 'primary' && "bg-blue-600 text-white hover:bg-blue-700",
    variant === 'secondary' && "bg-gray-200 text-gray-900 hover:bg-gray-300",
    disabled && "opacity-50 cursor-not-allowed"
  )}
>
```

### 2. Component Variants
```typescript
// ✅ Use cva for component variants
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

---

## Testing Standards

### 1. Unit Tests
```typescript
// __tests__/components/AssessmentForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssessmentForm } from '@/components/forms/assessment/AssessmentForm';

describe('AssessmentForm', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });
  
  it('renders assessment form fields', () => {
    render(<AssessmentForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/assessment type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
  });
  
  it('submits form with valid data', async () => {
    render(<AssessmentForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/assessment type/i), {
      target: { value: 'rapid' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rapid'
        })
      );
    });
  });
});
```

### 2. Integration Tests

```typescript
// __tests__/api/assessments.test.ts
import { GET, POST } from '@/app/api/v1/assessments/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';

describe('/api/v1/assessments', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.assessment.deleteMany();
    await db.user.deleteMany();
  });

  it('returns assessments for authenticated user', async () => {
    // Setup test user
    const testUser = await db.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'ASSESSOR'
      }
    });

    // Create test assessments
    await db.assessment.createMany({
      data: [
        {
          title: 'Test Assessment 1',
          userId: testUser.id,
          status: 'PENDING'
        },
        {
          title: 'Test Assessment 2',
          userId: testUser.id,
          status: 'COMPLETED'
        }
      ]
    });

    const request = new NextRequest('http://localhost:3000/api/v1/assessments', {
      headers: {
        'Authorization': `Bearer ${testUser.id}`
      }
    });
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it('creates assessment with valid data', async () => {
    const testUser = await db.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'ASSESSOR'
      }
    });

    const assessmentData = {
      title: 'New Assessment',
      type: 'RAPID',
      description: 'Test description'
    };

    const request = new NextRequest('http://localhost:3000/api/v1/assessments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.id}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assessmentData)
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe(assessmentData.title);
  });
});
```

### 3. Server Component Testing

```typescript
// __tests__/components/AssessmentPage.test.tsx
import { AssessmentPage } from '@/app/assessments/page';
import { db } from '@/lib/db/client';

// Mock the database
jest.mock('@/lib/db/client', () => ({
  db: {
    assessment: {
      findMany: jest.fn(),
    }
  }
}));

describe('AssessmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders assessments from database', async () => {
    const mockAssessments = [
      { id: '1', title: 'Assessment 1', status: 'PENDING' },
      { id: '2', title: 'Assessment 2', status: 'COMPLETED' }
    ];

    (db.assessment.findMany as jest.Mock).mockResolvedValue(mockAssessments);

    const page = await AssessmentPage();
    
    expect(page).toBeDefined();
    expect(db.assessment.findMany).toHaveBeenCalled();
    
    // Verify the page contains assessment data
    const pageHtml = await page.toString();
    expect(pageHtml).toContain('Assessment 1');
    expect(pageHtml).toContain('Assessment 2');
  });
});
```

### 4. Zustand Store Testing

```typescript
// __tests__/stores/auth.store.test.ts
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/stores/auth.store';

// Mock the auth service
jest.mock('@/lib/auth/service', () => ({
  authService: {
    signIn: jest.fn(),
    signOut: jest.fn(),
  }
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      isLoading: false,
      error: null
    });
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles successful sign in', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    const { authService } = require('@/lib/auth/service');
    authService.signIn.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.signIn({ email: 'test@example.com', password: 'password' });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles sign in error', async () => {
    const { authService } = require('@/lib/auth/service');
    authService.signIn.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.signIn({ email: 'test@example.com', password: 'wrong' });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('clears error on signOut', async () => {
    const { result } = renderHook(() => useAuthStore());

    // Set error state
    act(() => {
      useAuthStore.setState({ error: 'Some error' });
    });

    expect(result.current.error).toBe('Some error');

    // Sign out should clear error
    act(() => {
      result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
```

### 5. Component Integration Testing

```typescript
// __tests__/components/AssessmentCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssessmentCard } from '@/components/AssessmentCard';

// Mock API calls
jest.mock('@/hooks/useAssessments', () => ({
  useUpdateAssessment: () => ({
    mutateAsync: jest.fn(),
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('AssessmentCard', () => {
  let queryClient: QueryClient;
  let mockOnSelect: jest.Mock;
  let mockOnEdit: jest.Mock;
  let mockOnDelete: jest.Mock;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockOnSelect = jest.fn();
    mockOnEdit = jest.fn();
    mockOnDelete = jest.fn();
  });

  const renderComponent = (assessment: Assessment) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AssessmentCard
          assessment={assessment}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      </QueryClientProvider>
    );
  };

  it('renders assessment information correctly', () => {
    const assessment = {
      id: '1',
      title: 'Test Assessment',
      status: 'PENDING',
      createdAt: new Date('2024-01-01')
    };

    renderComponent(assessment);

    expect(screen.getByText('Test Assessment')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    const assessment = {
      id: '1',
      title: 'Test Assessment',
      status: 'PENDING',
      createdAt: new Date()
    };

    renderComponent(assessment);

    fireEvent.click(screen.getByText('Test Assessment'));
    expect(mockOnSelect).toHaveBeenCalledWith(assessment);
  });

  it('calls onEdit when edit button is clicked', async () => {
    const assessment = {
      id: '1',
      title: 'Test Assessment',
      status: 'PENDING',
      createdAt: new Date()
    };

    renderComponent(assessment);

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Should not trigger card selection
    expect(mockOnSelect).not.toHaveBeenCalled();
    expect(mockOnEdit).toHaveBeenCalledWith('1');
  });

  it('shows confirmation dialog before deletion', async () => {
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    const assessment = {
      id: '1',
      title: 'Test Assessment',
      status: 'PENDING',
      createdAt: new Date()
    };

    mockOnDelete.mockResolvedValue(undefined);

    renderComponent(assessment);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this assessment?'
    );

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    // Restore original confirm
    window.confirm = originalConfirm;
  });
});
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

## Error Handling

### 1. Error Boundaries
```typescript
// components/ErrorBoundary.tsx
'use client';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

export function ErrorBoundary({ children, fallback: Fallback }: ErrorBoundaryProps) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {children}
    </React.Suspense>
  );
}
```

### 2. Error Types
```typescript
// types/errors.ts
export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'NetworkError';
  }
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

### 2. Image Optimization
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

### 3. Bundle Analysis
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

## Enforcement Tools

### 1. ESLint Configuration
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 2. Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### 3. Git Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

---

## Critical Anti-Patterns to Avoid

### 1. State Management Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Mixing server and client state
const useMixedStore = create((set) => ({
  // Server data - use TanStack Query instead
  assessments: [],
  users: [],
  loading: false,
  
  // Client state - OK for Zustand
  sidebarOpen: true,
  
  // Mixed responsibilities
  fetchAssessments: async () => {
    set({ loading: true });
    const data = await fetch('/api/assessments');
    set({ assessments: data, loading: false });
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

// ✅ CORRECT: Clear separation
// Server state with TanStack Query
const { data: assessments, isLoading } = useQuery({
  queryKey: ['assessments'],
  queryFn: () => api.getAssessments(),
});

// Client state with Zustand
const { sidebarOpen, setSidebarOpen } = useUIStore();
```

### 2. Component Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Prop drilling
export function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  return (
    <div>
      <Header user={user} theme={theme} setUser={setUser} setTheme={setTheme} />
      <Dashboard user={user} theme={theme} setUser={setUser} setTheme={setTheme} />
      <Footer user={user} theme={theme} />
    </div>
  );
}

// ✅ CORRECT: Use context or stores
export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div>
          <Header />
          <Dashboard />
          <Footer />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}

// ❌ ANTI-PATTERN: useEffect for data fetching
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(userData => {
      setUser(userData);
      setLoading(false);
    });
  }, [userId]);
  
  // ❌ No error handling, caching, or background refetch
  
  return loading ? 'Loading...' : <div>{user.name}</div>;
}

// ✅ CORRECT: Use TanStack Query
function UserProfile({ userId }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  
  if (isLoading) return 'Loading...';
  if (error) return 'Error loading user';
  
  return <div>{user.name}</div>;
}
```

### 3. Server Component Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Server component with interactivity
export default function AssessmentPage() {
  const [count, setCount] = useState(0); // 🚨 React hooks in server component
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

// ✅ CORRECT: Separate server and client components
export default function AssessmentPage() {
  // Server component - fetch data, no interactivity
  const assessments = await db.assessment.findMany();
  
  return (
    <div>
      <h1>Assessments ({assessments.length})</h1>
      <AssessmentCounter initialCount={assessments.length} />
    </div>
  );
}

'use client';
function AssessmentCounter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### 4. Environment Variable Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Exposing secrets to client
'use client';
export function ApiComponent() {
  const dbUrl = process.env.DATABASE_URL; // 🚨 undefined on client
  const apiKey = process.env.SUPABASE_SERVICE_KEY; // 🚨 security risk
  
  useEffect(() => {
    fetch('/api/data', {
      headers: {
        'Authorization': `Bearer ${apiKey}` // 🚨 exposed to browser
      }
    });
  }, []);
  
  return <div>Data</div>;
}

// ✅ CORRECT: Server-side secrets, client-side config only
// Server component
export async function ApiComponent() {
  const apiKey = process.env.SUPABASE_SERVICE_KEY; // ✅ safe on server
  
  const data = await fetch('/api/external', {
    headers: {
      'Authorization': `Bearer ${apiKey}` // ✅ server-side only
    }
  });
  
  return <ClientDataComponent data={data} />;
}

// Client component
'use client';
function ClientDataComponent({ data }: { data: any }) {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL; // ✅ safe public variable
  
  return <div>{data}</div>;
}
```

### 5. Performance Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Unnecessary re-renders
function ExpensiveComponent({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('');
  
  // ❌ Re-calculates on every render
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(filter.toLowerCase())
  );
  
  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      {filteredItems.map(item => <Item key={item.id} item={item} />)}
    </div>
  );
}

// ✅ CORRECT: Memoization
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

// ❌ ANTI-PATTERN: Large bundle imports
import _ from 'lodash'; // 🚨 entire library
import { Chart } from 'chart.js'; // 🚨 all chart types

// ✅ CORRECT: Tree-shakeable imports
import { debounce } from 'lodash-es/debounce';
import { Line } from 'react-chartjs-2';
```

### 6. TypeScript Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Using `any`
function processData(data: any): any {
  return data.map((item: any) => ({ 
    id: item.id, 
    name: item.name 
  }));
}

// ✅ CORRECT: Proper typing
interface Item {
  id: string;
  name: string;
}

function processData(data: unknown[]): Item[] {
  const items = data as Item[];
  return items.map(item => ({ 
    id: item.id, 
    name: item.name 
  }));
}

// ❌ ANTI-PATTERN: Type assertions without validation
const user = userData as User; // 🚨 dangerous

// ✅ CORRECT: Runtime validation
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

function parseUser(data: unknown): User | null {
  const result = UserSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

### 7. Form Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Uncontrolled form with manual state
function BadForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ❌ Manual validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name required';
    if (!formData.email) newErrors.email = 'Email required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // ❌ No schema validation
    submitForm(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={formData.name}
        onChange={e => setFormData({...formData, name: e.target.value})}
      />
      {errors.name && <span>{errors.name}</span>}
      {/* More fields... */}
    </form>
  );
}

// ✅ CORRECT: React Hook Form + Zod
const formSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be 8+ characters'),
});

function GoodForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: ''
    }
  });
  
  const handleSubmit = form.handleSubmit(async (data) => {
    await submitForm(data);
    form.reset();
  });
  
  return (
    <form onSubmit={handleSubmit}>
      <input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      {/* More fields... */}
    </form>
  );
}
```

---

## Summary

These coding standards ensure:
- **Type Safety**: Strict TypeScript configuration
- **Consistency**: Standardized patterns across the codebase
- **Performance**: Optimized builds and runtime performance
- **Maintainability**: Clear structure and documentation
- **Quality**: Automated testing and linting
- **Security**: Proper environment variable handling
- **Modern Patterns**: Next.js 14 App Router, React 18, and Zustand best practices
- **Anti-Pattern Prevention**: Clear guidance on what to avoid

All team members must follow these standards to maintain code quality and project scalability.