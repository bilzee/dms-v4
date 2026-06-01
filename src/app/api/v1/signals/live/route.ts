import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/service';
import { onSignalEvent } from '@/lib/services/action-signal.service';

const activeStreams = new Map<string, Set<(data: string) => void>>();

function broadcastSignalEvent(userId: string, event: string, data: Record<string, unknown>): void {
  const streams = activeStreams.get(userId);
  if (!streams) return;
  const payload = `data: ${JSON.stringify({ type: event, data })}\n\n`;
  for (const send of streams) {
    try { send(payload); } catch {}
  }
}

async function authenticateSSE(request: NextRequest): Promise<{ userId: string } | null> {
  let token: string | null = null;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    const url = new URL(request.url);
    token = url.searchParams.get('token') || null;
  }

  if (!token) {
    const cookieToken = request.cookies.get('auth_token')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) return null;

  try {
    const payload = AuthService.verifyToken(token);
    const user = await AuthService.getUserWithRoles(payload.userId);
    if (!user || !user.isActive || user.isLocked) return null;
    return { userId: user.id };
  } catch {
    return null;
  }
}

export const GET = async (request: NextRequest) => {
  const authResult = await authenticateSSE(request);
  if (!authResult) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization' },
      { status: 401 }
    );
  }

  const userId = authResult.userId;

  let controllerRef: ReadableStreamDefaultController | null = null;
  const encoder = new TextEncoder();

  const send = (data: string) => {
    try {
      controllerRef?.enqueue(encoder.encode(data));
    } catch {}
  };

  const unsubscribe = onSignalEvent((event, payload) => {
    if (event === 'SIGNAL_CREATED' || event === 'SIGNAL_RESOLVED' || event === 'SIGNAL_UPDATED') {
      broadcastSignalEvent(userId, event, payload);
    }
  });

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;

      if (!activeStreams.has(userId)) {
        activeStreams.set(userId, new Set());
      }
      activeStreams.get(userId)!.add(send);

      const connectionData = `data: ${JSON.stringify({
        type: 'SIGNAL_CONNECTED',
        data: { userId, timestamp: new Date().toISOString() },
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
          cleanup();
        }
      }, 30000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        activeStreams.get(userId)?.delete(send);
        if (activeStreams.get(userId)?.size === 0) {
          activeStreams.delete(userId);
        }
        try { controller.close(); } catch {}
      };

      request.signal.addEventListener('abort', () => {
        cleanup();
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
};
