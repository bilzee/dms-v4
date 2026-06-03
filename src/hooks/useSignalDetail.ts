import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { getAuthToken } from '@/lib/auth/token-utils';
import type { ActionSignalItem, SignalReason } from '@/types/action-signal';

type DetailType = 'assessment' | 'response' | 'commitment' | null;

interface DetailRef {
  type: DetailType;
  id: string;
}

function resolveDetailRef(signal: ActionSignalItem): DetailRef {
  const ctx = signal.context || {};

  const assessmentReasons: SignalReason[] = [
    'reassessment-needed',
    'overdue',
    'awaiting-plan',
    'assessment-needs-response',
    'assessment-awaiting-verification',
    'verification-overdue',
  ];
  const responseReasons: SignalReason[] = [
    'awaiting-delivery',
    'delivery-awaiting-verification',
    'partially-covered',
    'plan-needs-commitment',
    'partially-fulfilled',
  ];
  const commitmentReasons: SignalReason[] = [
    'awaiting-plan-for-commitment',
  ];

  if (commitmentReasons.includes(signal.signalReason) && ctx.commitmentId) {
    return { type: 'commitment', id: ctx.commitmentId };
  }

  if (responseReasons.includes(signal.signalReason) && ctx.responseId) {
    return { type: 'response', id: ctx.responseId };
  }

  if (assessmentReasons.includes(signal.signalReason) && ctx.assessmentId) {
    return { type: 'assessment', id: ctx.assessmentId };
  }

  if (ctx.responseId) return { type: 'response', id: ctx.responseId };
  if (ctx.assessmentId) return { type: 'assessment', id: ctx.assessmentId };
  if (ctx.commitmentId) return { type: 'commitment', id: ctx.commitmentId };

  return { type: null, id: '' };
}

export function useSignalDetail(signal: ActionSignalItem | null) {
  const ref = signal ? resolveDetailRef(signal) : { type: null, id: '' };

  return useQuery({
    queryKey: ['signal-detail', ref.type, ref.id],
    queryFn: async () => {
      if (!ref.type || !ref.id) return null;

      let url = '';
      switch (ref.type) {
        case 'assessment':
          url = `/api/v1/assessments/${ref.id}`;
          break;
        case 'response':
          url = `/api/v1/responses/${ref.id}`;
          break;
        case 'commitment':
          url = `/api/v1/commitments/${ref.id}`;
          break;
      }

      const result = await apiGet(url);
      if (!result.success) {
        throw new Error((result as any).error || 'Failed to fetch detail');
      }
      return { type: ref.type, data: (result as any).data };
    },
    enabled: !!signal && !!ref.type && !!ref.id && !!getAuthToken(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export { resolveDetailRef };
export type { DetailRef, DetailType };
