import { baseTemplate } from './base-template'
import type { SignalReason, SignalPriority } from '@/types/action-signal'

const PRIORITY_COLORS: Record<SignalPriority, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#2563eb',
}

const PRIORITY_LABELS: Record<SignalPriority, string> = {
  CRITICAL: 'CRITICAL',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

interface SignalEmailParams {
  title: string
  body: string
  entityName: string
  priority: SignalPriority
  signalReason: SignalReason
  dashboardUrl: string
  unsubscribeUrl: string
}

export function renderSignalEmail(params: SignalEmailParams): { html: string; text: string } {
  const priorityColor = PRIORITY_COLORS[params.priority]
  const priorityLabel = PRIORITY_LABELS[params.priority]

  const text = [
    params.title,
    '',
    params.body,
    '',
    `Entity: ${params.entityName}`,
    `Priority: ${priorityLabel}`,
    '',
    `View in DRMS: ${params.dashboardUrl}`,
    '',
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join('\n')

  const html = baseTemplate(
    `
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
      <tr>
        <td>
          <span style="display:inline-block;padding:4px 12px;background:${priorityColor};color:#ffffff;font-size:12px;font-weight:700;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">${priorityLabel}</span>
        </td>
      </tr>
    </table>
    <h2 style="margin:0 0 12px;color:#1e293b;font-size:18px;">${params.title}</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">${params.body}</p>
    <table cellpadding="8" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:6px;margin:0 0 20px;">
      <tr><td style="color:#64748b;width:120px;">Entity</td><td><strong>${params.entityName}</strong></td></tr>
      <tr><td style="color:#64748b;">Priority</td><td><strong style="color:${priorityColor};">${priorityLabel}</strong></td></tr>
    </table>
    <a href="${params.dashboardUrl}" style="display:inline-block;padding:10px 24px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">View in Dashboard</a>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;">
      <tr>
        <td style="padding-top:16px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You received this email because email notifications are enabled for your DRMS account.
            <a href="${params.unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
    `,
    { preview: `[DRMS] ${params.title}` }
  )

  return { html, text }
}
