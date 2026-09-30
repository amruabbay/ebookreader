import { getDbClient, ensureSchema } from './index';
import type { ContentBlock } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface ChapterTranslation {
  id: string;
  chapterId: string;
  targetLang: string;
  translatedTitle: string;
  content: ContentBlock[];
  createdAt: string;
}

export async function getChapterTranslation(
  chapterId: string,
  targetLang: string = 'id'
): Promise<ChapterTranslation | null> {
  await ensureSchema();
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT id, chapter_id, target_lang, translated_title, content, created_at FROM chapter_translations WHERE chapter_id = ? AND target_lang = ? LIMIT 1',
    args: [chapterId, targetLang],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    chapterId: row.chapter_id as string,
    targetLang: row.target_lang as string,
    translatedTitle: row.translated_title as string,
    content: JSON.parse(row.content as string),
    createdAt: row.created_at as string,
  };
}

export async function saveChapterTranslation(
  chapterId: string,
  targetLang: string,
  translatedTitle: string,
  content: ContentBlock[]
): Promise<ChapterTranslation> {
  await ensureSchema();
  const db = getDbClient();
  const id = uuidv4();
  const contentJson = JSON.stringify(content);

  await db.execute({
    sql: `INSERT INTO chapter_translations (id, chapter_id, target_lang, translated_title, content, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(chapter_id, target_lang) DO UPDATE SET
            translated_title = excluded.translated_title,
            content = excluded.content,
            created_at = excluded.created_at`,
    args: [id, chapterId, targetLang, translatedTitle, contentJson],
  });

  return {
    id,
    chapterId,
    targetLang,
    translatedTitle,
    content,
    createdAt: new Date().toISOString(),
  };
}
