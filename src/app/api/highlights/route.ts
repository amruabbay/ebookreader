import { NextRequest } from 'next/server';
import {
  getHighlightsByBookId,
  getHighlightsByChapterId,
  createHighlight,
  updateHighlightColor,
  deleteHighlight,
} from '@/lib/db/highlights';
import type { HighlightColor } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const chapterId = searchParams.get('chapterId');

  if (chapterId) {
    const highlights = await getHighlightsByChapterId(chapterId);
    return Response.json(highlights);
  }

  if (bookId) {
    const highlights = await getHighlightsByBookId(bookId);
    return Response.json(highlights);
  }

  return Response.json({ error: 'bookId or chapterId query parameter is required' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapterId, selectedText, startOffset, endOffset, color } = body;

    if (!bookId || !chapterId || !selectedText) {
      return Response.json(
        { error: 'bookId, chapterId, and selectedText are required' },
        { status: 400 }
      );
    }

    const highlight = await createHighlight(
      bookId,
      chapterId,
      selectedText,
      startOffset || 0,
      endOffset || selectedText.length,
      (color as HighlightColor) || 'yellow'
    );

    return Response.json(highlight, { status: 201 });
  } catch (error) {
    console.error('Create highlight error:', error);
    return Response.json({ error: 'Failed to create highlight' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'id parameter is required' }, { status: 400 });
    }

    const success = await deleteHighlight(id);
    return Response.json({ success: true, deleted: success });
  } catch (error) {
    console.error('Delete highlight error:', error);
    return Response.json({ error: 'Failed to delete highlight' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, color } = body;

    if (!id || !color) {
      return Response.json({ error: 'id and color are required' }, { status: 400 });
    }

    const updated = await updateHighlightColor(id, color as HighlightColor);
    if (!updated) {
      return Response.json({ error: 'Highlight not found' }, { status: 404 });
    }

    return Response.json(updated);
  } catch (error) {
    console.error('Update highlight error:', error);
    return Response.json({ error: 'Failed to update highlight' }, { status: 500 });
  }
}
