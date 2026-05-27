import { NextRequest, NextResponse } from 'next/server'
import { backupSyncService } from '@/lib/storage/backup-sync.service'

export async function POST(request: NextRequest) {
  if (!backupSyncService.isBackupEnabled()) {
    return NextResponse.json(
      { success: false, error: 'External S3 backup is not configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const prefix = body.prefix || undefined
    const dryRun = body.dryRun === true

    const result = await backupSyncService.syncBucketToBackup(prefix, { dryRun })

    return NextResponse.json({
      success: result.success,
      data: {
        copied: result.copied,
        deleted: result.deleted,
        errors: result.errors,
        durationMs: result.durationMs,
        dryRun,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  if (!backupSyncService.isBackupEnabled()) {
    return NextResponse.json({
      success: true,
      data: { enabled: false, healthy: false },
    })
  }

  const health = await backupSyncService.checkBackupHealth()
  return NextResponse.json({
    success: true,
    data: { enabled: true, healthy: health.healthy, error: health.error },
  })
}
