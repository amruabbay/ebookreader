import type { ProcessedBook } from '@/types';
import type { ExtractedPage, ExtractedLine } from './extract';
import { detectStructure } from './structure';

interface TextItemLike {
  str: string;
  height: number;
  fontName: string;
  transform: number[];
}

/**
 * Main PDF processing pipeline.
 * Extracts text and detects chapter structure.
 */
export async function processPdf(
  buffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedBook> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  if (typeof window !== 'undefined') {
    // Browser environment: configure workerSrc
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/legacy/build/pdf.worker.min.mjs`;
  } else {
    // Setup fake worker via globalThis before initializing pdfjsLib in Node.js
    // @ts-expect-error pdfjs worker does not have typed declarations
    const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    (globalThis as unknown as { pdfjsWorker: typeof pdfjsWorker }).pdfjsWorker = pdfjsWorker;
  }

  const { getDocument } = pdfjsLib;

  // Configure CMap and standard fonts for non-Latin and embedded CID fonts
  const cMapUrl = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/cmaps/`;
  const standardFontDataUrl = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/standard_fonts/`;

  const doc = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
  } as Parameters<typeof getDocument>[0]).promise;

  // Extract metadata
  let title = '';
  let author = '';
  try {
    const metadata = await doc.getMetadata();
    const info = metadata?.info as Record<string, string> | undefined;
    title = info?.Title || '';
    author = info?.Author || '';
  } catch {
    // Metadata extraction may fail for some PDFs
  }

  // Extract text content from all pages using concurrent batches
  const pages: ExtractedPage[] = new Array(doc.numPages);
  const BATCH_SIZE = 12;

  for (let start = 1; start <= doc.numPages; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, doc.numPages);
    const batchPromises = [];

    for (let pageNum = start; pageNum <= end; pageNum++) {
      batchPromises.push(
        (async (num: number) => {
          const page = await doc.getPage(num);
          const textContent = await page.getTextContent();
          const lines: ExtractedLine[] = [];
          let currentLine: ExtractedLine | null = null;
          let lastY: number | null = null;

          for (const item of textContent.items) {
            if (!('str' in item)) continue;
            const textItem = item as TextItemLike;
            if (!textItem.str && !currentLine) continue;

            // Calculate approximate Y position and font size
            const y = Math.round(textItem.transform[5]);
            const transformHeight = Math.hypot(textItem.transform[2], textItem.transform[3]);
            const fontSize = Math.round(textItem.height || transformHeight || 12);
            const fontName = textItem.fontName || '';

            // Same line if Y position is within 3px
            if (lastY !== null && Math.abs(y - lastY) <= 3 && currentLine) {
              currentLine.text += textItem.str;
            } else {
              if (currentLine && currentLine.text.trim()) {
                lines.push(currentLine);
              }
              currentLine = { text: textItem.str, fontSize, fontName, y };
            }
            lastY = y;
          }

          if (currentLine && currentLine.text.trim()) {
            lines.push(currentLine);
          }

          page.cleanup();
          return { pageNumber: num, lines };
        })(pageNum)
      );
    }

    const batchResults = await Promise.all(batchPromises);
    for (const res of batchResults) {
      pages[res.pageNumber - 1] = res;
    }
    if (onProgress) {
      onProgress(Math.min(end, doc.numPages), doc.numPages);
    }
  }

  await doc.cleanup();

  // Calculate actual extracted text from the PDF pages
  let totalCharacters = 0;
  for (const page of pages) {
    if (page?.lines) {
      for (const line of page.lines) {
        totalCharacters += line.text.trim().length;
      }
    }
  }

  // If very little text was extracted (< 30 chars per page on average), treat as image-only / non-OCR PDF
  const avgCharsPerPage = doc.numPages > 0 ? totalCharacters / doc.numPages : 0;
  const isImageOnly = totalCharacters === 0 || avgCharsPerPage < 30;

  if (isImageOnly) {
    return {
      title: title || 'Untitled Book',
      author,
      chapters: [
        {
          title: 'PDF Document',
          orderIndex: 0,
          content: [
            {
              type: 'paragraph',
              text: `Dokumen PDF ini berisi ${doc.numPages} halaman. Ditampilkan dalam mode PDF Viewer.`,
            },
          ],
        },
      ],
      totalCharacters: 0,
      viewMode: 'pdf-viewer',
      totalPages: doc.numPages,
    };
  }

  // Detect structure
  const chapters = detectStructure(pages);


  // Infer title if not in metadata
  if (!title && chapters.length > 0 && chapters[0].content.length > 0) {
    const firstHeading = chapters[0].content.find((b) => b.type === 'heading');
    if (firstHeading) title = firstHeading.text;
  }
  if (!title) title = 'Untitled Book';

  return { title, author, chapters, totalCharacters, viewMode: 'reflow', totalPages: doc.numPages };
}
