import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { AutoAssignmentService, AutoAssignmentConfig } from '@/lib/assignment/auto-assignment';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

const autoAssignmentRuleSchema = z.object({
  entityType: z.enum(['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP']),
  userRole: z.enum(['ASSESSOR', 'RESPONDER']),
  autoAssignOnCreation: z.boolean(),
  inheritFromWorkflow: z.boolean(),
  notificationEnabled: z.boolean()
});

const autoAssignmentConfigSchema = z.object({
  rules: z.array(autoAssignmentRuleSchema),
  globalSettings: z.object({
    enableAutoAssignment: z.boolean(),
    enableInheritance: z.boolean(),
    enableNotifications: z.boolean()
  })
});

export const GET = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;
  
  if (!roles.includes('COORDINATOR')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Coordinator role required.' },
      { status: 403 }
    );
  }
  try {

    const config = AutoAssignmentService.getConfig();

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Error fetching auto-assignment config:', error);
    return handleApiError(error);
  }
});

export const PUT = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;
  
  if (!roles.includes('COORDINATOR')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Coordinator role required.' },
      { status: 403 }
    );
  }
  try {

    const body = await request.json();
    const validatedConfig = autoAssignmentConfigSchema.parse(body);

    // Update the configuration
    AutoAssignmentService.updateConfig(validatedConfig);

    return NextResponse.json({
      success: true,
      message: 'Auto-assignment configuration updated successfully',
      data: AutoAssignmentService.getConfig()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating auto-assignment config:', error);
    return handleApiError(error);
  }
});

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    const { user, roles } = context;
    
    // Only coordinators can modify auto-assignment config
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions. Coordinator role required.' 
        },
        { status: 403 }
      );
    }

    try {
      // Reset to default configuration
    const defaultConfig = {
      rules: [
        {
          entityType: 'COMMUNITY',
          userRole: 'ASSESSOR',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: true
        },
        {
          entityType: 'COMMUNITY',
          userRole: 'RESPONDER',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: true
        },
        {
          entityType: 'WARD',
          userRole: 'ASSESSOR',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: false
        },
        {
          entityType: 'WARD',
          userRole: 'RESPONDER',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: false
        }
      ],
      globalSettings: {
        enableAutoAssignment: true,
        enableInheritance: true,
        enableNotifications: true
      }
    };

    AutoAssignmentService.updateConfig(defaultConfig);

    return NextResponse.json({
      success: true,
      message: 'Auto-assignment configuration reset to defaults',
      data: AutoAssignmentService.getConfig()
    });

    } catch (error) {
      console.error('Error resetting auto-assignment config:', error);
      return handleApiError(error);
    }
  }
);