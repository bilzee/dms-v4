import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

const bulkAssignmentSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1),
  entityIds: z.array(z.string().cuid()).min(1),
  assignedBy: z.string().cuid()
});

export const POST = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;
  
  if (!roles.includes('COORDINATOR')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Coordinator role required.' },
      { status: 403 }
    );
  }
  try {

    const body = await request.json();
    const validatedData = bulkAssignmentSchema.parse(body);

    // Validate users exist and have appropriate roles
    const users = await prisma.user.findMany({
      where: {
        id: { in: validatedData.userIds }
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (users.length !== validatedData.userIds.length) {
      const foundUserIds = users.map((u: any) => u.id);
      const missingUserIds = validatedData.userIds.filter((id: any) => !foundUserIds.includes(id));
      return NextResponse.json(
        { error: 'Some users not found', missingUserIds },
        { status: 404 }
      );
    }

    // Check if all users have assignable roles
    const usersWithoutAssignableRoles = users.filter((user: any) => 
      !user.roles.some((userRole: any) => ['ASSESSOR', 'RESPONDER'].includes(userRole.role.name))
    );

    if (usersWithoutAssignableRoles.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some users do not have ASSESSOR or RESPONDER roles', 
          invalidUsers: usersWithoutAssignableRoles.map((u: any) => ({
            id: u.id,
            email: u.email,
            roles: u.roles.map((ur: any) => ur.role.name)
          }))
        },
        { status: 400 }
      );
    }

    // Validate entities exist
    const entities = await prisma.entity.findMany({
      where: {
        id: { in: validatedData.entityIds }
      }
    });

    if (entities.length !== validatedData.entityIds.length) {
      const foundEntityIds = entities.map((e: any) => e.id);
      const missingEntityIds = validatedData.entityIds.filter((id: any) => !foundEntityIds.includes(id));
      return NextResponse.json(
        { error: 'Some entities not found', missingEntityIds },
        { status: 404 }
      );
    }

    // Get existing assignments to avoid duplicates
    const existingAssignments = await prisma.entityAssignment.findMany({
      where: {
        userId: { in: validatedData.userIds },
        entityId: { in: validatedData.entityIds }
      }
    });

    // Create assignment pairs
    const assignmentPairs: Array<{ userId: string; entityId: string; assignedBy: string }> = [];
    
    for (const userId of validatedData.userIds) {
      for (const entityId of validatedData.entityIds) {
        // Skip if assignment already exists
        const exists = existingAssignments.some(
          (assignment: any) => assignment.userId === userId && assignment.entityId === entityId
        );
        
        if (!exists) {
          assignmentPairs.push({
            userId,
            entityId,
            assignedBy: validatedData.assignedBy
          });
        }
      }
    }

    if (assignmentPairs.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'All assignments already exist',
          created: 0,
          skipped: validatedData.userIds.length * validatedData.entityIds.length
        }
      );
    }

    // Bulk create assignments in a transaction
    const createdAssignments = await prisma.$transaction(
      assignmentPairs.map((assignment: any) =>
        prisma.entityAssignment.create({
          data: assignment,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                roles: {
                  include: {
                    role: true
                  }
                }
              }
            },
            entity: {
              select: {
                id: true,
                name: true,
                type: true,
                location: true
              }
            }
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdAssignments.length} assignments`,
      data: createdAssignments,
      created: createdAssignments.length,
      skipped: existingAssignments.length
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating bulk entity assignments:', error);
    return handleApiError(error);
  }
});