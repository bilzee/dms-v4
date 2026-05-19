# React Components & Next.js App Router

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

#### **✅ Recommended Pattern: Manual Role Check**
This pattern works with Next.js 14.2.5 and is compatible with async route params.

```typescript
// app/api/v1/assessments/[id]/verify/route.ts

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { user, roles } = context;
  
  if (!roles.includes('COORDINATOR')) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Insufficient permissions. Coordinator role required.' 
      }, 
      { status: 403 }
    );
  }
  
  const { id } = context.params.id; // Direct param access - works with Next.js 14.2.5
  const body = await request.json();
  const validatedData = verifyAssessmentSchema.parse(body);
  
  // ... implementation
});
```

#### **⚠️ Deprecated: Decorator Pattern**
The decorator pattern shown below is **incompatible with Next.js 14.2.5 async params** and should not be used.

```typescript
// ❌ DEPRECATED - Broken with Next.js 14.2.5
export const POST = withAuth(requireRole('COORDINATOR')(async (request, context, { params }) => {
  // This pattern fails due to async params incompatibility
}));
```

#### **Role-Based Authorization Examples**
This pattern provides clear, working examples that are compatible with Next.js 14.2.5.

```typescript
// Multiple role check
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { roles } = context;
  
  const allowedRoles = ['COORDINATOR', 'ADMIN'];
  if (!allowedRoles.some(role => roles.includes(role))) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Coordinator or Admin role required.' },
      { status: 403 }
    );
  }
  
  // ... implementation
});

// Permission-based check
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { permissions } = context;
  
  if (!permissions.includes('VERIFY_ASSESSMENT')) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Verify Assessment permission required.' },
      { status: 403 }
    );
  }
  
  // ... implementation
});
```

#### **Basic API Route (Legacy Pattern)**
For simple APIs without role-based access control:

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

### 4. Event Handlers

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

## Summary

These React and Next.js standards ensure:
- **Server-First Architecture**: Proper use of Server vs Client Components
- **Security**: Correct environment variable handling
- **Performance**: Optimized data fetching and caching
- **Type Safety**: Strong TypeScript integration
- **Modern Patterns**: React Hook Form, Zod validation, Radix UI integration