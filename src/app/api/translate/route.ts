import { NextRequest, NextResponse } from 'next/server';
import { getChapterById } from '@/lib/db/chapters';
import { getChapterTranslation, saveChapterTranslation } from '@/lib/db/translations';
import { translateBlocks, translateSingleText } from '@/lib/translate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const lang = searchParams.get('lang') || 'id';

    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId is required' }, { status: 400 });
    }

    const translation = await getChapterTranslation(chapterId, lang);
    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch translation' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, targetLang = 'id' } = body;

    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId is required' }, { status: 400 });
    }

    // Check database cache first
    const existing = await getChapterTranslation(chapterId, targetLang);
    if (existing) {
      return NextResponse.json({ success: true, translation: existing, cached: true });
    }

    // Fetch original chapter
    const chapter = await getChapterById(chapterId);
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Translate title and content blocks
    const [translatedTitle, translatedContent] = await Promise.all([
      translateSingleText(chapter.title, 'en', targetLang),
      translateBlocks(chapter.content, 'en', targetLang),
    ]);

    // Save to database
    const saved = await saveChapterTranslation(
      chapterId,
      targetLang,
      translatedTitle || chapter.title,
      translatedContent
    );

    return NextResponse.json({ success: true, translation: saved, cached: false });
  } catch (error) {
    console.error('Translation POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}
