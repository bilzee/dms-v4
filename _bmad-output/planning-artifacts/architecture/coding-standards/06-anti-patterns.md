# Critical Anti-Patterns to Avoid

## Overview

This document outlines common anti-patterns and their solutions to prevent performance issues, security vulnerabilities, and maintenance problems in the Disaster Management PWA codebase.

## 1. State Management Anti-Patterns

### ❌ Mixing Server and Client State

```typescript
// ❌ ANTI-PATTERN: Storing server data in Zustand
const useMixedStore = create((set) => ({
  // Server data - should be in TanStack Query
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

### ❌ Object Selectors Without Shallow

```typescript
// ❌ ANTI-PATTERN: Causes unnecessary re-renders
const { user, profile, settings } = useAuthStore((state) => ({ 
  user: state.user, 
  profile: state.profile,
  settings: state.settings 
})); // Re-renders on ANY store change

// ✅ CORRECT: Use shallow for object selectors
import { shallow } from 'zustand/shallow';

const { user, profile, settings } = useAuthStore(
  (state) => ({ 
    user: state.user, 
    profile: state.profile,
    settings: state.settings 
  }),
  shallow // Only re-renders when these specific values change
);
```

### ❌ Monolithic Store Design

```typescript
// ❌ ANTI-PATTERN: Single giant store
interface GiantStore {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  
  // Assessments (server data - should be in TanStack Query)
  assessments: Assessment[];
  currentAssessment: Assessment | null;
  
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  modals: {
    createAssessment: boolean;
    editUser: boolean;
    deleteConfirmation: boolean;
  };
  
  // Filters
  assessmentFilters: AssessmentFilters;
  userFilters: UserFilters;
  
  // 50+ more properties...
}

// ✅ CORRECT: Separate stores by domain
// stores/auth.store.ts - Authentication only
// stores/ui.store.ts - UI state only  
// stores/filters.store.ts - Filter state only
// Server data in TanStack Query hooks
```

## 2. Component Anti-Patterns

### ❌ Prop Drilling

```typescript
// ❌ ANTI-PATTERN: Passing props through many levels
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
```

### ❌ useEffect for Data Fetching

```typescript
// ❌ ANTI-PATTERN: Manual data fetching with useEffect
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
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
  
  if (isLoading) return 'Loading...';
  if (error) return 'Error loading user';
  
  return <div>{user.name}</div>;
}
```

### ❌ Missing Memoization

```typescript
// ❌ ANTI-PATTERN: Expensive calculations on every render
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

// ✅ CORRECT: Memoize expensive calculations
function ExpensiveComponent({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('');
  
  // ✅ Memoized calculation
  const filteredItems = useMemo(() => 
    items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    ), [items, filter])
  );
  
  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      {filteredItems.map(item => <Item key={item.id} item={item} />)}
    </div>
  );
}
```

## 3. Server Component Anti-Patterns

### ❌ React Hooks in Server Components

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

### ❌ Secrets in Client Components

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

## 4. Performance Anti-Patterns

### ❌ Large Bundle Imports

```typescript
// ❌ ANTI-PATTERN: Importing entire libraries
import _ from 'lodash'; // 🚨 entire library (600KB+)
import { Chart } from 'chart.js'; // 🚨 all chart types
import * as Icons from 'lucide-react'; // 🚨 all icons

// ✅ CORRECT: Tree-shakeable imports
import { debounce } from 'lodash-es/debounce'; // ~5KB
import { Line } from 'react-chartjs-2'; // Specific chart type
import { Search, Menu, X } from 'lucide-react'; // Only needed icons
```

### ❌ Inefficient Re-renders

```typescript
// ❌ ANTI-PATTERN: Creating new objects/arrays in renders
function ParentComponent() {
  const [data, setData] = useState([]);
  
  return (
    <div>
      {/* ❌ New array on every render causes child re-render */}
      <ChildComponent items={data.map(item => ({ ...item, processed: true }))} />
      
      {/* ❌ New object on every render */}
      <ChildComponent config={{ theme: 'dark', mode: 'edit' }} />
    </div>
  );
}

