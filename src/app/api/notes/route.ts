import { NextRequest } from 'next/server';
import {
  getNotesByBookId,
  getNoteByHighlightId,
  upsertNote,
  deleteNote,
} from '@/lib/db/notes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const highlightId = searchParams.get('highlightId');

  if (highlightId) {
    const note = await getNoteByHighlightId(highlightId);
    return Response.json(note || null);
  }

  if (bookId) {
    const notes = await getNotesByBookId(bookId);
    return Response.json(notes);
  }

  return Response.json({ error: 'bookId or highlightId query parameter is required' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, highlightId, content } = body;

    if (!bookId || !highlightId || content === undefined) {
      return Response.json(
        { error: 'bookId, highlightId, and content are required' },
        { status: 400 }
      );
    }

    const note = await upsertNote(bookId, highlightId, content);
    return Response.json(note, { status: 200 });
  } catch (error) {
    console.error('Save note error:', error);
    return Response.json({ error: 'Failed to save note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'id parameter is required' }, { status: 400 });
  }

  const success = await deleteNote(id);
  if (!success) {
    return Response.json({ error: 'Note not found' }, { status: 404 });
  }

  return Response.json({ success: true });
}
