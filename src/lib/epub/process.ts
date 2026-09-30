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
  // Match top-level blocks or sequential block tags with word boundary \b to prevent <link> matching <li>
  const tagRegex = /<(h[1-6]|p|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
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
  let ncxHref: string | null = null;
  let navHref: string | null = null;

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

      // Check for TOC (NCX or EPUB 3 Nav)
      if (mediaType === 'application/x-dtbncx+xml' || id.toLowerCase() === 'ncx') {
        ncxHref = href;
      }
      if (
        properties.includes('nav') ||
        id.toLowerCase() === 'nav' ||
        id.toLowerCase() === 'toc' ||
        href.toLowerCase().endsWith('nav.xhtml')
      ) {
        navHref = href;
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

  // 4. Build Table of Contents map (href -> title) from NCX or EPUB3 Nav
  const tocMap = new Map<string, string>();

  const registerTocEntry = (fullSrc: string, rawLabel: string, resolvedBasePath: string) => {
    const label = cleanText(rawLabel);
    if (!label) return;

    // Strip anchors and query parameters to associate with file
    const fileSrc = fullSrc.split('#')[0].split('?')[0];
    if (!fileSrc) return;

    const resolvedFileSrc = resolvePath(resolvedBasePath, fileSrc);
    const isLicense = /project gutenberg.*license/i.test(label);

    const existing = tocMap.get(fileSrc) || tocMap.get(resolvedFileSrc);
    if (existing) {
      // Do not allow license or footer disclaimers to overwrite chapters
      if (isLicense) return;

      // If existing is generic "Contents" and new is more specific like "Dramatis Personae", replace
      const isGeneric = /^(contents|table of contents|daftar isi)$/i.test(existing);
      if (isGeneric && !/^(contents|table of contents|daftar isi)$/i.test(label)) {
        tocMap.set(fileSrc, label);
        tocMap.set(resolvedFileSrc, label);
      }
      // Otherwise keep the first / top-level entry for this file
      return;
    }

    if (isLicense) return;

    tocMap.set(fileSrc, label);
    tocMap.set(resolvedFileSrc, label);
  };

  // 4a. Parse NCX navPoints
  if (ncxHref) {
    const resolvedNcxPath = resolvePath(opfPath, ncxHref);
    const ncxContent = await (zip.file(resolvedNcxPath) || zip.file(ncxHref))?.async('string');
    if (ncxContent) {
      const navPointRegex = /<navPoint[^>]*>[\s\S]*?<navLabel>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<\/navLabel>[\s\S]*?<content\s+[^>]*src=["']([^"']+)["']/gi;
      let npMatch;
      while ((npMatch = navPointRegex.exec(ncxContent)) !== null) {
        registerTocEntry(npMatch[2], npMatch[1], resolvedNcxPath);
      }
    }
  }

  // 4b. Parse EPUB 3 Navigation Document if present
  if (navHref) {
    const resolvedNavPath = resolvePath(opfPath, navHref);
    const navContent = await (zip.file(resolvedNavPath) || zip.file(navHref))?.async('string');
    if (navContent) {
      let navBlock = '';
      const tocNavMatch = navContent.match(/<nav[^>]*(?:epub:type=["']toc["']|id=["']toc["'])[^>]*>([\s\S]*?)<\/nav>/i);
      if (tocNavMatch) {
        navBlock = tocNavMatch[1];
      } else {
        const anyNavMatch = navContent.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
        if (anyNavMatch) navBlock = anyNavMatch[1];
      }

      if (navBlock) {
        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let lMatch;
        while ((lMatch = linkRegex.exec(navBlock)) !== null) {
          const rawLabel = lMatch[2].replace(/<[^>]+>/g, '');
          registerTocEntry(lMatch[1], rawLabel, resolvedNavPath);
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
    // 1. Clean, specific TOC title (if not generic "Contents" when a content heading exists)
    // 2. First heading in content (e.g. "ACT I", "Dramatis Personæ", "Chapter 1")
    // 3. Fallback to clean TOC title
    // 4. HTML document title (if distinct from overall book title)
    // 5. Default numbered chapter
    const rawToc = tocMap.get(manifestItem.href) || tocMap.get(resolvedChapterPath);
    const cleanToc = rawToc && !/project gutenberg.*license/i.test(rawToc) ? cleanText(rawToc) : null;
    const firstHeading = blocks.length > 0 && blocks[0].type === 'heading' ? blocks[0].text.trim() : null;
    const cleanDocTitle =
      detectedTitle && cleanText(detectedTitle).toLowerCase() !== bookTitle.toLowerCase()
        ? cleanText(detectedTitle)
        : null;

    if (cleanToc && !/^(contents|table of contents|daftar isi)$/i.test(cleanToc)) {
      detectedTitle = cleanToc;
    } else if (firstHeading && !/project gutenberg.*license/i.test(firstHeading)) {
      detectedTitle = firstHeading;
    } else if (cleanToc) {
      detectedTitle = cleanToc;
    } else if (cleanDocTitle) {
      detectedTitle = cleanDocTitle;
    } else {
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
