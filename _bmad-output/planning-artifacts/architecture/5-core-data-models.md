# 5. Core Data Models

### 5.1 LLM Implementation Notes

**Type Generation Strategy:**
1. Prisma schema is the **single source of truth** for database structure
2. Run `npx prisma generate` to create TypeScript types automatically
3. Share domain types through `src/types/` for frontend-backend consistency
4. Use Zod schemas for runtime validation that mirror Prisma types
5. Never manually duplicate types - always reference generated Prisma types

**Naming Conventions:**
- Database tables: PascalCase singular (e.g., `User`, `RapidAssessment`)
- Fields: camelCase (e.g., `affectedEntityId`, `verificationStatus`)
- Enums: SCREAMING_SNAKE_CASE (e.g., `HEALTH`, `AUTO_VERIFIED`)
- Relations: descriptive names (e.g., `assessments`, `affectedEntity`)

---
