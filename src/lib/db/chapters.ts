import { getDbClient, ensureSchema } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Chapter, ContentBlock, ChapterNavItem } from '@/types';
import type { Row } from '@libsql/client';

function rowToChapter(row: Row): Chapter {
  return {
    id: String(row.id),
    bookId: String(row.book_id),
    title: String(row.title),
    orderIndex: Number(row.order_index),
    content: JSON.parse(String(row.content)) as ContentBlock[],
  };
}

export async function createChapter(
  bookId: string,
  title: string,
  orderIndex: number,
  content: ContentBlock[]
): Promise<Chapter> {
  await ensureSchema();
  const db = getDbClient();
  const id = uuidv4();

  await db.execute({
    sql: `
      INSERT INTO chapters (id, book_id, title, order_index, content)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [id, bookId, title, orderIndex, JSON.stringify(content)],
  });

  const ch = await getChapterById(id);
  return ch!;
}

export async function createChaptersBatch(
  bookId: string,
  chapters: { title: string; orderIndex: number; content: ContentBlock[] }[]
): Promise<void> {
  if (chapters.length === 0) return;
  await ensureSchema();
  const db = getDbClient();

  const statements = chapters.map((ch) => ({
    sql: `
      INSERT INTO chapters (id, book_id, title, order_index, content)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [uuidv4(), bookId, ch.title, ch.orderIndex, JSON.stringify(ch.content)],
  }));

  // Batch insert in chunks of 25 to avoid HTTP payload or transaction size limits
  const CHUNK_SIZE = 25;
  for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    await db.batch(statements.slice(i, i + CHUNK_SIZE), 'write');
  }
}

export async function getChapterById(id: string): Promise<Chapter | null> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM chapters WHERE id = ?',
    args: [id],
  });
  return res.rows[0] ? rowToChapter(res.rows[0]) : null;
}

export async function getChaptersByBookId(bookId: string): Promise<Chapter[]> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM chapters WHERE book_id = ? ORDER BY order_index',
    args: [bookId],
  });
  return res.rows.map(rowToChapter);
}

export async function getChapterNavItems(bookId: string): Promise<ChapterNavItem[]> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT id, title, order_index FROM chapters WHERE book_id = ? ORDER BY order_index',
    args: [bookId],
  });
  return res.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    orderIndex: Number(row.order_index),
  }));
}

export async function deleteChaptersByBookId(bookId: string): Promise<void> {
  await ensureSchema();
  const db = getDbClient();
  await db.execute({
    sql: 'DELETE FROM chapters WHERE book_id = ?',
    args: [bookId],
  });
}
