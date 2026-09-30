import { getDbClient, ensureSchema } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Highlight, HighlightColor } from '@/types';
import type { Row } from '@libsql/client';

function rowToHighlight(row: Row): Highlight {
  return {
    id: String(row.id),
    bookId: String(row.book_id),
    chapterId: String(row.chapter_id),
    selectedText: String(row.selected_text),
    startOffset: Number(row.start_offset || 0),
    endOffset: Number(row.end_offset || 0),
    color: String(row.color) as HighlightColor,
    createdAt: String(row.created_at),
  };
}

export async function getHighlightsByBookId(bookId: string): Promise<Highlight[]> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at ASC',
    args: [bookId],
  });
  return res.rows.map(rowToHighlight);
}

export async function getHighlightsByChapterId(chapterId: string): Promise<Highlight[]> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM highlights WHERE chapter_id = ? ORDER BY start_offset ASC',
    args: [chapterId],
  });
  return res.rows.map(rowToHighlight);
}

export async function createHighlight(
  bookId: string,
  chapterId: string,
  selectedText: string,
  startOffset: number,
  endOffset: number,
  color: HighlightColor = 'yellow'
): Promise<Highlight> {
  await ensureSchema();
  const db = getDbClient();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO highlights (id, book_id, chapter_id, selected_text, start_offset, end_offset, color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [id, bookId, chapterId, selectedText, startOffset, endOffset, color, now],
  });

  const res = await db.execute({
    sql: 'SELECT * FROM highlights WHERE id = ?',
    args: [id],
  });
  return rowToHighlight(res.rows[0]);
}

export async function updateHighlightColor(id: string, color: HighlightColor): Promise<Highlight | null> {
  await ensureSchema();
  const db = getDbClient();
  await db.execute({
    sql: 'UPDATE highlights SET color = ? WHERE id = ?',
    args: [color, id],
  });
  const res = await db.execute({
    sql: 'SELECT * FROM highlights WHERE id = ?',
    args: [id],
  });
  return res.rows[0] ? rowToHighlight(res.rows[0]) : null;
}

export async function deleteHighlight(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDbClient();
  try {
    // 1. Delete associated notes first to prevent foreign key errors
    await db.execute({
      sql: 'DELETE FROM notes WHERE highlight_id = ?',
      args: [id],
    });
  } catch (err) {
    console.error('Failed to delete associated notes for highlight:', err);
  }

  // 2. Delete the highlight
  const res = await db.execute({
    sql: 'DELETE FROM highlights WHERE id = ?',
    args: [id],
  });
  return res.rowsAffected > 0;
}
