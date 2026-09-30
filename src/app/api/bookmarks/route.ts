import { NextRequest } from 'next/server';
import {
  getBookmarksByBookId,
  createBookmark,
  deleteBookmark,
  deleteBookmarkByChapter,
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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const bookId = searchParams.get('bookId');
    const chapterId = searchParams.get('chapterId');

    if (id) {
      await deleteBookmark(id);
      return Response.json({ success: true });
    }

    if (bookId && chapterId) {
      await deleteBookmarkByChapter(bookId, chapterId);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'id or (bookId and chapterId) parameter is required' }, { status: 400 });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    return Response.json({ error: 'Failed to delete bookmark' }, { status: 500 });
  }
}
