import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { handleApiError } from '@/lib/api/response'

async function getPermissionConnectData(permissionCodes: string[]) {
  if (permissionCodes.length === 0) return []
  const permissions = await prisma.permission.findMany({
    where: { code: { in: permissionCodes } }
  })
  return permissions.map(p => ({
    permissionId: p.id
  }))
}

export const GET = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS') && !permissions.includes('ASSIGN_ROLES')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Manage users or Assign roles permission required.' },
      { status: 403 }
    );
  }

  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          select: {
            userId: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          roles
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get roles error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, description, permissions: permissionCodes } = body;

    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: 'Name and description are required.' },
        { status: 400 }
      );
    }

    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      return NextResponse.json(
        { success: false, error: 'A role with this name already exists.' },
        { status: 409 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: await getPermissionConnectData(permissionCodes || [])
        }
      },
      include: {
        permissions: { include: { permission: true } },
        userRoles: { select: { userId: true } }
      }
    });

    return NextResponse.json(
      { success: true, data: { role }, meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId: uuidv4() } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create role error:', error);
    return handleApiError(error);
  }
});

export const PUT = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, name, description, permissions: permissionCodes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required.' },
        { status: 400 }
      );
    }

    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found.' },
        { status: 404 }
      );
    }

    if (name && name !== existingRole.name) {
      const nameConflict = await prisma.role.findUnique({ where: { name } });
      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: 'A role with this name already exists.' },
          { status: 409 }
        );
      }
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        permissions: {
          create: await getPermissionConnectData(permissionCodes || [])
        }
      },
      include: {
        permissions: { include: { permission: true } },
        userRoles: { select: { userId: true } }
      }
    });

    return NextResponse.json(
      { success: true, data: { role }, meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId: uuidv4() } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update role error:', error);
    return handleApiError(error);
  }
});