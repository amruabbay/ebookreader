import { getDbClient, ensureSchema } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Book, BookWithProgress, ReadingProgress, BookStatus, ViewMode } from '@/types';
import type { Row } from '@libsql/client';

function rowToBook(row: Row): Book {
  return {
    id: String(row.id),
    title: String(row.title),
    author: String(row.author || ''),
    coverUrl: row.cover_url ? String(row.cover_url) : null,
    originalFileName: String(row.original_file_name),
    totalCharacters: Number(row.total_characters || 0),
    totalChapters: Number(row.total_chapters || 0),
    totalPages: Number(row.total_pages || 0),
    viewMode: (String(row.view_mode || 'reflow') as ViewMode),
    status: String(row.status) as BookStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

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

export async function createBook(
  title: string,
  originalFileName: string
): Promise<Book> {
  await ensureSchema();
  const db = getDbClient();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO books (id, title, original_file_name, status, created_at, updated_at)
      VALUES (?, ?, ?, 'processing', ?, ?)
    `,
    args: [id, title, originalFileName, now, now],
  });

  const book = await getBookById(id);
  return book!;
}

export async function getBookById(id: string): Promise<Book | null> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM books WHERE id = ?',
    args: [id],
  });
  return res.rows[0] ? rowToBook(res.rows[0]) : null;
}

export async function getAllBooks(): Promise<Book[]> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM books ORDER BY updated_at DESC');
  return res.rows.map(rowToBook);
}

export async function getAllBooksWithProgress(readerId: string = 'default'): Promise<BookWithProgress[]> {
  await ensureSchema();
  const db = getDbClient();
  const books = await getAllBooks();
  const cleanReaderId = readerId || 'default';

  const progressRes = await db.execute({
    sql: 'SELECT * FROM reading_progress WHERE reader_id = ?',
    args: [cleanReaderId],
  });
  const progressMap = new Map<string, ReadingProgress>();
  for (const row of progressRes.rows) {
    const p = rowToProgress(row);
    progressMap.set(p.bookId, p);
  }

  return books.map((book) => ({
    ...book,
    progress: progressMap.get(book.id) || null,
  }));
}

export async function updateBook(
  id: string,
  updates: Partial<Pick<Book, 'title' | 'author' | 'coverUrl' | 'totalCharacters' | 'totalChapters' | 'totalPages' | 'viewMode' | 'status'>>
): Promise<Book | null> {
  await ensureSchema();
  const db = getDbClient();
  const now = new Date().toISOString();
  const book = await getBookById(id);
  if (!book) return null;

  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.author !== undefined) { fields.push('author = ?'); values.push(updates.author); }
  if (updates.coverUrl !== undefined) { fields.push('cover_url = ?'); values.push(updates.coverUrl); }
  if (updates.totalCharacters !== undefined) { fields.push('total_characters = ?'); values.push(updates.totalCharacters); }
  if (updates.totalChapters !== undefined) { fields.push('total_chapters = ?'); values.push(updates.totalChapters); }
  if (updates.totalPages !== undefined) { fields.push('total_pages = ?'); values.push(updates.totalPages); }
  if (updates.viewMode !== undefined) { fields.push('view_mode = ?'); values.push(updates.viewMode); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }

  values.push(id);
  await db.execute({
    sql: `UPDATE books SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  });

  return getBookById(id);
}

export async function deleteBook(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'DELETE FROM books WHERE id = ?',
    args: [id],
  });
  return res.rowsAffected > 0;
}
