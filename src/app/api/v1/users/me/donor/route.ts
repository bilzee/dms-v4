import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { userId, roles } = context;
    
    // Allow only authenticated users to view their own donor data
    if (!userId || roles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has DONOR role
    if (!roles.includes('DONOR')) {
      return NextResponse.json(
        { success: false, error: 'Donor role required' },
        { status: 403 }
      );
    }

    // Try to find donor record associated with this user
    // First check if there's a donor with matching email or identifier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        username: true,
        name: true,
        organization: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Look for donor record by various matching strategies
    let donor = null;

    // Strategy 1: Try exact email match (if donor has contactEmail)
    donor = await prisma.donor.findFirst({
      where: {
        contactEmail: user.email
      }
    });

    // Strategy 2: Try organization name match
    if (!donor && user.organization) {
      donor = await prisma.donor.findFirst({
        where: {
          organization: user.organization
        }
      });
    }

    // Strategy 3: Try name match
    if (!donor && user.name) {
      donor = await prisma.donor.findFirst({
        where: {
          name: user.name
        }
      });
    }

    // Strategy 4: Try username match
    if (!donor) {
      donor = await prisma.donor.findFirst({
        where: {
          name: user.username
        }
      });
    }

    if (!donor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No donor record found for this user',
          message: 'User exists but no associated donor record was found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        donorId: donor.id,
        donor: {
          id: donor.id,
          name: donor.name,
          organization: donor.organization,
          type: donor.type,
          contactEmail: donor.contactEmail,
          contactPhone: donor.contactPhone,
          isActive: donor.isActive,
          createdAt: donor.createdAt,
          updatedAt: donor.updatedAt
        },
        user: {
          id: userId,
          email: user.email,
          username: user.username,
          name: user.name,
          organization: user.organization
        },
        matchingStrategy: donor.contactEmail === user.email ? 'email' : 
                        donor.organization === user.organization ? 'organization' : 
                        donor.name === user.name ? 'name' : 'username'
      }
    });

  } catch (error) {
    console.error('Get user donor API error:', error);
    return handleApiError(error);
  }
});