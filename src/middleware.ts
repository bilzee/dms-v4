import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/service';
import { ROLE_ROUTE_PREFIXES } from '@/lib/auth/route-config';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/donors',
  '/api/health',
  '/_next',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html',
];

const AUTH_REQUIRED_ROUTES = [
  '/api/v1',
  '/(auth)',
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname === '/login' || pathname === '/register') return true;
  return PUBLIC_ROUTES.some(route => {
    if (route === '/api/v1/donors') {
      return pathname === route;
    }
    return pathname.startsWith(route);
  });
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function canAccessPath(pathname: string, roles: string[]): boolean {
  if (pathname.startsWith('/(auth)/dashboard')) return true;
  if (pathname.startsWith('/(auth)/roles')) return true;

  for (const role of roles) {
    const routes = ROLE_ROUTE_PREFIXES[role];
    if (routes?.some(route => pathname.startsWith(route))) {
      return true;
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const isAuthRequired = AUTH_REQUIRED_ROUTES.some(route => pathname.startsWith(route));
  if (!isAuthRequired) {
    return NextResponse.next();
  }

  if (isApiRoute(pathname)) {
    return NextResponse.next({
      headers: { 'x-middleware-processed': 'true' },
    });
  }

  const authorization = request.headers.get('Authorization');
  const cookieToken = request.cookies.get('auth_token')?.value;

  let token: string | null = null;
  if (authorization?.startsWith('Bearer ')) {
    token = authorization.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = AuthService.verifyToken(token);

    if (!payload.roles || payload.roles.length === 0) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'no_roles');
      return NextResponse.redirect(loginUrl);
    }

    if (!canAccessPath(pathname, payload.roles)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(loginUrl);
    }

    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-roles', payload.roles.join(','));
    return response;
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    loginUrl.searchParams.set('error', 'session_expired');
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
