import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

interface RouteParams {
  params: { id: string }
}

export const PUT = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions.' },
      { status: 403 }
    );
  }

  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, permissions: permissionCodes } = body;

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Role not found.' },
        { status: 404 }
      );
    }

    if (name && name !== existing.name) {
      const nameConflict = await prisma.role.findUnique({ where: { name } });
      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: 'A role with this name already exists.' },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (permissionCodes !== undefined) {
      const permissionRecords = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } }
      });

      await prisma.rolePermission.deleteMany({ where: { roleId: id } });

      updateData.permissions = {
        create: permissionRecords.map(p => ({
          permissionId: p.id
        }))
      };
    }

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: { include: { permission: true } },
        userRoles: { select: { userId: true } }
      }
    });

    return NextResponse.json(
      {
        data: { role },
        meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId: uuidv4() }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions.' },
      { status: 403 }
    );
  }

  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required.' },
        { status: 400 }
      );
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: { userRoles: true }
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found.' },
        { status: 404 }
      );
    }

    if (role.userRoles.length > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete role. ${role.userRoles.length} users are currently assigned to this role.` },
        { status: 409 }
      );
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    return NextResponse.json(
      { data: { success: true }, meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId: uuidv4() } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
