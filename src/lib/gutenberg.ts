/**
 * Gutenberg URL utilities
 *
 * The main gutenberg.org domain is blocked by many ISPs.
 * We use the PGLAF mirror (gutenberg.pglaf.org) which has
 * the same file structure and is reliably accessible.
 */

const MAIN_DOMAIN = 'www.gutenberg.org';
const MIRROR_DOMAIN = 'gutenberg.pglaf.org';

/**
 * Rewrite a gutenberg.org URL to use the PGLAF mirror.
 * Returns null if input is null/undefined.
 */
export function toMirrorUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(MAIN_DOMAIN, MIRROR_DOMAIN);
}

/**
 * Build candidate EPUB download URLs for a given Gutenberg book ID.
 * Includes both main domain and mirror variants, mirror first.
 */
export function buildEpubCandidateUrls(id: number, epubUrl?: string | null): string[] {
  const urls: string[] = [];

  // Mirror URLs first (more reliable)
  urls.push(
    `https://${MIRROR_DOMAIN}/cache/epub/${id}/pg${id}-images.epub`,
    `https://${MIRROR_DOMAIN}/cache/epub/${id}/pg${id}.epub`,
  );

  // Original URLs as fallback
  if (epubUrl) urls.push(epubUrl);
  urls.push(
    `https://${MAIN_DOMAIN}/cache/epub/${id}/pg${id}-images.epub`,
    `https://${MAIN_DOMAIN}/cache/epub/${id}/pg${id}.epub`,
    `https://${MAIN_DOMAIN}/ebooks/${id}.epub3.images`,
    `https://${MAIN_DOMAIN}/ebooks/${id}.epub.noimages`,
  );

  // De-duplicate
  return [...new Set(urls)];
}

/**
 * Build the cover image URL for a Gutenberg book, using the mirror.
 */
export function buildCoverUrl(id: number): string {
  return `https://${MIRROR_DOMAIN}/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}
