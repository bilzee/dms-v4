import { baseTemplate } from './base-template'

export interface ReportGeneratedData {
  userName: string
  reportName: string
  format: string
  downloadLink: string
}

export function reportGeneratedEmail(data: ReportGeneratedData): {
  subject: string
  html: string
  text: string
} {
  const subject = `Report Ready: ${data.reportName}`

  const text = [
    `Hello ${data.userName},`,
    '',
    `Your report "${data.reportName}" has been generated in ${data.format} format.`,
    '',
    `Download: ${data.downloadLink}`,
  ].join('\n')

  const html = baseTemplate(
    `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Report Ready</h2>
    <p>Hello ${data.userName},</p>
    <p>Your report <strong>"${data.reportName}"</strong> has been generated in <strong>${data.format}</strong> format.</p>
    <a href="${data.downloadLink}" style="display:inline-block;padding:10px 24px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;margin-top:12px;">Download Report</a>
    `,
    { preview: subject }
  )

  return { subject, html, text }
}
