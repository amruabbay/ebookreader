import { NextRequest } from 'next/server';
import { getBookById, deleteBook } from '@/lib/db/books';
import { getChaptersByBookId, getChapterNavItems } from '@/lib/db/chapters';
import { getProgressByBookId } from '@/lib/db/progress';
import { deleteFile } from '@/lib/storage';
import { getReaderIdFromRequest } from '@/lib/reader-id';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    const book = await getBookById(bookId);
    if (!book) {
      return Response.json({ error: 'Book not found' }, { status: 404 });
    }

    const readerId = await getReaderIdFromRequest(request);

    const [chapters, navItems, progress] = await Promise.all([
      getChaptersByBookId(bookId),
      getChapterNavItems(bookId),
      getProgressByBookId(bookId, readerId),
    ]);

    return Response.json({
      book,
      chapters,
      navItems,
      progress,
    });
  } catch (error) {
    console.error('Failed to fetch book:', error);
    return Response.json({ error: 'Failed to fetch book' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    const book = await getBookById(bookId);
    if (!book) {
      return Response.json({ error: 'Book not found' }, { status: 404 });
    }

    // Delete uploaded file (via Vercel Blob or local storage)
    if (book.originalFileName) {
      await deleteFile(book.originalFileName);
    }

    await deleteBook(bookId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete book:', error);
    return Response.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
