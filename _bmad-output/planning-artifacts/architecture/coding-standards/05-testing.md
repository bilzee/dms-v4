# Testing Standards

## Overview

Comprehensive testing strategy covering unit tests, integration tests, server component testing, store testing, and end-to-end patterns for the Disaster Management PWA.

## 1. Unit Tests

### Component Testing
```typescript
// __tests__/components/AssessmentForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssessmentForm } from '@/components/forms/assessment/AssessmentForm';

describe('AssessmentForm', () => {
  let queryClient: QueryClient;
  let mockOnSubmit: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockOnSubmit = jest.fn();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AssessmentForm onSubmit={mockOnSubmit} {...props} />
      </QueryClientProvider>
    );
  };

  it('renders assessment form fields', () => {
    renderComponent();
    
    expect(screen.getByLabelText(/assessment title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/assessment type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    
    renderComponent();

    await user.type(screen.getByLabelText(/assessment title/i), 'Test Assessment');
    await user.selectOptions(screen.getByLabelText(/assessment type/i), 'RAPID');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'HIGH');
    
    await user.click(screen.getByRole('button', { name: /submit assessment/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Assessment',
          type: 'RAPID',
          priority: 'HIGH'
        })
      );
    });
  });

  it('handles submission errors', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockRejectedValue(new Error('Submission failed'));
    
    renderComponent({ isLoading: false });

    await user.type(screen.getByLabelText(/assessment title/i), 'Test Assessment');
    await user.click(screen.getByRole('button', { name: /submit assessment/i }));

    await waitFor(() => {
      expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
    });
  });
});
```

### Utility Function Testing
```typescript
// __tests__/utils/format.test.ts
import { formatDate, formatPriority } from '@/lib/utils/format';

describe('Format Utils', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toBe('Jan 15, 2024');
    });

    it('handles invalid dates', () => {
      expect(formatDate(null)).toBe('Invalid date');
      expect(formatDate(undefined)).toBe('Invalid date');
    });
  });

  describe('formatPriority', () => {
    it('formats priority values', () => {
      expect(formatPriority('HIGH')).toBe('High Priority');
      expect(formatPriority('LOW')).toBe('Low Priority');
    });

    it('handles unknown priorities', () => {
      expect(formatPriority('UNKNOWN')).toBe('Unknown');
    });
  });
});
```

## 2. Integration Tests

### API Route Testing
```typescript
// __tests__/api/assessments.test.ts
import { GET, POST } from '@/app/api/v1/assessments/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';

// Mock database
jest.mock('@/lib/db/client', () => ({
  db: {
    assessment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    }
  }
}));

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

describe('/api/v1/assessments', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns assessments for authenticated user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockAssessments = [
        { id: '1', title: 'Assessment 1', userId: 'user-1' },
        { id: '2', title: 'Assessment 2', userId: 'user-1' }
      ];

      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({ user: mockUser });

      (db.assessment.findMany as jest.Mock).mockResolvedValue(mockAssessments);

      const request = new NextRequest('http://localhost:3000/api/v1/assessments');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('returns 401 for unauthenticated requests', async () => {
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/v1/assessments');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST', () => {
    it('creates assessment with valid data', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const newAssessment = {
        id: '3',
        title: 'New Assessment',
        type: 'RAPID',
        priority: 'HIGH',
        userId: 'user-1'
      };

      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({ user: mockUser });

      (db.assessment.create as jest.Mock).mockResolvedValue(newAssessment);

      const assessmentData = {
        title: 'New Assessment',
        type: 'RAPID',
        priority: 'HIGH'
      };

      const request = new NextRequest('http://localhost:3000/api/v1/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentData)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe(assessmentData.title);
    });

    it('validates required fields', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({ user: mockUser });

      const invalidData = {
        type: 'RAPID'
        // Missing required title
      };

      const request = new NextRequest('http://localhost:3000/api/v1/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });
});
```

