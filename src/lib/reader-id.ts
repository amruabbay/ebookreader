import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const READER_COOKIE_NAME = 'ebook_reader_id';
export const READER_HEADER_NAME = 'x-reader-id';
export const DEFAULT_READER_ID = 'default';

/**
 * Normalizes reader ID string to prevent spaces or empty values.
 */
export function normalizeReaderId(id?: string | null): string {
  if (!id) return DEFAULT_READER_ID;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_READER_ID;
}

/**
 * Generates a clean, readable reader ID for a device/browser.
 */
export function generateReaderId(): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  return `reader_${randomPart}_${timePart}`;
}

/**
 * Resolves the reader ID on the server side:
 * 1. From request cookies
 * 2. From request header 'x-reader-id'
 * 3. From request URL query parameter 'readerId'
 * 4. From Next.js Server Components `cookies()`
 * 5. Fallback to DEFAULT_READER_ID ('default')
 */
export async function getReaderIdFromRequest(
  request?: NextRequest | Request | null
): Promise<string> {
  if (request) {
    // 1. Check cookies if NextRequest
    if ('cookies' in request && request.cookies && typeof request.cookies.get === 'function') {
      const cookieVal = request.cookies.get(READER_COOKIE_NAME)?.value;
      if (cookieVal) return normalizeReaderId(cookieVal);
    } else {
      // Standard Request cookie header parse
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${READER_COOKIE_NAME}=([^;]+)`));
        if (match?.[1]) {
          return normalizeReaderId(decodeURIComponent(match[1]));
        }
      }
    }

    // 2. Check x-reader-id header
    const headerVal = request.headers.get(READER_HEADER_NAME);
    if (headerVal) return normalizeReaderId(headerVal);

    // 3. Check query param
    try {
      const url = new URL(request.url);
      const queryVal = url.searchParams.get('readerId');
      if (queryVal) return normalizeReaderId(queryVal);
    } catch {
      // URL parsing could fail if relative
    }
  }

  // 4. Fallback to Next.js cookies() in Server Components
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(READER_COOKIE_NAME)?.value;
    if (cookieVal) return normalizeReaderId(cookieVal);
  } catch {
    // cookies() might fail outside request scope
  }

  return DEFAULT_READER_ID;
}
