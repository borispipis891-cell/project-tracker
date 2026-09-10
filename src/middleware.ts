import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdminEmail } from '@/lib/admin';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdminEmail(token.email)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith('/api/admin') && !isAdminEmail(token?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Защищаем dashboard routes
  if (request.nextUrl.pathname.startsWith('/projects') && !request.nextUrl.pathname.startsWith('/api')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Защищаем API routes
  if (request.nextUrl.pathname.startsWith('/api/projects')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/projects/:path*',
    '/admin/:path*',
    '/api/projects/:path*',
    '/api/admin/:path*',
  ],
};
