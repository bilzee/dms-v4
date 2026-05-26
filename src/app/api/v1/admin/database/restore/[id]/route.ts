import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), '.backups');
const MANIFEST_PATH = path.join(BACKUP_DIR, 'manifest.json');

export const POST = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Backup ID is required' }, { status: 400 });
    }

    if (!existsSync(MANIFEST_PATH)) {
      return NextResponse.json({ success: false, error: 'No backups found' }, { status: 404 });
    }

    const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
    const entry = manifest.find((e: any) => e.id === id);
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Backup not found' }, { status: 404 });
    }

    const filePath = path.join(BACKUP_DIR, entry.filename);
    if (!existsSync(filePath)) {
      return NextResponse.json({ success: false, error: 'Backup file not found on disk' }, { status: 404 });
    }

    const sqlContent = await readFile(filePath, 'utf-8');

    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executed = 0;
    let errors = 0;
    const warnings: string[] = [];

    for (const stmt of statements) {
      const upper = stmt.toUpperCase();
      if (upper.startsWith('BEGIN') || upper.startsWith('COMMIT') || upper === 'SELECT 1') {
        continue;
      }
      try {
        await prisma.$executeRawUnsafe(stmt);
        executed++;
      } catch (err) {
        errors++;
        const msg = (err as Error).message;
        if (warnings.length < 10) {
          warnings.push(msg.substring(0, 200));
        }
      }
    }

    return NextResponse.json({
      success: errors === 0,
      data: {
        message: errors === 0
          ? 'Database restored successfully from backup'
          : `Restore completed with ${errors} error(s) out of ${executed + errors} statements`,
        backupId: id,
        statementsExecuted: executed,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
