import { getDbClient, ensureSchema } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Bookmark } from '@/types';
import type { Row } from '@libsql/client';

function rowToBookmark(row: Row): Bookmark {
  return {
    id: String(row.id),
    readerId: row.reader_id ? String(row.reader_id) : 'default',
    bookId: String(row.book_id),
    chapterId: String(row.chapter_id),
    contentPosition: Number(row.content_position || 0),
    label: String(row.label || ''),
    createdAt: String(row.created_at),
  };
}

export async function getBookmarksByBookId(
  bookId: string,
  readerId: string = 'default'
): Promise<Bookmark[]> {
  await ensureSchema();
  const db = getDbClient();
  const cleanReaderId = readerId || 'default';
  const res = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE book_id = ? AND reader_id = ? ORDER BY created_at DESC',
    args: [bookId, cleanReaderId],
  });
  return res.rows.map(rowToBookmark);
}

export async function createBookmark(
  bookId: string,
  chapterId: string,
  contentPosition: number,
  label: string = '',
  readerId: string = 'default'
): Promise<Bookmark> {
  await ensureSchema();
  const db = getDbClient();
  const cleanReaderId = readerId || 'default';

  // If already exists for this book, chapter & reader, update position and label
  const existing = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE book_id = ? AND chapter_id = ? AND reader_id = ? LIMIT 1',
    args: [bookId, chapterId, cleanReaderId],
  });

  if (existing.rows.length > 0) {
    const existingId = String(existing.rows[0].id);
    const now = new Date().toISOString();
    await db.execute({
      sql: 'UPDATE bookmarks SET content_position = ?, label = ?, created_at = ? WHERE id = ?',
      args: [contentPosition, label, now, existingId],
    });
    const updated = await db.execute({
      sql: 'SELECT * FROM bookmarks WHERE id = ?',
      args: [existingId],
    });
    return rowToBookmark(updated.rows[0]);
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO bookmarks (id, reader_id, book_id, chapter_id, content_position, label, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [id, cleanReaderId, bookId, chapterId, contentPosition, label, now],
  });

  const res = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE id = ?',
    args: [id],
  });
  return rowToBookmark(res.rows[0]);
}

export async function deleteBookmark(id: string, readerId?: string): Promise<boolean> {
  await ensureSchema();
  const db = getDbClient();
  if (readerId) {
    await db.execute({
      sql: 'DELETE FROM bookmarks WHERE id = ? AND reader_id = ?',
      args: [id, readerId],
    });
  } else {
    await db.execute({
      sql: 'DELETE FROM bookmarks WHERE id = ?',
      args: [id],
    });
  }
  return true;
}

export async function deleteBookmarkByChapter(
  bookId: string,
  chapterId: string,
  readerId: string = 'default'
): Promise<boolean> {
  await ensureSchema();
  const db = getDbClient();
  const cleanReaderId = readerId || 'default';
  await db.execute({
    sql: 'DELETE FROM bookmarks WHERE book_id = ? AND chapter_id = ? AND reader_id = ?',
    args: [bookId, chapterId, cleanReaderId],
  });
  return true;
}