## 3. Server Component Testing

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

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
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

  it('handles database errors gracefully', async () => {
    (db.assessment.findMany as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Should throw error that gets caught by error boundary
    await expect(AssessmentPage()).rejects.toThrow();
  });

  it('redirects unauthenticated users', async () => {
    const { getServerSession } = require('next-auth');
    getServerSession.mockResolvedValue(null);

    // Should redirect to login
    await expect(AssessmentPage()).rejects.toThrow();
  });
});
```

## 4. Zustand Store Testing

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

  it('manages loading state correctly', async () => {
    const { authService } = require('@/lib/auth/service');
    authService.signIn.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isLoading).toBe(false);

    const signInPromise = act(async () => {
      await result.current.signIn({ email: 'test@example.com', password: 'password' });
    });

    // Should be loading during async operation
    expect(result.current.isLoading).toBe(true);

    await signInPromise;

    expect(result.current.isLoading).toBe(false);
  });
});
```

## 5. Component Integration Testing

```typescript
// __tests__/components/AssessmentCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockOnSelect = jest.fn();
    mockOnEdit = jest.fn();
    mockOnDelete = jest.fn();
    user = userEvent.setup();
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

  it('calls onSelect when card is clicked', async () => {
    const assessment = {
      id: '1',
      title: 'Test Assessment',
      status: 'PENDING',
      createdAt: new Date()
    };

    renderComponent(assessment);

    await user.click(screen.getByText('Test Assessment'));
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
    await user.click(editButton);

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
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this assessment?'
    );

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('does not delete when confirmation is cancelled', async () => {
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => false);

    const assessment = {
      id: '1',
      title: 'Test Assessment',
      status: 'PENDING',
      createdAt: new Date()
    };

    renderComponent(assessment);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });
});
```

## 6. E2E Testing Patterns

```typescript
// tests/e2e/assessment-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Assessment Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'assessor@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('can create new assessment', async ({ page }) => {
    await page.click('[data-testid=new-assessment-button]');
    
    // Fill form
    await page.fill('[data-testid=assessment-title]', 'Flood Damage Assessment');
    await page.selectOption('[data-testid=assessment-type]', 'RAPID');
    await page.selectOption('[data-testid=priority]', 'HIGH');
    await page.fill('[data-testid=description]', 'Initial assessment of flood-affected areas');
    
    // Submit
    await page.click('[data-testid=submit-button]');
    
    // Verify success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('text=Flood Damage Assessment')).toBeVisible();
  });

  test('can view and edit existing assessment', async ({ page }) => {
    // Navigate to assessments
    await page.click('[data-testid=assessments-link]');
    
    // Click first assessment
    await page.click('[data-testid=assessment-card]:first-child');
    
    // Verify details
    await expect(page.locator('[data-testid=assessment-title]')).toContainText('Rapid Needs Assessment');
    
    // Edit assessment
    await page.click('[data-testid=edit-button]');
    await page.fill('[data-testid=assessment-title]', 'Updated Assessment Title');
    await page.click('[data-testid=save-button]');
    
    // Verify update
    await expect(page.locator('[data-testid=assessment-title]')).toContainText('Updated Assessment Title');
  });

  test('validates form inputs', async ({ page }) => {
    await page.click('[data-testid=new-assessment-button]');
    
    // Try to submit empty form
    await page.click('[data-testid=submit-button]');
    
    // Should show validation errors
    await expect(page.locator('text=Title is required')).toBeVisible();
    await expect(page.locator('text=Assessment type is required')).toBeVisible();
    
    // Fill valid data
    await page.fill('[data-testid=assessment-title]', 'Valid Assessment');
    await page.selectOption('[data-testid=assessment-type]', 'RAPID');
    
    // Errors should disappear
    await expect(page.locator('text=Title is required')).not.toBeVisible();
  });
});
```

## 7. Testing Setup and Configuration

```typescript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/not-found.tsx',
    '!src/app/**/error.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

```typescript
// jest.setup.js
import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

---

## 8. Framework Consistency & Quality Gates

### Critical Validation Rules

