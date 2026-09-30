import JSZip from 'jszip';
import type { ProcessedBook, ProcessedChapter, ContentBlock } from '@/types';

/**
 * Decode common HTML entities into their unicode characters
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Clean up text content by stripping extra spaces and normalizing newlines
 */
function cleanText(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback parser for Node/serverless where DOMParser is not available.
 * Extracts basic elements (h1-h6, p, blockquote, li) using regex.
 */
function parseBlocksWithRegex(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  // Match top-level blocks or sequential block tags
  const tagRegex = /<(h[1-6]|p|blockquote|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    const rawContent = match[2];
    // Strip inner tags
    const textOnly = rawContent.replace(/<[^>]+>/g, '');
    const cleaned = cleanText(textOnly);

    if (!cleaned) continue;

    if (tagName.startsWith('h')) {
      const level = Math.min(3, Math.max(1, parseInt(tagName[1], 10)));
      blocks.push({ type: 'heading', text: cleaned, level });
    } else if (tagName === 'blockquote') {
      blocks.push({ type: 'blockquote', text: cleaned });
    } else if (tagName === 'li') {
      blocks.push({ type: 'list', text: cleaned });
    } else {
      blocks.push({ type: 'paragraph', text: cleaned });
    }
  }

  return blocks;
}

/**
 * Browser DOM-based block extractor using DOMParser
 */
function parseBlocksWithDom(doc: Document): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const body = doc.body;
  if (!body) return blocks;

  // Process all significant elements in the body
  const elements = body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, li');

  elements.forEach((el) => {
    // Avoid double-counting nested elements (e.g. li inside ul or p inside blockquote if we already grab parent)
    // If element is p inside blockquote, let blockquote or p handle it
    const text = cleanText(el.textContent || '');
    if (!text) return;

    const tagName = el.tagName.toLowerCase();
    if (tagName.startsWith('h')) {
      const level = Math.min(3, Math.max(1, parseInt(tagName[1], 10)));
      blocks.push({ type: 'heading', text, level });
    } else if (tagName === 'blockquote') {
      blocks.push({ type: 'blockquote', text });
    } else if (tagName === 'li') {
      blocks.push({ type: 'list', text });
    } else if (tagName === 'p') {
      // If direct parent is blockquote, skip to avoid duplicates if blockquote already processed
      if (el.parentElement?.tagName.toLowerCase() === 'blockquote') return;
      blocks.push({ type: 'paragraph', text });
    }
  });

  return blocks;
}

/**
 * Resolve relative paths inside EPUB archive
 */
