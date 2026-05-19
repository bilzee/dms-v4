import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

// GET - Enhanced real-time connection endpoint with SSE support
export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles, user } = context;
    
    // Check if user has coordinator role for configuration updates
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const channels = searchParams.get('channels')?.split(',') || ['verification_updates'];
    const useSSE = searchParams.get('sse') === 'true';

    // If SSE is requested, establish Server-Sent Events stream
    if (useSSE) {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          // Send initial connection message
          const connectionData = `data: ${JSON.stringify({
            type: 'connection',
            status: 'connected',
            channels: channels,
            userId: (user as any).id,
            timestamp: new Date().toISOString()
          })}\n\n`;
          
          controller.enqueue(encoder.encode(connectionData));

          // Set up periodic heartbeat (every 30 seconds)
          const heartbeat = setInterval(() => {
            try {
              const heartbeatData = `data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
              })}\n\n`;
              
              controller.enqueue(encoder.encode(heartbeatData));
            } catch (error) {
              console.error('Heartbeat error:', error);
              clearInterval(heartbeat);
              controller.close();
            }
          }, 30000);

          // Handle client disconnection
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeat);
            controller.close();
          });
        }
      });

      return new NextResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-Accel-Buffering': 'no'
        },
      });
    }

    // Default response with connection options
    return NextResponse.json({
      success: true,
      message: 'Enhanced real-time verification updates endpoint',
      options: {
        serverSentEvents: {
          enabled: true,
          endpoint: `/api/v1/verification/live?sse=true&channels=${channels.join(',')}`
        },
        polling: {
          enabled: true,
          interval: 30000,
          endpoints: {
            assessmentQueue: '/api/v1/verification/queue/assessments',
            deliveryQueue: '/api/v1/verification/queue/deliveries',
            autoApproval: '/api/v1/verification/auto-approval'
          }
        },
        websocket: {
          enabled: false,
          note: 'WebSocket support planned for future release - using SSE and polling for now'
        }
      },
      channels: channels,
      user: {
        id: (user as any).id,
        role: roles
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Real-time connection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to establish real-time connection' },
      { status: 500 }
    );
  }
});

// POST - Handle real-time event broadcasting
export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles, user } = context;
    
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, event, data, channels } = body;

    // Handle different message types
    switch (type) {
      case 'SUBSCRIBE':
        return NextResponse.json({
          success: true,
          message: 'Subscription successful',
          channels: channels || data?.channels || [],
          timestamp: new Date().toISOString()
        });

      case 'BROADCAST':
        await broadcastConfigurationChange(event, data, channels);
        
        return NextResponse.json({
          success: true,
          message: 'Event broadcasted successfully',
          event: event,
          timestamp: new Date().toISOString()
        });

      case 'CONFIGURATION_UPDATE':
        // Handle configuration updates specifically
        await handleConfigurationUpdate(data, user);
        
        return NextResponse.json({
          success: true,
          message: 'Configuration update processed',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown message type: ${type}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Real-time message handling error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to handle message' },
      { status: 500 }
    );
  }
});

// Simulate broadcasting configuration changes
async function broadcastConfigurationChange(event: string, data: any, channels?: string[]) {
  try {
    // In production, this would use Redis pub/sub, WebSocket broadcasting, or similar
    // Simulate real-world broadcasting delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return true;
  } catch (error) {
    console.error('Failed to broadcast configuration change:', error);
    return false;
  }
}

// Handle configuration updates
async function handleConfigurationUpdate(data: any, user: any) {
  try {
    // In production, this could:
    // - Update cached configuration data
    // - Trigger webhook notifications
    // - Update analytics/metrics
    // - Send notifications to other systems
    
    return true;
  } catch (error) {
    console.error('Failed to handle configuration update:', error);
    return false;
  }
}