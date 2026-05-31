import type { ActionSignalItem } from '@/types/action-signal';
import type { SignalPriority } from '@/types/action-signal';

interface EntityPriorityInfo {
  entityId: string;
  highestPriority: string;
  signalCount: number;
}

export function deriveMapPropsFromSignals(signals: ActionSignalItem[]) {
  const activeEntityIds: string[] = [];
  const entityPriorities: Record<string, EntityPriorityInfo> = {};
  const seen = new Set<string>();

  for (const signal of signals) {
    if (!seen.has(signal.entityId)) {
      seen.add(signal.entityId);
      activeEntityIds.push(signal.entityId);
    }

    const existing = entityPriorities[signal.entityId];
    const priorityRank = (p: string): number => {
      switch (p) {
        case 'CRITICAL': return 4;
        case 'HIGH': return 3;
        case 'MEDIUM': return 2;
        case 'LOW': return 1;
        default: return 0;
      }
    };

    if (!existing) {
      entityPriorities[signal.entityId] = {
        entityId: signal.entityId,
        highestPriority: signal.priority,
        signalCount: 1,
      };
    } else {
      existing.signalCount++;
      if (priorityRank(signal.priority) > priorityRank(existing.highestPriority)) {
        existing.highestPriority = signal.priority;
      }
    }
  }

  return { activeEntityIds, entityPriorities };
}
