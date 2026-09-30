import { getAllBooksWithProgress } from '@/lib/db/books';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const books = await getAllBooksWithProgress();
    return Response.json(books);
  } catch (error) {
    console.error('Failed to fetch books:', error);
    return Response.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}
