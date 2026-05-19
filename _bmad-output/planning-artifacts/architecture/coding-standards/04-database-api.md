# Database & API Standards

## Prisma + Supabase Integration

### 1. Schema Design Best Practices

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

### 2. Database Connection and Pooling

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

### 3. Row-Level Security (RLS) Integration

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

### 4. Database Transactions

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

### 5. Database Migrations and Seeding

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

---

## API Response Types

### 1. Standard API Responses

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

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  statusCode: number;
}
```

### 2. Error Handling

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

// Usage in API routes
export async function GET(request: NextRequest) {
  try {
    // API logic
    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ApiError) {
      return NextResponse.json(
        handleApiError(error),
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3. API Route Patterns

```typescript
// app/api/v1/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { secureQueries } from '@/lib/db/rls';
import { ApiError } from '@/lib/api/error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      throw new ApiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const assessments = await secureQueries.getAssessments(session.user.id);
    
    // Apply filters
    let filteredAssessments = assessments;
    if (status && status !== 'all') {
      filteredAssessments = assessments.filter(a => a.status === status);
    }

    // Pagination
    const total = filteredAssessments.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedAssessments = filteredAssessments.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedAssessments,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    
    console.error('Assessments API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      throw new ApiError('Unauthorized', 401);
    }

    const body = await request.json();
    
    // Validate input
    if (!body.title || !body.type) {
      throw new ApiError('Title and type are required', 400);
    }

    const assessment = await secureQueries.createAssessment(body, session.user.id);
    
    return NextResponse.json({
      success: true,
      data: assessment,
      message: 'Assessment created successfully'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    
    console.error('Create assessment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4. Validation Middleware

```typescript
// lib/api/validation.ts
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      
      return await handler(validatedData, request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, { status: 400 });
      }
      
      throw error;
    }
  };
}

// Usage
const createAssessmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['RAPID', 'COMPREHENSIVE', 'FOLLOW_UP', 'SECURITY', 'HEALTH']),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const POST = withValidation(
  createAssessmentSchema,
  async (data, request) => {
    // Handle validated data
    const session = await getServerSession();
    // ... rest of implementation
  }
);
```

---

## Enum Usage Pattern

**CRITICAL**: Keep enums in schema, use string literals in code to avoid monorepo import issues.

### Schema (Keep Enums)
```prisma
enum AssessmentType {
  HEALTH
  WASH
  SHELTER
  FOOD
  SECURITY
  POPULATION
}
```

### Application Code (Use String Literals)
```typescript
// ❌ DON'T import enums
import { AssessmentType } from '@prisma/client';
const type = AssessmentType.WASH; // Causes monorepo issues

// ✅ USE string literals
const type = 'WASH'; // Works reliably
```

### Validation with Zod
```typescript
export const ASSESSMENT_TYPES = [
  'HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'
] as const;

export const assessmentTypeSchema = z.enum(ASSESSMENT_TYPES);

// API route validation
export const createAssessmentSchema = z.object({
  type: assessmentTypeSchema,
  title: z.string().min(1),
});
```

### Database Operations
```typescript
// Prisma handles string literals automatically
const assessment = await db.rapidAssessment.create({
  data: {
    rapidAssessmentType: 'WASH', // String literal -> enum conversion
  }
});
```

### Benefits
- **Database Integrity**: Enums maintain consistency
- **Monorepo Compatible**: No import resolution issues
- **Type Safe**: Zod validation at boundaries

---

## Summary

These database and API standards ensure:
- **Database Health**: Proper connection pooling and health checks
- **Security**: Row-Level Security and proper permission checks
- **Reliability**: Transaction support with retry logic
- **Performance**: Optimized queries and proper indexing
- **API Consistency**: Standardized response formats and error handling
- **Data Integrity**: Comprehensive validation and type safety
- **Monorepo Compatibility**: Enum usage pattern prevents import issues