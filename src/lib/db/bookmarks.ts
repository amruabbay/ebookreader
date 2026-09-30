import { getDbClient, ensureSchema } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Bookmark } from '@/types';
import type { Row } from '@libsql/client';

function rowToBookmark(row: Row): Bookmark {
  return {
    id: String(row.id),
    bookId: String(row.book_id),
    chapterId: String(row.chapter_id),
    contentPosition: Number(row.content_position || 0),
    label: String(row.label || ''),
    createdAt: String(row.created_at),
  };
}

export async function getBookmarksByBookId(bookId: string): Promise<Bookmark[]> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC',
    args: [bookId],
  });
  return res.rows.map(rowToBookmark);
}

export async function createBookmark(
  bookId: string,
  chapterId: string,
  contentPosition: number,
  label: string = ''
): Promise<Bookmark> {
  await ensureSchema();
  const db = getDbClient();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO bookmarks (id, book_id, chapter_id, content_position, label, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [id, bookId, chapterId, contentPosition, label, now],
  });

  const res = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE id = ?',
    args: [id],
  });
  return rowToBookmark(res.rows[0]);
}

export async function deleteBookmark(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'DELETE FROM bookmarks WHERE id = ?',
    args: [id],
  });
  return res.rowsAffected > 0;
}
