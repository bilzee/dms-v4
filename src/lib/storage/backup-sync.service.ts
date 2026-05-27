import {
  S3Client,
  CopyObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'
import { getS3Client, getS3Bucket } from './s3-client'

let backupClient: S3Client | null = null

export function isBackupEnabled(): boolean {
  return (
    process.env.BACKUP_S3_ENABLED === 'true' &&
    !!process.env.BACKUP_S3_ENDPOINT &&
    !!process.env.BACKUP_S3_ACCESS_KEY &&
    !!process.env.BACKUP_S3_SECRET_KEY &&
    !!process.env.BACKUP_S3_BUCKET
  )
}

function getBackupClient(): S3Client | null {
  if (!isBackupEnabled()) return null
  if (backupClient) return backupClient

  backupClient = new S3Client({
    endpoint: process.env.BACKUP_S3_ENDPOINT,
    region: process.env.BACKUP_S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.BACKUP_S3_ACCESS_KEY || '',
      secretAccessKey: process.env.BACKUP_S3_SECRET_KEY || '',
    },
    forcePathStyle: true,
  })

  return backupClient
}

function getBackupBucket(): string {
  return process.env.BACKUP_S3_BUCKET || ''
}

export interface BackupSyncResult {
  success: boolean
  copied: number
  deleted: number
  errors: string[]
  durationMs: number
}

export async function checkBackupHealth(): Promise<{ healthy: boolean; error?: string }> {
  const client = getBackupClient()
  if (!client) return { healthy: false, error: 'Backup S3 not configured' }

  try {
    await client.send(new HeadBucketCommand({ Bucket: getBackupBucket() }))
    return { healthy: true }
  } catch (error) {
    return { healthy: false, error: (error as Error).message }
  }
}

export async function syncBucketToBackup(
  prefix?: string,
  opts?: { dryRun?: boolean }
): Promise<BackupSyncResult> {
  const start = Date.now()
  const errors: string[] = []
  let copied = 0
  let deleted = 0

  const sourceClient = getS3Client()
  const destClient = getBackupClient()

  if (!sourceClient || !destClient) {
    return {
      success: false,
      copied: 0,
      deleted: 0,
      errors: ['Source S3 or backup S3 not configured'],
      durationMs: Date.now() - start,
    }
  }

  const sourceBucket = getS3Bucket()
  const destBucket = getBackupBucket()

  try {
    const sourceObjects = await listAllKeys(sourceClient, sourceBucket, prefix)
    const destObjects = await listAllKeys(destClient, destBucket, prefix)

    const destKeySet = new Set(destObjects.map((o) => o.Key))

    for (const obj of sourceObjects) {
      if (!obj.Key) continue
      if (destKeySet.has(obj.Key)) continue

      if (!opts?.dryRun) {
        try {
          await destClient.send(
            new CopyObjectCommand({
              Bucket: destBucket,
              Key: obj.Key,
              CopySource: `${sourceBucket}/${obj.Key}`,
            })
          )
        } catch (err) {
          errors.push(`Copy ${obj.Key}: ${(err as Error).message}`)
          continue
        }
      }
      copied++
    }

    const sourceKeySet = new Set(sourceObjects.map((o) => o.Key))
    for (const obj of destObjects) {
      if (!obj.Key) continue
      if (sourceKeySet.has(obj.Key)) continue

      if (!opts?.dryRun) {
        try {
          await destClient.send(
            new DeleteObjectCommand({
              Bucket: destBucket,
              Key: obj.Key,
            })
          )
        } catch (err) {
          errors.push(`Delete ${obj.Key}: ${(err as Error).message}`)
          continue
        }
      }
      deleted++
    }

    return {
      success: errors.length === 0,
      copied,
      deleted,
      errors,
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      success: false,
      copied,
      deleted,
      errors: [`Fatal: ${(error as Error).message}`],
      durationMs: Date.now() - start,
    }
  }
}

async function listAllKeys(
  client: S3Client,
  bucket: string,
  prefix?: string
): Promise<Array<{ Key?: string; Size?: number; LastModified?: Date }>> {
  const keys: Array<{ Key?: string; Size?: number; LastModified?: Date }> = []
  let continuationToken: string | undefined

  do {
    const resp = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )
    if (resp.Contents) {
      keys.push(...resp.Contents)
    }
    continuationToken = resp.NextContinuationToken
  } while (continuationToken)

  return keys
}

export const backupSyncService = {
  isBackupEnabled,
  checkBackupHealth,
  syncBucketToBackup,
}
