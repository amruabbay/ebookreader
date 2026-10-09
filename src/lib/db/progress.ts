import { getDbClient, ensureSchema } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { ReadingProgress } from '@/types';
import type { Row } from '@libsql/client';

function rowToProgress(row: Row): ReadingProgress {
  return {
    id: String(row.id),
    readerId: row.reader_id ? String(row.reader_id) : 'default',
    bookId: String(row.book_id),
    chapterId: String(row.chapter_id),
    contentPosition: Number(row.content_position || 0),
    progressPercentage: Number(row.progress_percentage || 0),
    lastReadAt: String(row.last_read_at),
  };
}

export async function getProgressByBookId(
  bookId: string,
  readerId: string = 'default'
): Promise<ReadingProgress | null> {
  await ensureSchema();
  const db = getDbClient();
  const cleanReaderId = readerId || 'default';
  const res = await db.execute({
    sql: 'SELECT * FROM reading_progress WHERE book_id = ? AND reader_id = ?',
    args: [bookId, cleanReaderId],
  });
  return res.rows[0] ? rowToProgress(res.rows[0]) : null;
}

export async function upsertProgress(
  bookId: string,
  chapterId: string,
  contentPosition: number,
  progressPercentage: number,
  readerId: string = 'default'
): Promise<ReadingProgress> {
  await ensureSchema();
  const db = getDbClient();
  const now = new Date().toISOString();
  const cleanReaderId = readerId || 'default';

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

  const existing = await getProgressByBookId(bookId, cleanReaderId);

  if (existing) {
    await db.execute({
      sql: `
        UPDATE reading_progress
        SET chapter_id = ?, content_position = ?, progress_percentage = ?, last_read_at = ?
        WHERE book_id = ? AND reader_id = ?
      `,
      args: [validChapterId, contentPosition, progressPercentage, now, bookId, cleanReaderId],
    });
  } else {
    const id = uuidv4();
    await db.execute({
      sql: `
        INSERT INTO reading_progress (id, reader_id, book_id, chapter_id, content_position, progress_percentage, last_read_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, cleanReaderId, bookId, validChapterId, contentPosition, progressPercentage, now],
    });
  }

  const updated = await getProgressByBookId(bookId, cleanReaderId);
  return updated!;
}
