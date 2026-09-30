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

  // Validate that chapterId exists in chapters table to prevent SQLite foreign key constraint errors
  let validChapterId = chapterId;
  const chapterCheck = await db.execute({
    sql: 'SELECT id FROM chapters WHERE id = ?',
    args: [chapterId],
  });

  if (!chapterCheck.rows[0]) {
    // If provided chapterId doesn't exist, find an existing chapter for this book
    const existingChapter = await db.execute({
      sql: 'SELECT id FROM chapters WHERE book_id = ? ORDER BY order_index ASC LIMIT 1',
      args: [bookId],
    });

    if (existingChapter.rows[0]) {
      validChapterId = String(existingChapter.rows[0].id);
    } else {
      // If book has no chapters in database (e.g. uploaded scanned PDF), create a default chapter entry
      const fallbackId = uuidv4();
      await db.execute({
        sql: 'INSERT INTO chapters (id, book_id, title, order_index, content) VALUES (?, ?, ?, ?, ?)',
        args: [fallbackId, bookId, 'Dokumen PDF', 0, '[]'],
      });
      validChapterId = fallbackId;
    }
  }

  const existing = await getProgressByBookId(bookId);

  if (existing) {
    await db.execute({
      sql: `
        UPDATE reading_progress
        SET chapter_id = ?, content_position = ?, progress_percentage = ?, last_read_at = ?
        WHERE book_id = ?
      `,
      args: [validChapterId, contentPosition, progressPercentage, now, bookId],
    });
  } else {
    const id = uuidv4();
    await db.execute({
      sql: `
        INSERT INTO reading_progress (id, book_id, chapter_id, content_position, progress_percentage, last_read_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, bookId, validChapterId, contentPosition, progressPercentage, now],
    });
  }

  const updated = await getProgressByBookId(bookId);
  return updated!;
}
