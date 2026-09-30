import type { ContentBlock } from '@/types';

export interface ChapterPage {
  pageNumber: number;
  totalPages: number;
  blocks: ContentBlock[];
  wordCount: number;
}

export interface PaginateOptions {
  firstPageReserve?: number;
}

/**
 * Splits text into sentences while protecting common abbreviations and decimals.
 */
function splitIntoSentences(text: string): string[] {
  if (!text || text.length === 0) return [];
  // Protect common honorifics, abbreviations, and numbers with decimal points
  const protectedText = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|i\.e|e\.g)\./gi, (m) => m.slice(0, -1) + '__DOT__')
    .replace(/(\d)\.(\d)/g, '$1__DECIMAL__$2');

  const rawMatches = protectedText.match(/[^.!?]+(?:[.!?]+["'”’]?\s*|$)/g);
  const sentences = rawMatches && rawMatches.length > 0 ? rawMatches : [protectedText];

  return sentences
    .map((s) => s.replaceAll('__DOT__', '.').replaceAll('__DECIMAL__', '.').trim())
    .filter(Boolean);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Paginates a chapter's content blocks into pages based on word count.
 * Uses sentence-level packing to ensure each page fills the layout height
 * without leaving large blank gaps at the bottom.
 */
export function paginateChapter(
  blocks: ContentBlock[],
  wordsPerPage: number = 340,
  options?: PaginateOptions
): ChapterPage[] {
  if (!blocks || blocks.length === 0) {
    return [{ pageNumber: 1, totalPages: 1, blocks: [], wordCount: 0 }];
  }

  const baseTarget = Math.max(80, wordsPerPage);
  const firstPageReserve = options?.firstPageReserve || 0;
  const pages: { blocks: ContentBlock[]; wordCount: number }[] = [];
  let currentBlocks: ContentBlock[] = [];
  let currentWords = 0;

  const getCurrentBudget = () => {
    return pages.length === 0
      ? Math.max(80, baseTarget - firstPageReserve)
      : baseTarget;
  };

  const pushCurrentPage = () => {
    if (currentBlocks.length > 0) {
      pages.push({ blocks: currentBlocks, wordCount: currentWords });
      currentBlocks = [];
      currentWords = 0;
    }
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const bWords = countWords(block.text);
    if (bWords === 0) continue;

    const budget = getCurrentBudget();

    // 1. Headings: Avoid leaving heading stranded near bottom of a page
    if (block.type === 'heading') {
      if (currentWords > budget * 0.75) {
        pushCurrentPage();
      }
      currentBlocks.push(block);
      currentWords += bWords;
      continue;
    }

    // 2. Blockquotes & Lists: Prefer keeping intact unless forced
    if (block.type !== 'paragraph') {
      if (currentWords + bWords > budget && currentWords > budget * 0.6) {
        pushCurrentPage();
      }
      currentBlocks.push(block);
      currentWords += bWords;
      continue;
    }

    // 3. Paragraphs: Smart sentence packing to fill the page height evenly
    let remainingParagraphText = block.text.trim();

    while (remainingParagraphText.length > 0) {
      const curBudget = getCurrentBudget();
      const remWords = countWords(remainingParagraphText);
      const spaceLeft = curBudget - currentWords;

      // Case A: The remaining paragraph fits within the budget
      if (remWords <= spaceLeft) {
        currentBlocks.push({ ...block, text: remainingParagraphText });
        currentWords += remWords;
        remainingParagraphText = '';
        break;
      }

      // Case B: Current page is already well-filled (>= 80% capacity)
      if (currentWords >= curBudget * 0.8) {
        pushCurrentPage();
        continue;
      }

      // Case C: Current page has room to fill. Split paragraph at sentence boundaries.
      const sentences = splitIntoSentences(remainingParagraphText);

      // If cannot be split into multiple sentences (single massive sentence)
      if (sentences.length <= 1) {
        if (currentWords > 0 && currentWords >= curBudget * 0.5) {
          pushCurrentPage();
        } else {
          currentBlocks.push({ ...block, text: remainingParagraphText });
          currentWords += remWords;
          pushCurrentPage();
          remainingParagraphText = '';
        }
        continue;
      }

      // Pack sentences to fill the remaining space without exceeding budget
      const part1Sentences: string[] = [];
      let part1Words = 0;

      for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
        const sentence = sentences[sIdx];
        const sWordCount = countWords(sentence);

        if (
          part1Words + sWordCount <= spaceLeft &&
          sIdx < sentences.length - 1
        ) {
          part1Sentences.push(sentence);
          part1Words += sWordCount;
        } else {
          break;
        }
      }

      if (part1Sentences.length > 0) {
        const part1Text = part1Sentences.join(' ');
        currentBlocks.push({ ...block, text: part1Text });
        currentWords += part1Words;
        pushCurrentPage();
        remainingParagraphText = sentences.slice(part1Sentences.length).join(' ');
      } else {
        // If even the first sentence is larger than spaceLeft
        if (currentWords > 0) {
          pushCurrentPage();
        } else {
          // If the page is empty, place the first sentence here so we don't get stuck
          const firstSentence = sentences[0];
          const firstWords = countWords(firstSentence);
          currentBlocks.push({ ...block, text: firstSentence });
          currentWords += firstWords;
          pushCurrentPage();
          remainingParagraphText = sentences.slice(1).join(' ');
        }
      }
    }
  }

  if (currentBlocks.length > 0) {
    pushCurrentPage();
  }

  if (pages.length === 0) {
    pages.push({ blocks: [], wordCount: 0 });
  }

  const totalPages = pages.length;
  return pages.map((p, idx) => ({
    pageNumber: idx + 1,
    totalPages,
    blocks: p.blocks,
    wordCount: p.wordCount,
  }));
}
