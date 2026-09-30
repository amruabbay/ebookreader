import type { ExtractedPage, ExtractedLine } from './extract';
import type { ContentBlock, ProcessedChapter } from '@/types';

const CHAPTER_PATTERNS: RegExp[] = [
  /^chapter\s+\d+/i,
  /^chapter\s+[ivxlcdm]+/i,
  /^part\s+\d+/i,
  /^part\s+[ivxlcdm]+/i,
  /^section\s+\d+/i,
  /^unit\s+\d+/i,
  /^act\s+\d+/i,
  /^act\s+[ivxlcdm]+/i,
  /^scene\s+\d+/i,
  /^scene\s+[ivxlcdm]+/i,
  /^babak\s+\d+/i,
  /^babak\s+[ivxlcdm]+/i,
  /^adegan\s+\d+/i,
  /^adegan\s+[ivxlcdm]+/i,
  /^dramatis\s+person/i,
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
  /^bab\s+\d+/i,
  /^bab\s+[ivxlcdm]+/i,
  /^bagian\s+\d+/i,
  /^bagian\s+[ivxlcdm]+/i,
  /^pendahuluan$/i,
  /^kesimpulan$/i,
  /^daftar\s+pustaka$/i,
  /^kata\s+pengantar$/i,
  /^prolog$/i,
  /^epilog$/i,
  /^lampiran/i,
];

