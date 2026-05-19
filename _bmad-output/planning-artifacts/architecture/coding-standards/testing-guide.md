# Testing Standards - Consolidated Guide

## Overview
Streamlined testing guide for disaster management PWA development. This is the single source of truth for all testing requirements.

## 🚨 Critical Rules (NO EXCEPTIONS)

### Framework Consistency
```yaml
testFramework: jest          # NEVER use Vitest
testEnvironment: jsdom
setupFilesAfterEnv: jest.setup.js
```

**FORBIDDEN PATTERNS** (will fail build):
- ❌ `vi.mock()` - Vitest syntax
- ❌ `beforeAll` without proper cleanup
- ❌ `@testing-library/react/vitest`
- ❌ `import { vi } from 'vitest'`

**REQUIRED PATTERNS**:
- ✅ `jest.mock()` - Jest syntax only
- ✅ `beforeEach` with cleanup
- ✅ `@testing-library/react`
- ❌ `import { jest } from '@jest/globals'`

### Test Data Strategy
```typescript
// UNIT TESTS: Mock UI components, NOT business logic
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

// INTEGRATION TESTS: Real database, seeded data
// NO mocking of API endpoints or database operations

// E2E TESTS: Real browser, real database, real user flows
// ABSOLUTELY NO mocking
```

## 📁 Test Organization

```
tests/
├── unit/                    # Component + logic tests (Jest + RTL)
│   ├── components/         # UI component tests
│   ├── hooks/              # Custom hook tests  
│   ├── utils/              # Utility function tests
│   └── stores/             # Zustand store tests
├── integration/            # API + database tests (Jest + Supertest)
│   ├── api/                # Endpoint tests
│   ├── database/           # Schema + relationship tests
│   └── auth/               # Authentication flows
├── e2e/                    # User workflow tests (Playwright)
│   ├── donor/              # Donor journeys
│   ├── coordinator/        # Coordinator workflows
│   └── responder/          # Responder operations
└── fixtures/               # Test data + seeding scripts
    ├── users.ts            # User test data
    ├── commitments.ts      # Commitment test data
    └── database.ts         # Database seeding utilities
```

## 🧪 Test Patterns by Type

### 1. Unit Tests (Jest + React Testing Library)

**Purpose**: Component behavior, form validation, state management  
**Location**: `tests/unit/components/`  
**Pattern**: Mock UI components, test user interactions

```typescript
// tests/unit/components/commitments/CommitmentForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommitmentForm } from '@/components/donor/CommitmentForm';

// Mock UI components (NEVER mock business logic)
jest.mock('@/components/ui/select', () => ({
  SelectRoot: ({ children, onValueChange }: any) => <div onChange={onValueChange}>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value, onSelect }: any) => (
    <div onClick={() => onSelect && onSelect(value)}>{children}</div>
  ),
}));

// Mock React Hook Form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: fn => fn,
    formState: { errors: {} },
    setValue: jest.fn(),
    getValues: jest.fn(),
  }),
}));

describe('CommitmentForm', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    user = userEvent.setup();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CommitmentForm {...props} />
      </QueryClientProvider>
    );
  };

  it('validates required commitment fields', async () => {
    renderComponent();
    
    const submitButton = screen.getByRole('button', { name: /create commitment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/items are required/i)).toBeInTheDocument();
    });
  });

  it('handles entity selection with Radix UI pattern', async () => {
    renderComponent();
    
    const entitySelect = screen.getByRole('button', { name: /select entity/i });
    await user.click(entitySelect);
    await user.keyboard('{ArrowDown}{Enter}'); // Radix UI Select pattern

    await waitFor(() => {
      expect(screen.getByText(/Entity Hospital/i)).toBeInTheDocument();
    });
  });
});
```

### 2. Integration Tests (Jest + Supertest)

**Purpose**: API endpoints, database operations, authentication  
**Location**: `tests/integration/api/`  
**Pattern**: Real database with seeded data, NO API mocking

```typescript
// tests/integration/api/commitments.test.ts
import { GET, POST } from '@/app/api/v1/donors/[id]/commitments/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';

describe('Commitments API', () => {
  let testDonor: any;
  let testEntity: any;
  let testIncident: any;

  beforeAll(async () => {
    // Seed test data
    testDonor = await db.donor.create({
      data: { name: 'Test Donor', type: 'ORGANIZATION' }
    });
    
    testEntity = await db.entity.create({
      data: { name: 'Test Entity', type: 'FACILITY' }
    });
    
    testIncident = await db.incident.create({
      data: { 
        type: 'FLOOD', 
        description: 'Test Incident',
        location: 'Test Location',
        createdBy: 'test-user'
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await db.commitment.deleteMany({
      where: { donorId: testDonor.id }
    });
    await db.donor.delete({ where: { id: testDonor.id } });
    await db.entity.delete({ where: { id: testEntity.id } });
    await db.incident.delete({ where: { id: testIncident.id } });
  });

  beforeEach(async () => {
    // Mock authentication
    const { getServerSession } = require('next-auth');
    getServerSession.mockResolvedValue({
      user: { id: 'test-user', email: 'test@example.com' }
    });
  });

  describe('POST /api/v1/donors/[id]/commitments', () => {
    it('creates commitment with valid data', async () => {
      const commitmentData = {
        entityId: testEntity.id,
        incidentId: testIncident.id,
        items: [
          { name: 'Rice', unit: 'kg', quantity: 100 },
          { name: 'Blankets', unit: 'pieces', quantity: 50 }
        ],
        notes: 'Test commitment'
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/donors/${testDonor.id}/commitments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commitmentData)
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(2);

      // Verify in database
      const commitment = await db.commitment.findFirst({
        where: { donorId: testDonor.id }
      });
      expect(commitment).toBeTruthy();
      expect(commitment.status).toBe('PLANNED');
    });

    it('validates required fields', async () => {
      const invalidData = {
        entityId: testEntity.id,
        // Missing incidentId and items
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/donors/${testDonor.id}/commitments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData)
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
```