#### Framework Consistency
```yaml
# Project uses Jest (NOT Vitest) - Enforce this strictly
testFramework: jest
testEnvironment: jsdom
setupFilesAfterEnv: jest.setup.js
```

**Common Framework Errors to Avoid:**
- ❌ Using `vi.mock()` (Vitest syntax) → ✅ Use `jest.mock()`
- ❌ Using `beforeAll` without proper cleanup → ✅ Use `beforeEach` with cleanup
- ❌ Importing `@testing-library/react/vitest` → ✅ Use `@testing-library/react`

#### Component Integration Standards
```typescript
// ✅ CORRECT: React Hook Form + Radix UI integration
jest.mock('@radix-ui/react-select', () => ({
  SelectRoot: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value, onSelect }: any) => (
    <div onClick={() => onSelect && onSelect(value)}>{children}</div>
  ),
}));

// ✅ CORRECT: React Hook Form field prop support
jest.mock('@/components/ui/input', () => ({
  Input: ({ className, ...props }: any) => <input className={className} {...props} />,
}));
```

#### Pre-Story Validation Checklist
```markdown
## Before Story Implementation
- [ ] Jest configuration loaded and verified
- [ ] React Hook Form mock patterns reviewed
- [ ] Radix UI component mocks verified
- [ ] Testing framework consistency confirmed

## During Story Implementation  
- [ ] Unit tests use `jest.mock()` not `vi.mock()`
- [ ] Component mocks support `{...field}` props
- [ ] E2E tests use Playwright patterns
- [ ] Form validation tested with user interactions

## After Story Implementation
- [ ] Run `npm run test:unit` - all pass
- [ ] Run `npm run test:e2e` - all pass  
- [ ] Check test coverage meets thresholds
- [ ] Validate framework consistency across all tests
```

#### Context Loading Strategy for Testing
```markdown
## Testing Context Maintenance
When context becomes compacted during story implementation:

1. **Reload Testing Standards**: Always reload `05-testing.md` before implementing tests
2. **Verify Framework Configuration**: Check jest.config.js matches examples
3. **Review Component Mock Patterns**: Ensure UI mocks support React Hook Form
4. **Validate E2E Patterns**: Check Playwright tests follow project patterns

### Implementation Commands
```bash
# Before implementing tests (reload context)
# Load: docs/architecture/coding-standards/05-testing.md

# Validate framework consistency
grep -r "vi\.mock" tests/ # Should return nothing
grep -r "jest\.mock" tests/ # Should show mock usage

# Run validation
npm run validate:schema
npm run test:unit
npm run test:e2e
```

#### React Hook Form Integration Patterns
```typescript
// ✅ CORRECT: Testing React Hook Form with Radix UI
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';

// Mock Radix UI Select with proper form integration
jest.mock('@radix-ui/react-select', () => ({
  SelectRoot: ({ children, onValueChange }: any) => <div onChange={onValueChange}>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value, onSelect }: any) => (
    <div onClick={() => onSelect && onSelect(value)}>{children}</div>
  ),
}));

// Test form validation properly
it('validates form submission with React Hook Form', async () => {
  const user = userEvent.setup();
  render(<DonorRegistrationForm />);
  
  // Fill required fields
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /country/i }));
  await user.keyboard('{ArrowDown}{Enter}'); // Radix UI Select pattern
  
  // Submit form
  await user.click(screen.getByRole('button', { name: /create account/i }));
  
  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      country: 'US'
    }));
  });
});
```

---

## Summary

These testing standards ensure:
- **Comprehensive Coverage**: Unit, integration, and E2E testing patterns
- **Component Testing**: React Testing Library best practices
- **API Testing**: Database integration and authentication testing
- **State Testing**: Zustand store testing patterns
- **Server Component Testing**: Next.js App Router testing
- **Real-world Scenarios**: User workflow testing with Playwright
- **Framework Consistency**: Jest enforcement, no Vitest syntax mixing
- **Quality Gates**: Coverage thresholds and validation standards
- **Context Loading**: Strategies for maintaining testing standards in compacted sessions
- **Component Integration**: React Hook Form + Radix UI testing patterns