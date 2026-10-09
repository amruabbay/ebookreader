import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

let client: Client | null = null;
let initialized = false;

export function getDbClient(): Client {
  if (!client) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl) {
      // Connect to remote Turso database
      client = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken,
      });
    } else {
      // Local SQLite fallback
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'ebook-reader.db');
      client = createClient({
        url: `file:${dbPath}`,
      });
    }
  }

  return client;
}

export async function ensureSchema(): Promise<void> {
  if (initialized) return;

  const db = getDbClient();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      cover_url TEXT,
      original_file_name TEXT NOT NULL,
      total_characters INTEGER NOT NULL DEFAULT 0,
      total_chapters INTEGER NOT NULL DEFAULT 0,
      total_pages INTEGER NOT NULL DEFAULT 0,
      view_mode TEXT NOT NULL DEFAULT 'reflow',
      status TEXT NOT NULL DEFAULT 'processing',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      content TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id TEXT PRIMARY KEY,
      reader_id TEXT NOT NULL DEFAULT 'default',
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      content_position INTEGER NOT NULL DEFAULT 0,
      progress_percentage REAL NOT NULL DEFAULT 0,
      last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(book_id, reader_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      reader_id TEXT NOT NULL DEFAULT 'default',
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      selected_text TEXT NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT 'yellow',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      reader_id TEXT NOT NULL DEFAULT 'default',
      book_id TEXT NOT NULL,
      highlight_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (highlight_id) REFERENCES highlights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      reader_id TEXT NOT NULL DEFAULT 'default',
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      content_position INTEGER NOT NULL DEFAULT 0,
      label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapter_translations (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      target_lang TEXT NOT NULL DEFAULT 'id',
      translated_title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(chapter_id, target_lang),
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );
  `);

  // Migrations for existing databases
  try {
    await db.execute("ALTER TABLE books ADD COLUMN total_pages INTEGER NOT NULL DEFAULT 0");
  } catch {
    // Column may already exist
  }
  try {
    await db.execute("ALTER TABLE books ADD COLUMN view_mode TEXT NOT NULL DEFAULT 'reflow'");
  } catch {
    // Column may already exist
  }

  // Migrations for reading_progress (reader_id support)
  try {
    const tableInfo = await db.execute("PRAGMA table_info(reading_progress)");
    const hasReaderId = tableInfo.rows.some((r) => r.name === 'reader_id');
    if (!hasReaderId) {
      await db.executeMultiple(`
        CREATE TABLE IF NOT EXISTS reading_progress_v2 (
          id TEXT PRIMARY KEY,
          reader_id TEXT NOT NULL DEFAULT 'default',
          book_id TEXT NOT NULL,
          chapter_id TEXT NOT NULL,
          content_position INTEGER NOT NULL DEFAULT 0,
          progress_percentage REAL NOT NULL DEFAULT 0,
          last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(book_id, reader_id),
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO reading_progress_v2 (id, reader_id, book_id, chapter_id, content_position, progress_percentage, last_read_at)
          SELECT id, 'default', book_id, chapter_id, content_position, progress_percentage, last_read_at FROM reading_progress;
        DROP TABLE reading_progress;
        ALTER TABLE reading_progress_v2 RENAME TO reading_progress;
      `);
    }
  } catch (err) {
    console.warn('Failed to migrate reading_progress schema:', err);
  }

  try {
    await db.execute("ALTER TABLE bookmarks ADD COLUMN reader_id TEXT NOT NULL DEFAULT 'default'");
  } catch {}
  try {
    await db.execute("CREATE INDEX IF NOT EXISTS idx_bookmarks_reader ON bookmarks(reader_id, book_id)");
  } catch {}

  try {
    await db.execute("ALTER TABLE highlights ADD COLUMN reader_id TEXT NOT NULL DEFAULT 'default'");
  } catch {}
  try {
    await db.execute("CREATE INDEX IF NOT EXISTS idx_highlights_reader ON highlights(reader_id, book_id)");
  } catch {}

  try {
    await db.execute("ALTER TABLE notes ADD COLUMN reader_id TEXT NOT NULL DEFAULT 'default'");
  } catch {}
  try {
    await db.execute("CREATE INDEX IF NOT EXISTS idx_notes_reader ON notes(reader_id, book_id)");
  } catch {}

  initialized = true;
}
