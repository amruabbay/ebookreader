import { getDocument, type PDFDocumentProxy, type PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export interface ExtractedPage {
  pageNumber: number;
  lines: ExtractedLine[];
}

export interface ExtractedLine {
  text: string;
  fontSize: number;
  fontName: string;
  y: number; // vertical position on page, used for structure detection
}

/**
 * Extract text content from a PDF file buffer.
 * Groups text items into lines based on vertical position.
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<ExtractedPage[]> {
  const doc: PDFDocumentProxy = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  const pages: ExtractedPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page: PDFPageProxy = await doc.getPage(i);
    const textContent = await page.getTextContent();

    const lines: ExtractedLine[] = [];
    let currentLine: ExtractedLine | null = null;
    let lastY: number | null = null;

    for (const item of textContent.items) {
      // Skip non-text items (marked content, etc.)
      if (!('str' in item)) continue;
      const textItem = item as TextItem;
      if (!textItem.str.trim() && !currentLine) continue;

      const y = Math.round(textItem.transform[5]);
      const fontSize = Math.round(textItem.height || 12);
      const fontName = textItem.fontName || '';

      // Same line if Y position is close enough (within 2px)
      if (lastY !== null && Math.abs(y - lastY) <= 2 && currentLine) {
        currentLine.text += textItem.str;
      } else {
        // New line
        if (currentLine && currentLine.text.trim()) {
          lines.push(currentLine);
        }
        currentLine = {
          text: textItem.str,
          fontSize,
          fontName,
          y,
        };
      }
      lastY = y;
    }

    // Push the last line
    if (currentLine && currentLine.text.trim()) {
      lines.push(currentLine);
    }

    pages.push({ pageNumber: i, lines });
    page.cleanup();
  }

  await doc.cleanup();

  return pages;
}

/**
 * Extract basic metadata from a PDF document.
 */
export async function extractPdfMetadata(
  buffer: ArrayBuffer
): Promise<{ title: string; author: string }> {
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  const metadata = await doc.getMetadata();
  const info = metadata?.info as Record<string, string> | undefined;

  const title = info?.Title || '';
  const author = info?.Author || '';

  await doc.cleanup();

  return { title, author };
}
