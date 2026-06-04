import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { prisma } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const token = searchParams.get('token')

  if (!userId || !token) {
    return new NextResponse('Invalid unsubscribe link', { status: 400 })
  }

  if (!verifyUnsubscribeToken(userId, token)) {
    return new NextResponse('Invalid or expired unsubscribe link', { status: 400 })
  }

  try {
    await prisma.systemSetting.upsert({
      where: { section_key: { section: 'notification-user', key: `${userId}:emailEnabled` } },
      create: { section: 'notification-user', key: `${userId}:emailEnabled`, value: false, updatedBy: userId },
      update: { value: false, updatedBy: userId },
    })

    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Unsubscribed</title></head><body style="font-family:system-ui,-apple-system,sans-serif;max-width:500px;margin:40px auto;text-align:center;color:#1e293b"><h2 style="color:#1e40af">You've been unsubscribed</h2><p>You will no longer receive email notifications from DRMS.</p><p><a href="/" style="color:#1e40af">Return to DRMS</a></p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch {
    return new NextResponse('An error occurred. Please try again later.', { status: 500 })
  }
}
