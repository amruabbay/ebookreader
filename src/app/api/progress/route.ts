import { NextRequest } from 'next/server';
import { upsertProgress } from '@/lib/db/progress';
import { getReaderIdFromRequest } from '@/lib/reader-id';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapterId, contentPosition, progressPercentage, readerId: bodyReaderId } = body;

    if (!bookId || !chapterId) {
      return Response.json({ error: 'bookId and chapterId are required' }, { status: 400 });
    }

    const readerId = bodyReaderId || (await getReaderIdFromRequest(request));

    const progress = await upsertProgress(
      bookId,
      chapterId,
      contentPosition ?? 0,
      progressPercentage ?? 0,
      readerId
    );

    return Response.json(progress);
  } catch (error) {
    console.error('Failed to save progress:', error);
    return Response.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
