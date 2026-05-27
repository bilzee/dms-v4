import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3'

let s3Client: S3Client | null = null

export function isS3Enabled(): boolean {
  return process.env.S3_ENABLED === 'true'
}

export function getS3Client(): S3Client | null {
  if (!isS3Enabled()) return null
  if (s3Client) return s3Client

  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: true,
  })

  return s3Client
}

export async function checkS3Health(): Promise<{ healthy: boolean; error?: string }> {
  const client = getS3Client()
  if (!client) return { healthy: false, error: 'S3 not enabled' }

  try {
    await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET || 'dms-storage' }))
    return { healthy: true }
  } catch (error) {
    return { healthy: false, error: (error as Error).message }
  }
}

export function getS3Bucket(): string {
  return process.env.S3_BUCKET || 'dms-storage'
}
