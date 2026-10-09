import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const READER_COOKIE_NAME = 'ebook_reader_id';

export function proxy(request: NextRequest) {
  // If request already has the reader cookie, continue as normal
  if (request.cookies.has(READER_COOKIE_NAME)) {
    return NextResponse.next();
  }

  // Generate a unique reader ID for this new visitor/device
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  const readerId = `reader_${randomPart}_${timePart}`;

  // Forward the new ID in a request header so the immediate route handler can also see it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-reader-id', readerId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set the cookie for 1 year
  response.cookies.set(READER_COOKIE_NAME, readerId, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image or font assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
};
