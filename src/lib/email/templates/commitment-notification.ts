import { baseTemplate } from './base-template'

export interface CommitmentNotificationData {
  donorName: string
  commitmentType: string
  quantity: number
  unit: string
  status: string
  link: string
}

export function commitmentNotificationEmail(data: CommitmentNotificationData): {
  subject: string
  html: string
  text: string
} {
  const subject = `Commitment Update: ${data.commitmentType} - ${data.status}`

  const text = [
    `Hello ${data.donorName},`,
    '',
    `A commitment has been ${data.status.toLowerCase()}:`,
    `- Type: ${data.commitmentType}`,
    `- Quantity: ${data.quantity} ${data.unit}`,
    '',
    `View details: ${data.link}`,
  ].join('\n')

  const html = baseTemplate(
    `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Commitment Update</h2>
    <p>Hello ${data.donorName},</p>
    <p>A commitment has been <strong>${data.status.toLowerCase()}</strong>:</p>
    <table cellpadding="8" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:6px;margin:16px 0;">
      <tr><td style="color:#64748b;width:120px;">Type</td><td><strong>${data.commitmentType}</strong></td></tr>
      <tr><td style="color:#64748b;">Quantity</td><td><strong>${data.quantity} ${data.unit}</strong></td></tr>
      <tr><td style="color:#64748b;">Status</td><td><strong>${data.status}</strong></td></tr>
    </table>
    <a href="${data.link}" style="display:inline-block;padding:10px 24px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">View Details</a>
    `,
    { preview: subject }
  )

  return { subject, html, text }
}
