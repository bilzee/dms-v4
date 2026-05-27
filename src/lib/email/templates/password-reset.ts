import { baseTemplate } from './base-template'

export interface PasswordResetData {
  userName: string
  resetLink: string
  expiryHours: number
}

export function passwordResetEmail(data: PasswordResetData): {
  subject: string
  html: string
  text: string
} {
  const subject = 'Password Reset Request'

  const text = [
    `Hello ${data.userName},`,
    '',
    `You requested a password reset. Click the link below to set a new password:`,
    data.resetLink,
    '',
    `This link expires in ${data.expiryHours} hours.`,
    '',
    'If you did not request this, please ignore this email.',
  ].join('\n')

  const html = baseTemplate(
    `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Password Reset</h2>
    <p>Hello ${data.userName},</p>
    <p>You requested a password reset. Click the button below to set a new password:</p>
    <a href="${data.resetLink}" style="display:inline-block;padding:10px 24px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a>
    <p style="margin-top:16px;font-size:14px;color:#64748b;">This link expires in ${data.expiryHours} hours.</p>
    <p style="font-size:14px;color:#64748b;">If you did not request this, please ignore this email.</p>
    `,
    { preview: subject }
  )

  return { subject, html, text }
}
