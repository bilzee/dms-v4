import { baseTemplate } from './base-template';
import type { SignalReason, SignalPriority } from '@/types/action-signal';

const PRIORITY_COLORS: Record<SignalPriority, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#2563eb',
};

const SIGNAL_REASON_LABELS: Record<string, string> = {
  'reassessment-needed': 'Reassessment Needed',
  'overdue': 'Population Assessment Overdue',
  'awaiting-plan': 'Response Plan Needed',
  'awaiting-plan-for-commitment': 'Commitment Needs Plan',
  'awaiting-delivery': 'Delivery Confirmation Needed',
  'partially-covered': 'Plan Partially Covered',
  'assessment-needs-response': 'Assessment Needs Resources',
  'plan-needs-commitment': 'Plan Needs Commitment',
  'partially-fulfilled': 'Commitment Partially Fulfilled',
  'assessment-awaiting-verification': 'Assessment Awaiting Review',
  'delivery-awaiting-verification': 'Delivery Awaiting Review',
  'verification-overdue': 'Verification Overdue',
  'entity-needs-responder': 'Entity Needs Responder',
  'entity-needs-donor': 'Entity Needs Donor',
};

interface DigestSignal {
  signalReason: SignalReason;
  priority: SignalPriority;
  createdAt: Date;
}

interface EntityGroup {
  entityName: string;
  signals: DigestSignal[];
}

interface DigestEmailParams {
  userName: string;
  entityGroups: EntityGroup[];
  totalSignals: number;
  totalEntities: number;
  dashboardUrl: string;
  unsubscribeUrl: string;
}

export function renderDigestEmail(params: DigestEmailParams): { html: string; text: string } {
  const timeAgo = (date: Date): string => {
    const hours = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const text = [
    `Hello ${params.userName},`,
    '',
    `You have ${params.totalSignals} active signals across ${params.totalEntities} entities.`,
    '',
    ...params.entityGroups.flatMap(group => [
      `--- ${group.entityName} (${group.signals.length} signals) ---`,
      ...group.signals.map(s =>
        `  [${s.priority}] ${SIGNAL_REASON_LABELS[s.signalReason] || s.signalReason} — ${timeAgo(s.createdAt)}`
      ),
      '',
    ]),
    `View all signals: ${params.dashboardUrl}`,
    '',
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join('\n');

  const entitySections = params.entityGroups.map(group => `
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
      <tr>
        <td style="padding:10px 12px;background:#f1f5f9;border-radius:6px 6px 0 0;border-bottom:2px solid #e2e8f0;">
          <strong style="color:#1e293b;font-size:14px;">${group.entityName}</strong>
          <span style="color:#64748b;font-size:12px;margin-left:8px;">${group.signals.length} signal${group.signals.length !== 1 ? 's' : ''}</span>
        </td>
      </tr>
      ${group.signals.map(s => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PRIORITY_COLORS[s.priority]};margin-right:8px;"></span>
            <span style="color:#1e293b;font-size:13px;">${SIGNAL_REASON_LABELS[s.signalReason] || s.signalReason}</span>
            <span style="color:#94a3b8;font-size:12px;margin-left:8px;">${timeAgo(s.createdAt)}</span>
          </td>
        </tr>
      `).join('')}
    </table>
  `).join('');

  const html = baseTemplate(`
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">Hello ${params.userName},</p>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;">
      You have <strong style="color:#1e293b;">${params.totalSignals}</strong> active signals across
      <strong style="color:#1e293b;">${params.totalEntities}</strong> entities.
    </p>
    ${entitySections}
    <a href="${params.dashboardUrl}" style="display:inline-block;padding:10px 24px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">View All Signals</a>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;">
      <tr>
        <td style="padding-top:16px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You received this digest because email digest is enabled for your DRMS account.
            <a href="${params.unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
  `, { preview: `[DRMS] Daily Signal Digest — ${params.totalSignals} signals` });

  return { html, text };
}