### 3. E2E Tests (Playwright)

**Purpose**: Complete user workflows, cross-component integration  
**Location**: `tests/e2e/`  
**Pattern**: Real browser, real database, full user journeys

```typescript
// tests/e2e/donor/commitment-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Donor Commitment Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as donor
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'donor@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/donor/dashboard');
  });

  test('complete commitment workflow', async ({ page }) => {
    // Step 1: Create new commitment
    await page.click('[data-testid=new-commitment-button]');
    
    // Fill commitment form
    await page.fill('[data-testid=commitment-title]', 'Food Supplies Commitment');
    await page.click('[data-testid=entity-select]');
    await page.keyboard('{ArrowDown}{Enter}'); // Select first entity
    
    // Add commitment items
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name]', 'Rice');
    await page.fill('[data-testid=item-quantity]', '100');
    await page.fill('[data-testid=item-unit]', 'kg');
    
    // Submit commitment
    await page.click('[data-testid=submit-commitment]');
    
    // Verify success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('text=Food Supplies Commitment')).toBeVisible();
    
    // Step 2: View commitment in dashboard
    await page.goto('/donor/commitments');
    await expect(page.locator('text=Food Supplies Commitment')).toBeVisible();
    await expect(page.locator('[data-testid=status-planned]')).toBeVisible();
    
    // Step 3: Update commitment status
    await page.click('[data-testid=commitment-card]:first-child');
    await page.click('[data-testid=update-status-button]');
    await page.selectOption('[data-testid-status-select]', 'PARTIAL');
    await page.fill('[data-testid=delivered-quantity]', '50');
    await page.click('[data-testid-save-update]');
    
    // Verify status update
    await expect(page.locator('[data-testid=status-partial]')).toBeVisible();
  });

  test('validates commitment form inputs', async ({ page }) => {
    await page.click('[data-testid=new-commitment-button]');
    
    // Try to submit empty form
    await page.click('[data-testid=submit-commitment]');
    
    // Should show validation errors
    await expect(page.locator('text=Entity is required')).toBeVisible();
    await expect(page.locator('text=At least one item is required')).toBeVisible();
    
    // Add item without quantity
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name]', 'Blankets');
    await page.click('[data-testid=submit-commitment]');
    
    await expect(page.locator('text=Quantity is required')).toBeVisible();
  });

  test('role-based access control', async ({ page, context }) => {
    // Donor can only see their own commitments
    await page.goto('/donor/commitments');
    await expect(page.locator('[data-testid=commitment-list]')).toBeVisible();
    
    // Try to access coordinator endpoint (should fail)
    const response = await context.request.get('/api/v1/coordinator/assignments');
    expect(response.status()).toBe(401); // Unauthorized
  });
});
```

## 🔧 Development Workflow

### Pre-Story Implementation (MANDATORY)
```bash
# 1. Validate system health
bash scripts/validate-pre-story.sh
npm run validate:schema

# 2. Check framework consistency
grep -r "vi\.mock" tests/  # Must return nothing

# 3. Install dependencies if needed
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom supertest
```

### During Story Implementation
```typescript
// 1. Unit Tests: Component behavior with UI mocks
// 2. Integration Tests: API endpoints with real database
// 3. E2E Tests: Complete user workflows
// 4. Use ONLY Jest syntax (never Vitest)
```

### Post-Implementation Validation (MANDATORY)
```bash
# 1. Run all test suites
npm run test:unit
npm run test:e2e
npm run validate:schema

# 2. Validate framework consistency
grep -r "vi\.mock" tests/  # Must return nothing

# 3. Check coverage
npm run test:coverage  # Must meet 80% thresholds
```

## 📋 Story-Specific Test Templates

### Commitment Management (Story 5.2) Test Requirements:
- [ ] Unit tests for CommitmentForm component
- [ ] Unit tests for CommitmentDashboard component  
- [ ] Integration tests for commitment CRUD APIs
- [ ] E2E tests for complete donor commitment workflow
- [ ] Role-based access control tests (donor vs coordinator)
- [ ] Database validation tests for DonorCommitment model

This consolidated guide replaces all conflicting test documentation. Use this as the single source of truth for all testing requirements.