function isOcrArtifact(text: string): boolean {
  const t = text.trim();
  if (t.length <= 1) return true;
  if (/^\d+$/.test(t)) return true;
  const alphaCount = (t.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
  if (alphaCount < 2) return true;
  const nonSpaceLen = t.replace(/\s/g, '').length;
  if (nonSpaceLen > 0 && alphaCount / nonSpaceLen < 0.5 && t.length < 10) return true;
  if (/^\d+\s{2,}/.test(t) || /\s{2,}\d+$/.test(t)) return true;
  if (/^\s*[A-Z]{1,3}\s*$/.test(t)) return true;
  return false;
}

function buildRunningHeaderSet(pages: ExtractedPage[]): Set<string> {
  const candidates = new Map<string, number>();
  for (const page of pages) {
    const lines = page.lines.filter((l) => l.text.trim().length > 0);
    if (lines.length === 0) continue;
    for (const l of [lines[0], lines[lines.length - 1]]) {
      const key = l.text.trim();
      if (key) candidates.set(key, (candidates.get(key) || 0) + 1);
    }
  }
  const threshold = Math.max(2, pages.length * 0.15);
  const headers = new Set<string>();
  for (const [text, count] of candidates) {
    if (count >= threshold) headers.add(text);
  }
  return headers;
}

function detectBodyFontSize(pages: ExtractedPage[]): number {
  const fontCounts = new Map<number, number>();
  for (const page of pages) {
    for (const line of page.lines) {
      if (!line.text.trim()) continue;
      fontCounts.set(line.fontSize, (fontCounts.get(line.fontSize) || 0) + line.text.length);
    }
  }
  const stats = Array.from(fontCounts.entries())
    .map(([fontSize, count]) => ({ fontSize, count }))
    .sort((a, b) => b.count - a.count);
  return stats.length > 0 ? stats[0].fontSize : 12;
}

function isLikelyHeading(line: ExtractedLine, bodyFontSize: number): boolean {
  if (isOcrArtifact(line.text)) return false;
  const trimmed = line.text.trim();
  if (CHAPTER_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (line.fontSize > bodyFontSize * 1.2) return true;
  return false;
}

function isLikelyChapterBreak(line: ExtractedLine, bodyFontSize: number, runningHeaders: Set<string>): boolean {
  const trimmed = line.text.trim();
  if (isOcrArtifact(trimmed)) return false;
  if (runningHeaders.has(trimmed)) return false;
  const wordCount = trimmed.split(/\s+/).filter((w) => /[a-zA-Z\u00C0-\u024F]/.test(w)).length;
  if (CHAPTER_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (line.fontSize > bodyFontSize * 1.4 && wordCount >= 1 && trimmed.length <= 120) return true;
  if (line.fontSize > bodyFontSize * 1.2 && wordCount >= 2 && trimmed.length <= 120) return true;
  return false;
}

export function detectStructure(pages: ExtractedPage[]): ProcessedChapter[] {
  const bodyFontSize = detectBodyFontSize(pages);
  const runningHeaders = buildRunningHeaderSet(pages);
  const allLines = flattenPages(pages);

  if (allLines.length === 0) {
    return [{ title: 'Content', orderIndex: 0, content: [{ type: 'paragraph', text: 'No readable text could be extracted from this PDF.' }] }];
  }

  const breakPoints: number[] = [];
  for (let i = 0; i < allLines.length; i++) {
    if (!isLikelyChapterBreak(allLines[i], bodyFontSize, runningHeaders)) continue;
    if (breakPoints.length > 0) {
      const gap = allLines.slice(breakPoints[breakPoints.length - 1] + 1, i);
      const hasBody = gap.some((l) => !isLikelyHeading(l, bodyFontSize) && l.text.trim().length > 20);
      if (!hasBody) continue;
    }
    breakPoints.push(i);
  }

  if (breakPoints.length === 0) {
    return [{ title: 'Full Content', orderIndex: 0, content: buildContentBlocks(allLines, bodyFontSize, runningHeaders) }];
  }

  const rawChapters: ProcessedChapter[] = [];

  if (breakPoints[0] > 0) {
    const preContent = buildContentBlocks(allLines.slice(0, breakPoints[0]), bodyFontSize, runningHeaders);
    if (preContent.some((b) => b.text.trim().length > 30)) {
      rawChapters.push({ title: 'Pendahuluan', orderIndex: 0, content: preContent });
    }
  }

  for (let i = 0; i < breakPoints.length; i++) {
    const start = breakPoints[i];
    const end = i + 1 < breakPoints.length ? breakPoints[i + 1] : allLines.length;
    const chapterLines = allLines.slice(start, end);

    const titleParts: string[] = [];
    let contentStart = 0;
    for (let j = 0; j < Math.min(chapterLines.length, 4); j++) {
      if (isLikelyHeading(chapterLines[j], bodyFontSize) && !isOcrArtifact(chapterLines[j].text)) {
        titleParts.push(chapterLines[j].text.trim());
        contentStart = j + 1;
      } else {
        break;
      }
    }

    const title = titleParts.join(' \u2014 ') || `Chapter ${rawChapters.length + 1}`;
    const content = buildContentBlocks(chapterLines.slice(contentStart), bodyFontSize, runningHeaders);
    rawChapters.push({ title, orderIndex: rawChapters.length, content });
  }

  const chapters = mergeMicroChapters(rawChapters);
  chapters.forEach((ch, i) => { ch.orderIndex = i; });
  return chapters;
}

function mergeMicroChapters(chapters: ProcessedChapter[]): ProcessedChapter[] {
  if (chapters.length <= 1) return chapters;
  const MIN_PARAGRAPH_CHARS = 200;
  const merged: ProcessedChapter[] = [];
  for (const ch of chapters) {
    const bodyChars = ch.content.filter((b) => b.type === 'paragraph').reduce((sum, b) => sum + b.text.length, 0);
    if (bodyChars < MIN_PARAGRAPH_CHARS && merged.length > 0) {
      const prev = merged[merged.length - 1];
      if (ch.title && ch.title !== prev.title) {
        prev.content.push({ type: 'heading', text: ch.title, level: 2 });
      }
      prev.content.push(...ch.content);
    } else {
      merged.push(ch);
    }
  }
  return merged;
}

function flattenPages(pages: ExtractedPage[]): ExtractedLine[] {
  const lines: ExtractedLine[] = [];
  for (const page of pages) lines.push(...page.lines);
  return lines;
}

function buildContentBlocks(lines: ExtractedLine[], bodyFontSize: number, runningHeaders: Set<string>): ContentBlock[] {
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
    if (runningHeaders.has(trimmed)) continue;
    if (isOcrArtifact(trimmed) && trimmed.length < 5) continue;

    if (isLikelyHeading(line, bodyFontSize) && !isOcrArtifact(trimmed)) {
      if (currentParagraph.trim()) {
        blocks.push({ type: 'paragraph', text: currentParagraph.trim() });
        currentParagraph = '';
      }
      const level = line.fontSize > bodyFontSize * 1.5 ? 1 : line.fontSize > bodyFontSize * 1.2 ? 2 : 3;
      blocks.push({ type: 'heading', text: trimmed, level });
    } else {
      if (currentParagraph) {
        if (currentParagraph.endsWith('-')) {
          currentParagraph = currentParagraph.slice(0, -1) + trimmed;
        } else {
          currentParagraph += ' ' + trimmed;
        }
      } else {
        currentParagraph = trimmed;
      }
    }
  }

  if (currentParagraph.trim()) {
    blocks.push({ type: 'paragraph', text: currentParagraph.trim() });
  }

  return blocks;
}
