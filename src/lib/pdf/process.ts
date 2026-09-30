import type { ContentBlock, ProcessedBook } from '@/types';

interface ExtractedPage {
  pageNumber: number;
  lines: ExtractedLine[];
}

interface ExtractedLine {
  text: string;
  fontSize: number;
  fontName: string;
  y: number;
}

interface TextItemLike {
  str: string;
  height: number;
  fontName: string;
  transform: number[];
}

// Patterns that suggest a chapter heading
const CHAPTER_PATTERNS = [
  /^chapter\s+\d+/i,
  /^chapter\s+[ivxlcdm]+/i,
  /^part\s+\d+/i,
  /^part\s+[ivxlcdm]+/i,
  /^section\s+\d+/i,
  /^bab\s+\d+/i,
  /^bagian\s+\d+/i,
  /^bag\.\s*\d+/i,
  /^prologue$/i,
  /^epilogue$/i,
  /^introduction$/i,
  /^preface$/i,
  /^foreword$/i,
  /^afterword$/i,
  /^conclusion$/i,
  /^appendix/i,
  /^acknowledgements?$/i,
  /^bibliography$/i,
  /^glossary$/i,
  /^index$/i,
  /^pendahuluan$/i,
  /^kata\s+pengantar$/i,
  /^daftar\s+isi$/i,
];

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

// ── Structure Detection ──

interface ProcessedChapter {
  title: string;
  orderIndex: number;
  content: ContentBlock[];
}

function detectBodyFontSize(pages: ExtractedPage[]): number {
  const fontCounts = new Map<number, number>();
  for (const page of pages) {
    for (const line of page.lines) {
      if (!line.text.trim()) continue;
      fontCounts.set(line.fontSize, (fontCounts.get(line.fontSize) || 0) + line.text.length);
    }
  }
  let maxCount = 0;
  let bodySize = 12;
  for (const [size, count] of fontCounts) {
    if (count > maxCount) { maxCount = count; bodySize = size; }
  }
  return bodySize;
}

function isLikelyHeading(line: ExtractedLine, bodyFontSize: number): boolean {
  if (line.fontSize > bodyFontSize * 1.2) return true;
  if (CHAPTER_PATTERNS.some((p) => p.test(line.text.trim()))) return true;
  return false;
}

function isLikelyChapterBreak(line: ExtractedLine, bodyFontSize: number): boolean {
  const trimmed = line.text.trim();
  if (line.fontSize > bodyFontSize * 1.3 && CHAPTER_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (line.fontSize > bodyFontSize * 1.5 && trimmed.length < 100) return true;
  if (/^(chapter|part|bab|bagian)\s+\d+/i.test(trimmed)) return true;
  return false;
}

function detectStructure(pages: ExtractedPage[]): ProcessedChapter[] {
  const bodyFontSize = detectBodyFontSize(pages);
  const allLines: ExtractedLine[] = [];
  for (const page of pages) allLines.push(...page.lines);

  if (allLines.length === 0) {
    return [
      {
        title: 'Information',
        orderIndex: 0,
        content: [
          {
            type: 'heading',
            text: 'Scanned / Image-Only PDF Detected',
            level: 2,
          },
          {
            type: 'paragraph',
            text: 'No readable text layer was found in this PDF file. This usually happens when a PDF consists of scanned photocopies or rasterized images of pages rather than embedded digital text.',
          },
          {
            type: 'paragraph',
            text: 'Reflow-First Reading Mode transforms digital text into responsive typography (custom fonts, themes, and dynamic font sizing). To read this book in Reflow Mode, please use a digital PDF with a selectable text layer (or one that has undergone OCR).',
          },
        ],
      },
    ];
  }

  const breakPoints: number[] = [];
  for (let i = 0; i < allLines.length; i++) {
    if (isLikelyChapterBreak(allLines[i], bodyFontSize)) breakPoints.push(i);
  }

  if (breakPoints.length === 0) {
    return [{ title: 'Full Content', orderIndex: 0, content: buildContentBlocks(allLines, bodyFontSize) }];
  }

  const chapters: ProcessedChapter[] = [];

  // Content before first chapter
  if (breakPoints[0] > 0) {
    const pre = buildContentBlocks(allLines.slice(0, breakPoints[0]), bodyFontSize);
    if (pre.length > 0 && pre.some((b) => b.text.trim().length > 20)) {
      chapters.push({ title: 'Preface', orderIndex: 0, content: pre });
    }
  }

  for (let i = 0; i < breakPoints.length; i++) {
    const start = breakPoints[i];
    const end = i + 1 < breakPoints.length ? breakPoints[i + 1] : allLines.length;
    const chapterLines = allLines.slice(start, end);

    let fullTitle = chapterLines[0]?.text.trim() || `Chapter ${chapters.length + 1}`;
    let contentStart = 1;

    if (chapterLines.length > 1 && isLikelyHeading(chapterLines[1], bodyFontSize)) {
      fullTitle = `${fullTitle} — ${chapterLines[1].text.trim()}`;
      contentStart = 2;
    }

    chapters.push({
      title: fullTitle,
      orderIndex: chapters.length,
      content: buildContentBlocks(chapterLines.slice(contentStart), bodyFontSize),
    });
  }

  chapters.forEach((ch, i) => { ch.orderIndex = i; });
  return chapters;
}

function buildContentBlocks(lines: ExtractedLine[], bodyFontSize: number): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let currentParagraph = '';

  for (const line of lines) {
    const trimmed = line.text.trim();
    if (!trimmed) {
      if (currentParagraph.trim()) {
        blocks.push({ type: 'paragraph', text: currentParagraph.trim() });
        currentParagraph = '';
      }
      continue;
    }

    if (isLikelyHeading(line, bodyFontSize)) {
      if (currentParagraph.trim()) {
        blocks.push({ type: 'paragraph', text: currentParagraph.trim() });
        currentParagraph = '';
      }
      const level = line.fontSize > bodyFontSize * 1.5 ? 1 : line.fontSize > bodyFontSize * 1.2 ? 2 : 3;
      blocks.push({ type: 'heading', text: trimmed, level });
    } else {
      if (currentParagraph && !currentParagraph.endsWith('-')) {
        currentParagraph += ' ';
      } else if (currentParagraph.endsWith('-')) {
        currentParagraph = currentParagraph.slice(0, -1);
      }
      currentParagraph += trimmed;
    }
  }

  if (currentParagraph.trim()) {
    blocks.push({ type: 'paragraph', text: currentParagraph.trim() });
  }

  return blocks;
}
