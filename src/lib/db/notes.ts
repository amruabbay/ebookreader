import { getDbClient, ensureSchema } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Note } from '@/types';
import type { Row } from '@libsql/client';

function rowToNote(row: Row): Note {
  return {
    id: String(row.id),
    bookId: String(row.book_id),
    highlightId: String(row.highlight_id),
    content: String(row.content),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getNotesByBookId(bookId: string): Promise<Note[]> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM notes WHERE book_id = ? ORDER BY created_at DESC',
    args: [bookId],
  });
  return res.rows.map(rowToNote);
}

export async function getNoteByHighlightId(highlightId: string): Promise<Note | null> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM notes WHERE highlight_id = ?',
    args: [highlightId],
  });
  return res.rows[0] ? rowToNote(res.rows[0]) : null;
}

export async function upsertNote(bookId: string, highlightId: string, content: string): Promise<Note> {
  await ensureSchema();
  const db = getDbClient();
  const now = new Date().toISOString();
  const existing = await getNoteByHighlightId(highlightId);

  if (existing) {
    await db.execute({
      sql: 'UPDATE notes SET content = ?, updated_at = ? WHERE id = ?',
      args: [content, now, existing.id],
    });
    return { ...existing, content, updatedAt: now };
  } else {
    const id = uuidv4();
    await db.execute({
      sql: `
        INSERT INTO notes (id, book_id, highlight_id, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, bookId, highlightId, content, now, now],
    });
    const res = await db.execute({
      sql: 'SELECT * FROM notes WHERE id = ?',
      args: [id],
    });
    return rowToNote(res.rows[0]);
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'DELETE FROM notes WHERE id = ?',
    args: [id],
  });
  return res.rowsAffected > 0;
}
