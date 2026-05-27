export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

export function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === 'true'
}

export class EmailService {
  async send(message: EmailMessage): Promise<EmailResult> {
    if (!isEmailEnabled()) {
      console.log(
        '[Email] Disabled — would have sent:',
        message.subject,
        'to',
        Array.isArray(message.to) ? message.to.join(', ') : message.to
      )
      return { success: true, id: 'mock' }
    }

    const provider = process.env.EMAIL_PROVIDER || 'resend'

    try {
      switch (provider) {
        case 'resend':
          return await this.sendViaResend(message)
        case 'sendgrid':
          return await this.sendViaSendgrid(message)
        default:
          return { success: false, error: `Unknown email provider: ${provider}` }
      }
    } catch (error) {
      console.error('[Email] Send failed:', (error as Error).message)
      return { success: false, error: (error as Error).message }
    }
  }

  private async sendViaResend(message: EmailMessage): Promise<EmailResult> {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME || 'DRMS'} <${process.env.EMAIL_FROM_ADDRESS || 'noreply@localhost'}>`,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      cc: message.cc,
      bcc: message.bcc,
      replyTo: message.replyTo,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  }

  private async sendViaSendgrid(message: EmailMessage): Promise<EmailResult> {
    const sgMail = await import('@sendgrid/mail')
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY || '')

    const [awaitedSgMail] = await Promise.all([sgMail])

    await awaitedSgMail.default.send({
      to: message.to,
      from: {
        email: process.env.EMAIL_FROM_ADDRESS || 'noreply@localhost',
        name: process.env.EMAIL_FROM_NAME || 'DRMS',
      },
      subject: message.subject,
      html: message.html,
      text: message.text,
      cc: message.cc,
      bcc: message.bcc,
      replyTo: message.replyTo,
    })

    return { success: true }
  }
}

export const emailService = new EmailService()
