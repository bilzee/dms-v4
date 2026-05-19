import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { DonorRegistrationSchema } from '@/lib/validation/donor';
import { AuthService } from '@/lib/auth/service';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, createdResponse, paginatedResponse, errorResponse, handleApiError } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = DonorRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Validation failed', 400, validation.error.errors);
    }

    const { name, type, contactEmail, contactPhone, organization, userCredentials } = validation.data;

    // Check for duplicate organization name
    const existingDonor = await prisma.donor.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          ...(contactEmail ? [{ contactEmail: { equals: contactEmail, mode: 'insensitive' } as const }] : [])
        ]
      }
    });

    if (existingDonor) {
      return errorResponse('Organization with this name or email already exists', 409);
    }

    // Check for duplicate user email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: userCredentials.email, mode: 'insensitive' } },
          { username: { equals: userCredentials.username, mode: 'insensitive' } }
        ]
      }
    });

    if (existingUser) {
      return errorResponse('User with this email or username already exists', 409);
    }

    // Get DONOR role
    const donorRole = await prisma.role.findUnique({
      where: { name: 'DONOR' }
    });

    if (!donorRole) {
      return errorResponse('Donor role not found in system', 500);
    }

    // Create donor and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create donor record
      const donor = await tx.donor.create({
        data: {
          name,
          type,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          organization: organization || null,
          isActive: true
        }
      });

      // Hash password
      const passwordHash = await AuthService.hashPassword(userCredentials.password);

      // Create user account
      const user = await tx.user.create({
        data: {
          username: userCredentials.username,
          email: userCredentials.email,
          passwordHash,
          name: userCredentials.name,
          organization: name, // Link to donor organization
          isActive: true,
          isLocked: false
        }
      });

      // Assign DONOR role to user
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: donorRole.id,
          assignedBy: user.id // Self-assigned for registration
        }
      });

      // Log audit entry
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'DONOR_REGISTRATION',
          resource: 'Donor',
          resourceId: donor.id,
          oldValues: null as any,
          newValues: JSON.stringify({
            donorName: name,
            donorType: type,
            userEmail: userCredentials.email
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return { donor, user };
    });

    // Generate auth token for immediate login
    const token = AuthService.generateToken({
      userId: result.user.id,
      email: result.user.email,
      roles: ['DONOR'],
      permissions: ['DONOR_ACCESS']
    });

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = result.user as any;

    return createdResponse({
      donor: result.donor,
      user: userWithoutPassword,
      token,
      roles: ['DONOR']
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.some(r => ['ADMIN', 'COORDINATOR'].includes(r))) {
      return errorResponse('Insufficient permissions', 403);
    }
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get('search');
    const type = searchParams.get('type') as any;
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get total count for pagination
    const total = await prisma.donor.count({ where });

    // Get donors with pagination
    const donors = await prisma.donor.findMany({
      where,
      include: {
        _count: {
          select: {
            commitments: true,
            responses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return paginatedResponse(donors, page, limit, total);

  } catch (error) {
    return handleApiError(error);
  }
});
