# 6. Component Implementation Guidelines

## 6.1 Form Implementation Pattern

```tsx
// Example: Health Assessment Form Component
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { healthAssessmentSchema } from '@/lib/schemas';
import { useOfflineStore } from '@/lib/stores/offlineStore';
import { GPSField, MediaField, BooleanField } from '@/components/forms';

export function HealthAssessmentForm({ entityId }: { entityId: string }) {
  const { addToQueue } = useOfflineStore();
  
  const form = useForm({
    resolver: zodResolver(healthAssessmentSchema),
    defaultValues: {
      entityId,
      assessmentType: 'health',
      timestamp: new Date(),
    }
  });

  // Auto-save to IndexedDB
  useEffect(() => {
    const interval = setInterval(() => {
      const data = form.getValues();
      saveDraft('health', entityId, data);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const onSubmit = async (data: HealthAssessment) => {
    // Save to IndexedDB
    await db.assessments.add(data);
    
    // Add to sync queue
    addToQueue({
      type: 'assessment',
      data,
      timestamp: Date.now(),
    });
    
    // Navigate based on online status
    if (isOnline) {
      await syncImmediately(data);
    }
    router.push('/assessor/dashboard');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Gap-indicating boolean fields */}
        <BooleanField
          name="hasFunctionalClinic"
          label="Functional Clinic Available"
          description="Gap if FALSE"
          showGapIndicator
        />
        
        <BooleanField
          name="hasEmergencyServices"
          label="Emergency Services Available"
          description="Gap if FALSE"
          showGapIndicator
        />

        {/* GPS and Media capture */}
        <GPSField name="coordinates" />
        <MediaField name="photos" maxFiles={3} />
        
        <Button type="submit">
          {isOnline ? 'Submit' : 'Save Offline'}
        </Button>
      </form>
    </Form>
  );
}
```

## 6.2 Dashboard Implementation Pattern

```tsx
// Example: Crisis Management Dashboard
'use client';

import { useQuery } from '@tanstack/react-query';
import { useOfflineStore } from '@/lib/stores/offlineStore';
import { QueuePanel, ResourcePanel, ConflictPanel } from '@/components/dashboards';

export function CrisisManagementDashboard() {
  const { isOnline } = useOfflineStore();
  
  // Polling for real-time updates
  const { data: queues } = useQuery({
    queryKey: ['verification-queues'],
    queryFn: fetchVerificationQueues,
    refetchInterval: isOnline ? 30000 : false,
    staleTime: 20000,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Left: Verification Queues */}
      <div className="lg:col-span-1 overflow-y-auto">
        <QueuePanel
          assessments={queues?.assessments || []}
          responses={queues?.responses || []}
          onVerify={handleVerification}
        />
      </div>
      
      {/* Center: Resource Management */}
      <div className="lg:col-span-1">
        <ResourcePanel
          commitments={queues?.commitments || []}
          assignments={queues?.assignments || []}
        />
      </div>
      
      {/* Right: Conflicts & Metrics */}
      <div className="lg:col-span-1">
        <ConflictPanel conflicts={queues?.conflicts || []} />
      </div>
    </div>
  );
}
```

## 6.3 Offline Sync Pattern

```typescript
// lib/sync/syncEngine.ts
class SyncEngine {
  private queue: SyncQueue;
  private db: DmsDatabase;
  
  async processQueue() {
    const items = await this.queue.getPending();
    
    for (const item of items) {
      try {
        await this.syncItem(item);
        await this.queue.markComplete(item.id);
      } catch (error) {
        if (error.type === 'CONFLICT') {
          await this.handleConflict(item, error);
        } else {
          await this.queue.incrementRetry(item.id);
        }
      }
    }
  }
  
  private async handleConflict(item: SyncItem, error: ConflictError) {
    // Last-write-wins resolution
    const resolution = {
      entityType: item.type,
      entityId: item.data.id,
      winningVersion: error.serverVersion,
      losingVersion: item.data.version,
      resolvedAt: new Date(),
    };
    
    await this.db.conflicts.add(resolution);
    await this.notifyCoordinator(resolution);
  }
}
```
