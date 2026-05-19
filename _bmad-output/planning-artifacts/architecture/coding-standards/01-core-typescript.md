# TypeScript & Core Standards

## Document Information
- **Version**: 1.0
- **Last Updated**: 2025-01-06
- **Purpose**: Core TypeScript and coding standards for Disaster Management PWA
- **Tech Stack**: Next.js 14, TypeScript, Shadcn/ui, Zustand, PostgreSQL/Prisma, IndexedDB

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

### 4. Runtime Validation with Zod
```typescript
import { z } from 'zod';

// ✅ Schema-based validation
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['assessor', 'coordinator', 'responder', 'donor', 'admin']),
  createdAt: z.date(),
});

type User = z.infer<typeof UserSchema>;

// ✅ Safe parsing
function parseUser(data: unknown): User | null {
  const result = UserSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

---

## File Organization

### 1. Component Files
```
components/forms/assessment/AssessmentForm/
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

## Error Handling

### 1. Error Types
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

### 2. Error Boundaries
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

---

## Summary

These core standards ensure:
- **Type Safety**: Strict TypeScript configuration
- **Organization**: Clear file and import structure
- **Consistency**: Standardized patterns across the codebase
- **Quality**: Proper error handling and validation