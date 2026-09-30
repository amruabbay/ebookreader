import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createBook, updateBook } from '@/lib/db/books';
import { createChaptersBatch } from '@/lib/db/chapters';
import { processPdf } from '@/lib/pdf/process';
import { saveFile } from '@/lib/storage';

import { processEpub } from '@/lib/epub/process';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s execution timeout for serverless

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let arrayBuffer: ArrayBuffer;
    let originalName: string;
    let storedFileName: string;
    let isEpub = false;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { blobUrl, fileName, processed: clientProcessed } = body;

      if (!blobUrl) {
        return Response.json({ error: 'blobUrl is required' }, { status: 400 });
      }

      isEpub = (fileName || '').toLowerCase().endsWith('.epub');
      originalName = (fileName || 'book').replace(/\.(pdf|epub)$/i, '');
      storedFileName = blobUrl;

      // If client pre-extracted text and chapters, save directly to DB (<1s)
      if (clientProcessed && clientProcessed.chapters) {
        const book = await createBook(originalName, storedFileName);
        if (clientProcessed.chapters.length > 0) {
          await createChaptersBatch(book.id, clientProcessed.chapters);
        }
        const finalTitle = clientProcessed.title && clientProcessed.title !== 'Untitled Book' ? clientProcessed.title : originalName;
        const updatedBook = await updateBook(book.id, {
          title: finalTitle,
          author: clientProcessed.author || '',
          coverUrl: clientProcessed.coverUrl || null,
          totalCharacters: clientProcessed.totalCharacters || 0,
          totalChapters: clientProcessed.chapters.length,
          totalPages: clientProcessed.totalPages || 0,
          viewMode: clientProcessed.viewMode || 'reflow',
          status: 'ready',
        });
        return Response.json(updatedBook || { ...book, status: 'ready', title: finalTitle }, { status: 201 });
      }

      if (blobUrl.includes('.private.blob.vercel-storage.com') || process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const { get } = await import('@vercel/blob');
          const blobData = await get(blobUrl, { access: 'private' });
          if (blobData && blobData.stream) {
            arrayBuffer = await new Response(blobData.stream).arrayBuffer();
          } else {
            const res = await fetch(blobUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            arrayBuffer = await res.arrayBuffer();
          }
        } catch {
          const res = await fetch(blobUrl);
          if (!res.ok) {
            return Response.json({ error: 'Failed to download uploaded file from storage' }, { status: 400 });
          }
          arrayBuffer = await res.arrayBuffer();
        }
      } else {
        const res = await fetch(blobUrl);
        if (!res.ok) {
          return Response.json({ error: 'Failed to download uploaded file from storage' }, { status: 400 });
        }
        arrayBuffer = await res.arrayBuffer();
      }
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }

      const lowerName = file.name.toLowerCase();
      isEpub = lowerName.endsWith('.epub');
      const isPdf = lowerName.endsWith('.pdf');

      if (!isEpub && !isPdf) {
        return Response.json({ error: 'Only PDF and EPUB files are supported' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return Response.json({ error: 'File size exceeds 100MB limit' }, { status: 400 });
      }

      originalName = file.name.replace(/\.(pdf|epub)$/i, '');
      const fileId = uuidv4();
      const ext = isEpub ? '.epub' : '.pdf';
      const fileName = `${fileId}${ext}`;

      arrayBuffer = await file.arrayBuffer();

      // Save file to Vercel Blob or /tmp
      const storageResult = await saveFile(file, fileName);
      storedFileName = storageResult.storageKey;
    }

    // Create initial book record
    const book = await createBook(originalName, storedFileName);

    try {
      // Process file: extract text and detect structure
      const processed = isEpub ? await processEpub(arrayBuffer) : await processPdf(arrayBuffer);

      // Save chapters
      if (processed.chapters.length > 0) {
        await createChaptersBatch(book.id, processed.chapters);
      }

      // Update book with extracted metadata
      const finalTitle = processed.title && processed.title !== 'Untitled Book' ? processed.title : originalName;
      const updatedBook = await updateBook(book.id, {
        title: finalTitle,
        author: processed.author,
        coverUrl: processed.coverUrl || null,
        totalCharacters: processed.totalCharacters,
        totalChapters: processed.chapters.length,
        totalPages: processed.totalPages || 0,
        viewMode: processed.viewMode || 'reflow',
        status: 'ready',
      });

      return Response.json(updatedBook || { ...book, status: 'ready', title: finalTitle }, { status: 201 });
    } catch (processError) {
      console.error('File processing failed:', processError);
      await updateBook(book.id, { status: 'failed' });
      const msg = processError instanceof Error ? processError.message : 'Unknown error';
      return Response.json(
        { error: `Failed to process ${isEpub ? 'EPUB' : 'PDF'}: ${msg}`, bookId: book.id },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return Response.json({ error: msg }, { status: 500 });
  }
}
