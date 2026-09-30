import { NextRequest } from 'next/server';
import { getBookById } from '@/lib/db/books';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

/**
 * Serve the original PDF file for a book.
 * Used by the client-side PDF viewer to render pages.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    const book = await getBookById(bookId);
    if (!book) {
      return Response.json({ error: 'Book not found' }, { status: 404 });
    }

    const storageKey = book.originalFileName;

    // If stored in Vercel Blob (URL), proxy it
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      try {
        let arrayBuffer: ArrayBuffer;
        if (storageKey.includes('.private.blob.vercel-storage.com') || process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            const { get } = await import('@vercel/blob');
            const blobData = await get(storageKey, { access: 'private' });
            if (blobData && blobData.stream) {
              arrayBuffer = await new Response(blobData.stream).arrayBuffer();
            } else {
              const res = await fetch(storageKey);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              arrayBuffer = await res.arrayBuffer();
            }
          } catch {
            const res = await fetch(storageKey);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            arrayBuffer = await res.arrayBuffer();
          }
        } else {
          const res = await fetch(storageKey);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          arrayBuffer = await res.arrayBuffer();
        }

        return new Response(arrayBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${encodeURIComponent(book.title)}.pdf"`,
            'Cache-Control': 'private, max-age=3600',
          },
        });
      } catch (err) {
        console.error('Failed to fetch PDF from blob storage:', err);
        return Response.json({ error: 'Failed to load PDF file' }, { status: 500 });
      }
    }

    // Local filesystem: check uploads/ directory
    const uploadsDir = process.env.VERCEL
      ? path.join('/tmp', 'uploads')
      : path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, path.basename(storageKey));

    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'PDF file not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(book.title)}.pdf"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('PDF serve error:', error);
    return Response.json({ error: 'Failed to serve PDF' }, { status: 500 });
  }
}
