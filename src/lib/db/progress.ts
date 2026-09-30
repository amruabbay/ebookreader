import { getDbClient, ensureSchema } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { ReadingProgress } from '@/types';
import type { Row } from '@libsql/client';

function rowToProgress(row: Row): ReadingProgress {
  return {
    id: String(row.id),
    bookId: String(row.book_id),
    chapterId: String(row.chapter_id),
    contentPosition: Number(row.content_position || 0),
    progressPercentage: Number(row.progress_percentage || 0),
    lastReadAt: String(row.last_read_at),
  };
}

export async function getProgressByBookId(bookId: string): Promise<ReadingProgress | null> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM reading_progress WHERE book_id = ?',
    args: [bookId],
  });
  return res.rows[0] ? rowToProgress(res.rows[0]) : null;
}

export async function upsertProgress(
  bookId: string,
  chapterId: string,
  contentPosition: number,
  progressPercentage: number
): Promise<ReadingProgress> {
  await ensureSchema();
  const db = getDbClient();
  const now = new Date().toISOString();
  const existing = await getProgressByBookId(bookId);

  if (existing) {
    await db.execute({
      sql: `
        UPDATE reading_progress
        SET chapter_id = ?, content_position = ?, progress_percentage = ?, last_read_at = ?
        WHERE book_id = ?
      `,
      args: [chapterId, contentPosition, progressPercentage, now, bookId],
    });
  } else {
    const id = uuidv4();
    await db.execute({
      sql: `
        INSERT INTO reading_progress (id, book_id, chapter_id, content_position, progress_percentage, last_read_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, bookId, chapterId, contentPosition, progressPercentage, now],
    });
  }

  const updated = await getProgressByBookId(bookId);
  return updated!;
}
