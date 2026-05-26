import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response';
import { readFile, writeFile, mkdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), '.backups');
const MANIFEST_PATH = path.join(BACKUP_DIR, 'manifest.json');

interface BackupManifest {
  id: string;
  timestamp: string;
  size: string;
  sizeBytes: number;
  type: 'automatic' | 'manual';
  status: 'success' | 'failed' | 'in-progress';
  location: 'local';
  filename: string;
}

async function ensureBackupDir(): Promise<void> {
  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true });
  }
}

async function readManifest(): Promise<BackupManifest[]> {
  await ensureBackupDir();
  if (!existsSync(MANIFEST_PATH)) return [];
  const data = await readFile(MANIFEST_PATH, 'utf-8');
  return JSON.parse(data);
}

async function writeManifest(entries: BackupManifest[]): Promise<void> {
  await ensureBackupDir();
  await writeFile(MANIFEST_PATH, JSON.stringify(entries, null, 2));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function exportTableToSql(tableName: string): Promise<string> {
  const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);

  if (rows.length === 0) {
    return `-- Table: ${tableName} (empty)\nSELECT 1;\n\n`;
  }

  const columns = Object.keys(rows[0]);
  let sql = `-- Table: ${tableName} (${rows.length} rows)\n`;

  sql += `DELETE FROM "${tableName}";\n`;

  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesList = batch.map(row => {
      const vals = columns.map(col => escapeSqlValue(row[col]));
      return `(${vals.join(', ')})`;
    });
    sql += `INSERT INTO "${tableName}" ("${columns.join('", "')}") VALUES\n  ${valuesList.join(',\n  ')};\n\n`;
  }

  return sql;
}

async function generateBackupSql(): Promise<string> {
  const tablesResult: any[] = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  const tables = tablesResult.map((t: any) => t.tablename);

  let sql = `-- DMS Database Backup\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Tables: ${tables.length}\n\n`;
  sql += `BEGIN;\n\n`;

  const insertOrder = [
    'users', 'donor_organizations', 'entities', 'incidents',
    'assessments', 'commitments', 'responses', 'gap_fields',
    'verification_records', 'notifications', 'audit_logs',
    'leaderboard_entries', 'achievements', 'user_achievements',
    'system_settings', 'scheduled_reports',
  ];

  const orderedTables = [
    ...insertOrder.filter(t => tables.includes(t)),
    ...tables.filter(t => !insertOrder.includes(t)),
  ];

  for (const table of orderedTables) {
    try {
      sql += await exportTableToSql(table);
    } catch (err) {
      sql += `-- SKIPPED: ${table} (${(err as Error).message})\n\n`;
    }
  }

  sql += `COMMIT;\n`;
  return sql;
}

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const backupId = `backup_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;
    const filename = `${backupId}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    try {
      await ensureBackupDir();
      const sqlContent = await generateBackupSql();
      await writeFile(filePath, sqlContent, 'utf-8');
    } catch (dumpError) {
      const manifest = await readManifest();
      manifest.unshift({
        id: backupId,
        timestamp: new Date().toISOString(),
        size: '0 B',
        sizeBytes: 0,
        type: 'manual',
        status: 'failed',
        location: 'local',
        filename,
      });
      await writeManifest(manifest);
      return NextResponse.json({ success: false, error: 'Backup failed: ' + (dumpError as Error).message }, { status: 500 });
    }

    const fileStat = await stat(filePath);
    const sizeBytes = fileStat.size;

    const manifest = await readManifest();
    const entry: BackupManifest = {
      id: backupId,
      timestamp: new Date().toISOString(),
      size: formatBytes(sizeBytes),
      sizeBytes,
      type: 'manual',
      status: 'success',
      location: 'local',
      filename,
    };
    manifest.unshift(entry);
    await writeManifest(manifest);

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return handleApiError(error);
  }
});

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');
    const action = searchParams.get('action');

    const manifest = await readManifest();

    if (backupId && action === 'download') {
      const entry = manifest.find(e => e.id === backupId);
      if (!entry) {
        return NextResponse.json({ success: false, error: 'Backup not found' }, { status: 404 });
      }
      const filePath = path.join(BACKUP_DIR, entry.filename);
      if (!existsSync(filePath)) {
        return NextResponse.json({ success: false, error: 'Backup file not found on disk' }, { status: 404 });
      }
      const fileBuffer = await readFile(filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': `attachment; filename="${entry.filename}"`,
          'Content-Length': String(fileBuffer.length),
        },
      });
    }

    if (backupId) {
      const entry = manifest.find(e => e.id === backupId);
      if (!entry) {
        return NextResponse.json({ success: false, error: 'Backup not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: entry });
    }

    return NextResponse.json({ success: true, data: manifest });
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');
    if (!backupId) {
      return NextResponse.json({ success: false, error: 'Backup ID is required' }, { status: 400 });
    }

    let manifest = await readManifest();
    const entry = manifest.find(e => e.id === backupId);
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Backup not found' }, { status: 404 });
    }

    const filePath = path.join(BACKUP_DIR, entry.filename);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    manifest = manifest.filter(e => e.id !== backupId);
    await writeManifest(manifest);

    return NextResponse.json({ success: true, data: { message: 'Backup deleted successfully' } });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PUT = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const backupId = `backup_upload_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;
    const filename = `${backupId}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    await ensureBackupDir();
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const entry: BackupManifest = {
      id: backupId,
      timestamp: new Date().toISOString(),
      size: formatBytes(buffer.length),
      sizeBytes: buffer.length,
      type: 'manual',
      status: 'success',
      location: 'local',
      filename,
    };

    const manifest = await readManifest();
    manifest.unshift(entry);
    await writeManifest(manifest);

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return handleApiError(error);
  }
});
