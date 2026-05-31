import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

export const GET = withAuth(async (request: NextRequest, context: any) => {
  const { user } = context;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const connectionData = `data: ${JSON.stringify({
        type: 'SIGNAL_CONNECTED',
        data: { userId: user.userId, timestamp: new Date().toISOString() },
      })}\n\n`;

      controller.enqueue(encoder.encode(connectionData));

      const heartbeat = setInterval(() => {
        try {
          const hb = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(hb));
        } catch {
          clearInterval(heartbeat);
          controller.close();
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Accel-Buffering': 'no',
    },
  });
});
