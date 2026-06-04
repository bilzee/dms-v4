import crypto from 'crypto'

const HMAC_SECRET = process.env.NOTIFICATION_HMAC_SECRET || process.env.JWT_SECRET || 'fallback-dev-secret'

export function generateUnsubscribeToken(userId: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(userId).digest('hex')
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(userId)
  if (expected.length !== token.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}
