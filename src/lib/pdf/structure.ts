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

// Patterns for publisher ads, mailing list calls-to-action, and marketing noise
const PROMOTIONAL_PATTERNS: RegExp[] = [
  /terima\s+kasih\s+telah\s+mengunduh/i,
  /ebook\s+simon\s*&\s*schuster/i,
  /klik\s+di\s+sini\s+untuk\s+mendaftar/i,
  /click\s+here\s+to\s+sign\s+up/i,
  /dapatkan\s+ebook\s+gratis/i,
  /kami\s+harap\s+anda\s+menikmati/i,
  /sign\s+up\s+to\s+get\s+more/i,
  /join\s+our\s+mailing\s+list/i,
  /milis\s+kami/i,
  /newsletter/i,
  /get\s+a\s+free\s+ebook/i,
  /free\s+ebook/i,
];

export function isPromotional(text: string): boolean {
  if (!text) return false;
  return PROMOTIONAL_PATTERNS.some((p) => p.test(text));
}

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
  if (isPromotional(trimmed)) return false;
  if (CHAPTER_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (line.fontSize > bodyFontSize * 1.2) return true;
  return false;
}

function isLikelyChapterBreak(line: ExtractedLine, bodyFontSize: number, runningHeaders: Set<string>): boolean {
  const trimmed = line.text.trim();
  if (isOcrArtifact(trimmed)) return false;
  if (isPromotional(trimmed)) return false;
  if (runningHeaders.has(trimmed)) return false;

  // Single word lower-case fragments like "orang." should not break chapters
  if (/^[a-z0-9\.\,\;\:\s]{1,10}$/.test(trimmed)) return false;

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
    for (let j = 0; j < Math.min(chapterLines.length, 5); j++) {
      const lineText = chapterLines[j].text.trim();
      if (isLikelyHeading(chapterLines[j], bodyFontSize) && !isOcrArtifact(lineText) && !isPromotional(lineText)) {
        titleParts.push(lineText);
        contentStart = j + 1;
      } else {
        break;
      }
    }

    let title = titleParts.join(' — ') || `Chapter ${rawChapters.length + 1}`;
    title = title
      .replace(/\s+:\s*$/g, '')
      .replace(/\s+:\s+/g, ': ')
      .replace(/—\s*—+/g, '—')
      .replace(/\s*—\s*/g, ' — ')
      .trim();

    const content = buildContentBlocks(chapterLines.slice(contentStart), bodyFontSize, runningHeaders);
    rawChapters.push({ title, orderIndex: rawChapters.length, content });
  }

  const chapters = mergeMicroChapters(rawChapters);
  chapters.forEach((ch, i) => { ch.orderIndex = i; });
  return chapters;
}

function mergeMicroChapters(chapters: ProcessedChapter[]): ProcessedChapter[] {
  if (chapters.length <= 1) return chapters;
  const MIN_PARAGRAPH_CHARS = 180;
  const merged: ProcessedChapter[] = [];
  let pendingTitlePrefixes: string[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];

    // Filter out pure promotional marketing chapters
    const textSample = ch.content.map((b) => b.text || '').join(' ');
    if (isPromotional(ch.title) || (isPromotional(textSample) && ch.content.length <= 3)) {
      continue;
    }

    const bodyChars = ch.content
      .filter((b) => b.type === 'paragraph')
      .reduce((sum, b) => sum + b.text.length, 0);

    if (bodyChars < MIN_PARAGRAPH_CHARS) {
      if (ch.title) {
        pendingTitlePrefixes.push(ch.title);
      }
      // If there are content blocks, attach to previous if possible
      if (ch.content.length > 0 && merged.length > 0) {
        merged[merged.length - 1].content.push(...ch.content);
      }
      continue;
    }

    // Combine any pending title fragments
    let combinedTitle = ch.title;
    if (pendingTitlePrefixes.length > 0) {
      combinedTitle = `${pendingTitlePrefixes.join(' — ')} — ${ch.title}`;
      pendingTitlePrefixes = [];
    }

    combinedTitle = combinedTitle
      .replace(/\s+:\s*$/g, '')
      .replace(/\s+:\s+/g, ': ')
      .replace(/—\s*—+/g, '—')
      .replace(/\s*—\s*/g, ' — ')
      .trim();

    merged.push({
      ...ch,
      title: combinedTitle,
    });
  }

  // If there are still pending title prefixes at the end, append to last chapter
  if (pendingTitlePrefixes.length > 0 && merged.length > 0) {
    const last = merged[merged.length - 1];
    last.title = `${last.title} — ${pendingTitlePrefixes.join(' — ')}`
      .replace(/\s*—\s*/g, ' — ')
      .trim();
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
