# 4. State Management Patterns

## 4.1 Zustand Store Structure

```typescript
// stores/authStore.ts
interface AuthStore {
  user: User | null;
  currentRole: Role | null;
  availableRoles: Role[];
  switchRole: (role: Role) => void;
  logout: () => void;
}

// stores/offlineStore.ts
interface OfflineStore {
  isOnline: boolean;
  syncQueue: SyncItem[];
  conflicts: Conflict[];
  addToQueue: (item: SyncItem) => void;
  processQueue: () => Promise<void>;
  resolveConflict: (id: string) => void;
}

// stores/entityStore.ts
interface EntityStore {
  assignedEntities: AffectedEntity[];
  selectedEntity: string | null;
  entityAssessments: Map<string, Assessment[]>;
  loadEntityData: (entityId: string) => Promise<void>;
}

// stores/formStore.ts
interface FormStore {
  drafts: Map<string, FormDraft>;
  saveDraft: (formId: string, data: any) => void;
  loadDraft: (formId: string) => FormDraft | null;
  clearDraft: (formId: string) => void;
}
```

## 4.2 Offline Data Patterns

```typescript
// Dexie schema for IndexedDB
class DmsDatabase extends Dexie {
  assessments: Table<Assessment, string>;
  responses: Table<Response, string>;
  syncQueue: Table<SyncItem, string>;
  conflicts: Table<Conflict, string>;
  cache: Table<CacheItem, string>;

  constructor() {
    super('DmsDatabase');
    this.version(1).stores({
      assessments: 'id, entityId, type, status, syncStatus',
      responses: 'id, assessmentId, status, syncStatus',
      syncQueue: '++id, type, timestamp, retryCount',
      conflicts: 'id, entityType, resolvedAt',
      cache: 'key, timestamp, expiresAt'
    });
  }
}
```