function resolvePath(basePath: string, relativePath: string): string {
  // If relativePath has query params or anchors, strip them
  const cleanRel = relativePath.split('#')[0].split('?')[0];
  if (!basePath) return cleanRel;

  const stack = basePath.split('/');
  stack.pop(); // Remove current file name

  for (const part of cleanRel.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join('/');
}

/**
 * Parse an EPUB ArrayBuffer and return structured book data
 */
export async function processEpub(
  buffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedBook> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Read META-INF/container.xml to find root OPF file
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) {
    throw new Error('Invalid EPUB: META-INF/container.xml not found');
  }

  const rootfileMatch = containerXml.match(/full-path=["']([^"']+)["']/i);
  if (!rootfileMatch || !rootfileMatch[1]) {
    throw new Error('Invalid EPUB: rootfile not specified in container.xml');
  }

  const opfPath = rootfileMatch[1];
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  const opfContent = await zip.file(opfPath)?.async('string');
  if (!opfContent) {
    throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
  }

  // 2. Extract Metadata (Title, Author, Cover)
  const titleMatch = opfContent.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
  const bookTitle = titleMatch ? cleanText(titleMatch[1]) : 'Untitled Book';

  const authorMatch = opfContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
  const bookAuthor = authorMatch ? cleanText(authorMatch[1]) : 'Unknown Author';

  // 3. Find Manifest items: map of id -> { href, mediaType }
  const manifestMap = new Map<string, { href: string; mediaType: string; id: string }>();
  const manifestRegex = /<item\s+([^>]+)\/?>/gi;
  let itemMatch;

  let coverHref: string | null = null;
  let tocHref: string | null = null;

  while ((itemMatch = manifestRegex.exec(opfContent)) !== null) {
    const attrs = itemMatch[1];
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    const typeMatch = attrs.match(/media-type=["']([^"']+)["']/i);
    const propsMatch = attrs.match(/properties=["']([^"']+)["']/i);

    if (idMatch && hrefMatch) {
      const id = idMatch[1];
      const href = hrefMatch[1];
      const mediaType = typeMatch ? typeMatch[1] : '';
      const properties = propsMatch ? propsMatch[1] : '';

      manifestMap.set(id, { href, mediaType, id });

      // Check for cover image
      if (
        properties.includes('cover-image') ||
        id.toLowerCase() === 'cover' ||
        id.toLowerCase() === 'cover-image'
      ) {
        coverHref = href;
      }

      // Check for TOC (NCX or Nav)
      if (mediaType === 'application/x-dtbncx+xml' || id.toLowerCase() === 'ncx') {
        tocHref = href;
      }
    }
  }

  // Also check <meta name="cover" content="..."/>
  if (!coverHref) {
    const metaCoverMatch = opfContent.match(/<meta[^>]*name=["']cover["'][^>]*content=["']([^"']+)["']/i);
    if (metaCoverMatch) {
      const coverId = metaCoverMatch[1];
      const foundItem = manifestMap.get(coverId);
      if (foundItem) coverHref = foundItem.href;
    }
  }

  // Extract cover image base64 if present
  let coverUrl: string | null = null;
  if (coverHref) {
    const resolvedCoverPath = resolvePath(opfPath, coverHref);
    const coverFile = zip.file(resolvedCoverPath) || zip.file(coverHref);
    if (coverFile) {
      try {
        const coverBase64 = await coverFile.async('base64');
        const ext = resolvedCoverPath.split('.').pop()?.toLowerCase() || 'jpeg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        coverUrl = `data:${mime};base64,${coverBase64}`;
      } catch (err) {
        console.warn('Could not extract EPUB cover image:', err);
      }
    }
  }

  // 4. Build Table of Contents map (href -> title) if TOC exists
  const tocMap = new Map<string, string>();
  if (tocHref) {
    const resolvedTocPath = resolvePath(opfPath, tocHref);
    const tocContent = await (zip.file(resolvedTocPath) || zip.file(tocHref))?.async('string');
    if (tocContent) {
      // Parse NCX navPoints
      const navPointRegex = /<navPoint[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\s+src=["']([^"']+)["']/gi;
      let npMatch;
      while ((npMatch = navPointRegex.exec(tocContent)) !== null) {
        const label = cleanText(npMatch[1]);
        const src = npMatch[2].split('#')[0]; // strip anchor
        if (label && src) {
          tocMap.set(src, label);
          const fullSrc = resolvePath(resolvedTocPath, src);
          tocMap.set(fullSrc, label);
        }
      }
    }
  }

  // 5. Read Spine in order
  const spineMatch = opfContent.match(/<spine[^>]*>([\s\S]*?)<\/spine>/i);
  if (!spineMatch) {
    throw new Error('Invalid EPUB: spine not found in OPF');
  }

  const itemrefRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*\/?>/gi;
  const spineItemIds: string[] = [];
  let irMatch;
  while ((irMatch = itemrefRegex.exec(spineMatch[1])) !== null) {
    spineItemIds.push(irMatch[1]);
  }

  // 6. Process each chapter file in spine order
  const chapters: ProcessedChapter[] = [];
  let totalCharacters = 0;
  const totalItems = spineItemIds.length;

  const isBrowser = typeof window !== 'undefined' && typeof DOMParser !== 'undefined';
  const domParser = isBrowser ? new DOMParser() : null;

  for (let i = 0; i < totalItems; i++) {
    const id = spineItemIds[i];
    const manifestItem = manifestMap.get(id);
    if (!manifestItem) continue;

    if (onProgress) {
      onProgress(i + 1, totalItems);
    }

    const resolvedChapterPath = resolvePath(opfPath, manifestItem.href);
    const file = zip.file(resolvedChapterPath) || zip.file(manifestItem.href);
    if (!file) continue;

    const htmlContent = await file.async('string');
    if (!htmlContent.trim()) continue;

    let blocks: ContentBlock[] = [];
    let detectedTitle: string | null = null;

    if (domParser) {
      try {
        const doc = domParser.parseFromString(htmlContent, 'text/html');
        // Check document title
        const docTitle = doc.querySelector('title')?.textContent?.trim();
        if (docTitle) detectedTitle = cleanText(docTitle);

        blocks = parseBlocksWithDom(doc);
      } catch {
        blocks = parseBlocksWithRegex(htmlContent);
      }
    } else {
      blocks = parseBlocksWithRegex(htmlContent);
    }

    // Determine chapter title
    // Priority:
    // 1. TOC map match
    const tocTitle = tocMap.get(manifestItem.href) || tocMap.get(resolvedChapterPath);
    if (tocTitle) {
      detectedTitle = tocTitle;
    } else if (blocks.length > 0 && blocks[0].type === 'heading') {
      detectedTitle = blocks[0].text;
    } else if (!detectedTitle || detectedTitle.toLowerCase() === 'untitled') {
      detectedTitle = `Chapter ${chapters.length + 1}`;
    }

    // Only add chapter if it has text blocks
    if (blocks.length > 0) {
      const chapterChars = blocks.reduce((acc, b) => acc + b.text.length, 0);
      totalCharacters += chapterChars;

      chapters.push({
        title: detectedTitle,
        orderIndex: chapters.length,
        content: blocks,
      });
    }
  }

  // If no chapters could be extracted, provide a fallback
  if (chapters.length === 0) {
    chapters.push({
      title: 'Book Content',
      orderIndex: 0,
      content: [{ type: 'paragraph', text: 'No readable text content could be extracted from this EPUB.' }],
    });
  }

  return {
    title: bookTitle,
    author: bookAuthor,
    coverUrl,
    chapters,
    totalCharacters,
  };
}
