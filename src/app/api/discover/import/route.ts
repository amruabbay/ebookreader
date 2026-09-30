import { NextRequest } from 'next/server';
import { createBook, updateBook } from '@/lib/db/books';
import { createChaptersBatch } from '@/lib/db/chapters';
import { processEpub } from '@/lib/epub/process';
import { buildEpubCandidateUrls, buildCoverUrl } from '@/lib/gutenberg';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ImportRequest {
  id: number;
  title: string;
  author: string;
  coverUrl?: string | null;
  epubUrl?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();
    const { id, title, author, coverUrl, epubUrl } = body;

    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    // Build candidate download URLs with PGLAF mirror first
    const candidateUrls = buildEpubCandidateUrls(id, epubUrl);

    let epubBuffer: ArrayBuffer | null = null;
    let fetchErrorMsg = '';

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
            Accept: 'application/epub+zip,application/octet-stream,*/*',
          },
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timeout);

        if (res.ok) {
          const buf = await res.arrayBuffer();
          // Check for valid zip/epub header (PK\x03\x04 = 0x50 0x4B 0x03 0x04)
          const uint8 = new Uint8Array(buf.slice(0, 4));
          if (uint8[0] === 0x50 && uint8[1] === 0x4b) {
            epubBuffer = buf;
            break;
          }
        }
      } catch (err) {
        fetchErrorMsg = err instanceof Error ? err.message : String(err);
      }
    }

    // Create the initial book record
    const storageKey = epubUrl || `gutenberg-${id}.epub`;
    const book = await createBook(title, storageKey);

    // Use mirror cover URL (the original gutenberg.org cover URLs are often blocked)
    const mirrorCoverUrl = buildCoverUrl(id);
    const finalCoverUrl = mirrorCoverUrl || coverUrl || null;

    if (epubBuffer) {
      // Process EPUB into structured chapters
      const processed = await processEpub(epubBuffer);

      if (processed.chapters.length > 0) {
        await createChaptersBatch(book.id, processed.chapters);
      }

      const finalTitle = processed.title && processed.title !== 'Untitled Book' ? processed.title : title;
      const finalAuthor = processed.author && processed.author !== 'Unknown Author' ? processed.author : author;
      // Prefer: EPUB internal cover → mirror cover → API cover
      const cover = processed.coverUrl || finalCoverUrl;

      const updatedBook = await updateBook(book.id, {
        title: finalTitle,
        author: finalAuthor,
        coverUrl: cover,
        totalCharacters: processed.totalCharacters,
        totalChapters: processed.chapters.length,
        status: 'ready',
      });

      return Response.json({ success: true, book: updatedBook || book }, { status: 201 });
    } else {
      // If EPUB cannot be downloaded
      await updateBook(book.id, {
        title,
        author,
        coverUrl: finalCoverUrl,
        status: 'failed',
      });

      return Response.json(
        {
          error: `Could not download EPUB for "${title}". Network error: ${fetchErrorMsg || 'Host unreachable'}. You can download the EPUB file manually and upload it directly.`,
          bookId: book.id,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Import error:', error);
    const msg = error instanceof Error ? error.message : 'Import failed';
    return Response.json({ error: msg }, { status: 500 });
  }
}