// ✅ CORRECT: Memoize props
function ParentComponent() {
  const [data, setData] = useState([]);
  
  // ✅ Memoize processed data
  const processedItems = useMemo(() => 
    data.map(item => ({ ...item, processed: true })), [data]
  );
  
  // ✅ Memoize config object
  const config = useMemo(() => ({ 
    theme: 'dark', 
    mode: 'edit' 
  }), []);
  
  return (
    <div>
      <ChildComponent items={processedItems} />
      <ChildComponent config={config} />
    </div>
  );
}
```

## 5. TypeScript Anti-Patterns

### ❌ Using `any` Type

```typescript
// ❌ ANTI-PATTERN: Using any loses type safety
function processData(data: any): any {
  return data.map((item: any) => ({ 
    id: item.id, 
    name: item.name 
  }));
}

// ✅ CORRECT: Proper typing with validation
interface Item {
  id: string;
  name: string;
}

function processData(data: unknown[]): Item[] {
  // Validate with Zod or runtime checks
  const items = data as Item[];
  return items.map(item => ({ 
    id: item.id, 
    name: item.name 
  }));
}

// Even better with Zod validation
const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

function processValidatedData(data: unknown): Item[] {
  const result = ItemSchema.array().safeParse(data);
  if (!result.success) {
    throw new Error('Invalid data format');
  }
  return result.data;
}
```

### ❌ Type Assertions Without Validation

```typescript
// ❌ ANTI-PATTERN: Dangerous type assertions
const user = userData as User; // 🚨 No runtime validation
const assessments = data as Assessment[]; // 🚨 Could crash at runtime

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

// Usage
const user = parseUser(userData);
if (!user) {
  throw new Error('Invalid user data');
}
```

## 6. Form Anti-Patterns

### ❌ Manual Form State Management

```typescript
// ❌ ANTI-PATTERN: Manual form state and validation
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
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Password must be 8+ characters';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // ❌ No schema validation or type safety
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
    // ✅ Type-safe validated data
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

## 7. Database Anti-Patterns

### ❌ N+1 Query Problem

```typescript
// ❌ ANTI-PATTERN: N+1 queries
async function getUsersWithAssessments() {
  const users = await db.user.findMany(); // 1 query
  
  // ❌ N additional queries (one per user)
  const usersWithAssessments = await Promise.all(
    users.map(async user => {
      const assessments = await db.assessment.findMany({
        where: { userId: user.id }
      });
      return { ...user, assessments };
    })
  );
  
  return usersWithAssessments;
}

// ✅ CORRECT: Use include for efficient queries
async function getUsersWithAssessments() {
  // ✅ Single query with joins
  return await db.user.findMany({
    include: {
      assessments: {
        orderBy: { createdAt: 'desc' },
        take: 10 // Limit if needed
      }
    }
  });
}
```

### ❌ Missing Database Indexes

```prisma
// ❌ ANTI-PATTERN: No indexes on queried fields
model Assessment {
  id        String @id @default(cuid())
  title     String
  status    String // Queried frequently but no index
  userId    String // Foreign key with no index
  createdAt DateTime @default(now())
}

// ✅ CORRECT: Add indexes for performance
model Assessment {
  id        String @id @default(cuid())
  title     String
  status    String
  
  userId    String
  
  createdAt DateTime @default(now())
  
  // ✅ Add indexes
  @@index([userId])      // Foreign key lookup
  @@index([status])      // Status filtering
  @@index([createdAt])   // Date range queries
  @@index([status, createdAt]) // Composite index for common queries
}
```

## 8. Security Anti-Patterns

### ❌ Client-Side Authorization

```typescript
// ❌ ANTI-PATTERN: Authorization checks only on client
function AdminPanel() {
  const { user } = useAuthStore();
  
  if (user?.role !== 'ADMIN') {
    return <div>Access denied</div>; // 🚨 Can be bypassed
  }
  
  return <div>Admin controls...</div>;
}

// ✅ CORRECT: Server-side authorization
// API route
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Server-side data fetching
  const data = await getAdminData();
  return NextResponse.json({ data });
}

// Client component
function AdminPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-data'],
    queryFn: () => fetch('/api/admin').then(res => res.json()),
    // Will fail with 401 if not admin
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Access denied</div>;
  
  return <div>Admin controls...</div>;
}
```

---

## Summary

Avoiding these anti-patterns ensures:
- **Performance**: Optimized re-renders and efficient data fetching
- **Security**: Proper server-side validation and authorization
- **Maintainability**: Clean separation of concerns and type safety
- **Scalability**: Efficient database queries and bundle optimization
- **User Experience**: Fast loading times and responsive interactions