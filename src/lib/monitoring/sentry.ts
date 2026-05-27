export function isSentryEnabled(): boolean {
  return process.env.SENTRY_ENABLED === 'true' && !!process.env.SENTRY_DSN
}

export function getSentryDsn(): string {
  return process.env.SENTRY_DSN || ''
}
