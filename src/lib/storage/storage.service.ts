import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getS3Client, getS3Bucket, isS3Enabled } from './s3-client'
import path from 'path'
import fs from 'fs/promises'

export interface StorageResult {
  key: string
  size: number
  etag?: string
}

export class StorageService {
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<StorageResult> {
    if (!isS3Enabled()) {
      return this.uploadLocal(key, buffer)
    }

    const client = getS3Client()!
    const bucket = getS3Bucket()

    const result = await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    )

    return {
      key,
      size: buffer.length,
      etag: result.ETag,
    }
  }

  async uploadFile(filePath: string, key: string, contentType: string): Promise<StorageResult> {
    const buffer = await fs.readFile(filePath)
    return this.uploadBuffer(key, buffer, contentType)
  }

  async downloadToBuffer(key: string): Promise<Buffer> {
    if (!isS3Enabled()) {
      return this.downloadLocal(key)
    }

    const client = getS3Client()!
    const bucket = getS3Bucket()

    const result = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    )

    if (!result.Body) throw new Error(`Empty response for key: ${key}`)

    const bytes = await result.Body.transformToByteArray()
    return Buffer.from(bytes)
  }

  async deleteFile(key: string): Promise<void> {
    if (!isS3Enabled()) {
      const localPath = path.join(process.cwd(), 'uploads', key)
      await fs.unlink(localPath).catch(() => {})
      return
    }

    const client = getS3Client()!
    const bucket = getS3Bucket()

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  }

  async fileExists(key: string): Promise<boolean> {
    if (!isS3Enabled()) {
      const localPath = path.join(process.cwd(), 'uploads', key)
      try {
        await fs.access(localPath)
        return true
      } catch {
        return false
      }
    }

    const client = getS3Client()!
    const bucket = getS3Bucket()

    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!isS3Enabled()) {
      return `/api/v1/storage/download?key=${encodeURIComponent(key)}`
    }

    const client = getS3Client()!
    const bucket = getS3Bucket()

    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    return getSignedUrl(client, command, { expiresIn })
  }

  async listFiles(prefix: string): Promise<{ key: string; size: number; lastModified?: Date }[]> {
    if (!isS3Enabled()) {
      return []
    }

    const client = getS3Client()!
    const bucket = getS3Bucket()

    const result = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
    )

    return (result.Contents || []).map((obj) => ({
      key: obj.Key!,
      size: obj.Size || 0,
      lastModified: obj.LastModified,
    }))
  }

  private async uploadLocal(key: string, buffer: Buffer): Promise<StorageResult> {
    const localPath = path.join(process.cwd(), 'uploads', key)
    await fs.mkdir(path.dirname(localPath), { recursive: true })
    await fs.writeFile(localPath, buffer)
    return { key, size: buffer.length }
  }

  private async downloadLocal(key: string): Promise<Buffer> {
    const localPath = path.join(process.cwd(), 'uploads', key)
    return fs.readFile(localPath)
  }
}

export const storageService = new StorageService()
