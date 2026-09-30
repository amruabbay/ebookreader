import { NextRequest } from 'next/server';
import {
  getBookmarksByBookId,
  createBookmark,
  deleteBookmark,
} from '@/lib/db/bookmarks';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');

  if (!bookId) {
    return Response.json({ error: 'bookId parameter is required' }, { status: 400 });
  }

  const bookmarks = await getBookmarksByBookId(bookId);
  return Response.json(bookmarks);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapterId, contentPosition, label } = body;

    if (!bookId || !chapterId) {
      return Response.json(
        { error: 'bookId and chapterId are required' },
        { status: 400 }
      );
    }

    const bookmark = await createBookmark(
      bookId,
      chapterId,
      contentPosition || 0,
      label || ''
    );

    return Response.json(bookmark, { status: 201 });
  } catch (error) {
    console.error('Create bookmark error:', error);
    return Response.json({ error: 'Failed to create bookmark' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'id parameter is required' }, { status: 400 });
  }

  const success = await deleteBookmark(id);
  if (!success) {
    return Response.json({ error: 'Bookmark not found' }, { status: 404 });
  }

  return Response.json({ success: true });
}
