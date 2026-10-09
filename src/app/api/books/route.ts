import { NextRequest } from 'next/server';
import { getAllBooksWithProgress } from '@/lib/db/books';
import { getReaderIdFromRequest } from '@/lib/reader-id';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const readerId = await getReaderIdFromRequest(request);
    const books = await getAllBooksWithProgress(readerId);
    return Response.json(books);
  } catch (error) {
    console.error('Failed to fetch books:', error);
    return Response.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}
