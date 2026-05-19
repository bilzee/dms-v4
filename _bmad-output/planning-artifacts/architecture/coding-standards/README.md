# Coding Standards Index

## Overview

This document provides a complete index of the Disaster Management PWA coding standards, organized into focused shards for optimal context usage.

## 📁 Sharded Structure

The coding standards have been sharded into focused files (~8-12KB each) to optimize context usage in AI agents and development tools.

### 📋 Shards Available

| Shard | File | Size | Focus | When to Load |
|-------|------|------|--------|--------------|
| 1️⃣ | `01-core-typescript.md` | ~10KB | TypeScript, file organization, imports | General development, type issues |
| 2️⃣ | `02-react-nextjs.md` | ~12KB | React components, Next.js App Router | Component development, routing issues |
| 3️⃣ | `03-state-performance.md` | ~11KB | Zustand, TanStack Query, performance | State management, performance optimization |
| 4️⃣ | `04-database-api.md` | ~13KB | Prisma, Supabase, API routes | Database work, API development |
| 5️⃣ | `05-testing.md` | ~12KB | Testing patterns, Jest, Playwright | Writing tests, test failures |
| 6️⃣ | `06-anti-patterns.md` | ~11KB | Common anti-patterns to avoid | Code reviews, debugging issues |

---

## 🎯 Quick Reference Guide

### **For General Development**
- Load: `01-core-typescript.md`
- Covers: TypeScript configuration, file organization, imports, styling

### **For Component Development**
- Load: `02-react-nextjs.md`
- Covers: Server/client components, forms, event handlers, Next.js patterns

### **For State Management Issues**
- Load: `03-state-performance.md`
- Covers: Zustand patterns, TanStack Query, performance optimization, PWA patterns

### **For Database/API Work**
- Load: `04-database-api.md`
- Covers: Prisma schema, Supabase integration, API routes, transactions

### **For Testing**
- Load: `05-testing.md`
- Covers: Unit tests, integration tests, E2E testing, testing setup

### **For Code Reviews/Debugging**
- Load: `06-anti-patterns.md`
- Covers: Common anti-patterns, security issues, performance problems

---

## 🔍 Topic-Specific Loading

### **TypeScript Issues**
```typescript
// Load: 01-core-typescript.md
// Sections: TypeScript Standards, Runtime Validation with Zod
```

### **Component Architecture**
```typescript
// Load: 02-react-nextjs.md
// Sections: Component Structure, Modern React Patterns, Server Components
```

### **State Management**
```typescript
// Load: 03-state-performance.md
// Sections: Store Structure, State Orchestration, Performance Standards
```

### **Database Work**
```typescript
// Load: 04-database-api.md
// Sections: Schema Design, Database Connection, API Response Types
```

### **Testing Strategy**
```typescript
// Load: 05-testing.md
// Sections: Unit Tests, Integration Tests, Server Component Testing
```

### **Performance Optimization**
```typescript
// Load: 03-state-performance.md + 06-anti-patterns.md
// Sections: Performance Standards, Performance Anti-patterns
```

### **Security**
```typescript
// Load: 06-anti-patterns.md
// Sections: Environment Variable Anti-patterns, Security Anti-patterns
```

---

## 📊 Shard Contents Summary

### **01 - Core & TypeScript Standards** (~10KB)
- TypeScript strict configuration
- Type definitions and interfaces
- File organization patterns
- Import/export standards
- Styling with Tailwind CSS
- Error handling patterns

### **02 - React & Next.js Patterns** (~12KB)
- Next.js App Router conventions
- Server vs Client components
- Environment variable security
- React component patterns
- Modern form handling (React Hook Form + Zod)
- Event handling patterns

### **03 - State Management & Performance** (~11KB)
- Zustand store patterns
- Shallow comparison usage
- State orchestration (Zustand + TanStack Query)
- Performance optimization
- PWA-specific standards
- Code splitting and memoization

### **04 - Database & API Standards** (~13KB)
- Prisma + Supabase integration
- Schema design best practices
- Database connection and pooling
- Row-Level Security (RLS)
- Database transactions
- API route patterns and error handling

### **05 - Testing Standards** (~12KB)
- Unit testing with React Testing Library
- Integration testing for APIs
- Server component testing
- Zustand store testing
- E2E testing with Playwright
- Testing setup and configuration

### **06 - Anti-Patterns** (~11KB)
- State management anti-patterns
- Component anti-patterns
- Server component anti-patterns
- Performance anti-patterns
- TypeScript anti-patterns
- Form anti-patterns
- Security anti-patterns

---

## 🚀 Usage Recommendations

### **For AI Agents (Dev/QA)**
1. **Load relevant shard only** based on current task
2. **Start with anti-patterns shard** when debugging issues
3. **Use core-typescript shard** for general development questions
4. **Combine shards** only when absolutely necessary (max 2-3 shards)

### **For Code Reviews**
1. Always load **06-anti-patterns.md** first
2. Add specific shard based on code being reviewed
3. Example: Reviewing React component → Load anti-patterns + React/Next.js shard

### **For Onboarding**
1. Start with **01-core-typescript.md** for foundation
2. Progress through **02-react-nextjs.md** for component patterns
3. Cover **03-state-performance.md** for state management
4. Review **06-anti-patterns.md** for what to avoid

### **For Performance Issues**
1. Load **03-state-performance.md** for optimization patterns
2. Load **06-anti-patterns.md** for performance anti-patterns
3. Check **04-database-api.md** if database-related performance

### **For Bug Fixing**
1. Load **06-anti-patterns.md** to identify common issues
2. Load specific shard related to problematic area
3. Load **05-testing.md** if test-related bug

---

## 📈 Benefits of Sharding

### **Context Optimization**
- **Before**: 63KB single document (~25% of 200k context)
- **After**: 8-13KB per shard (~4-6% of context)
- **Result**: 4-6x more context available for other tools

### **Relevance Improvement**
- Load only relevant standards for current task
- Faster AI responses due to focused context
- Better code suggestions due to specialized content

### **Maintainability**
- Easier to update specific sections
- Clear ownership of different domains
- Reduced merge conflicts

### **Developer Experience**
- Quick reference for specific problems
- Better searchability
- Focused learning paths

---

## 🔗 Quick Access Commands

```bash
# Quick access commands for common tasks
coding-standards core     # Load core TypeScript standards
coding-standards react    # Load React/Next.js patterns  
coding-standards state    # Load state management patterns
coding-standards db       # Load database/API standards
coding-standards test     # Load testing patterns
coding-standards anti     # Load anti-patterns (most useful for debugging)
```

---

## 📝 Maintenance Notes

### **Adding New Standards**
1. Determine which shard best fits the new content
2. Keep shard size under 15KB when possible
3. Update this index file with new content
4. Consider if new shard is needed if content grows

### **Updating Existing Content**
1. Edit specific shard file directly
2. Update index if major sections change
3. Maintain consistent formatting across shards

### **Version Control**
- Each shard is independently versionable
- Major updates should increment shard version
- Index file should track shard versions

---

## 🎯 Summary

The sharded coding standards provide:
- **Optimized Context Usage**: Load only what you need (8-13KB vs 63KB)
- **Focused Content**: Each shard targets specific development areas
- **Quick Access**: Fast reference for common problems and patterns
- **Better Performance**: Faster AI responses and better suggestions
- **Maintainable Structure**: Easy to update and extend individual sections

**Recommendation**: Always start with the anti-patterns shard when debugging, then load the specific shard relevant to your task.