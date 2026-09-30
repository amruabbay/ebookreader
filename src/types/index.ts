// Core data models for the Personal Ebook Reader

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  originalFileName: string;
  totalCharacters: number;
  totalChapters: number;
  totalPages: number;
  viewMode: ViewMode;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'reflow' | 'pdf-viewer';

export type BookStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  orderIndex: number;
  content: ContentBlock[];
}

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'blockquote';
  text: string;
  level?: number; // For headings: 1, 2, 3
}

export interface ReadingProgress {
  id: string;
  bookId: string;
  chapterId: string;
  contentPosition: number;
  progressPercentage: number;
  lastReadAt: string;
}

export interface Highlight {
  id: string;
  bookId: string;
  chapterId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  color: HighlightColor;
  createdAt: string;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'purple' | 'underline';

export interface Note {
  id: string;
  bookId: string;
  highlightId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterId: string;
  contentPosition: number;
  label: string;
  createdAt: string;
}

// Structured book data produced by PDF processing
export interface ProcessedBook {
  title: string;
  author: string;
  coverUrl?: string | null;
  chapters: ProcessedChapter[];
  totalCharacters: number;
  viewMode?: ViewMode;
  totalPages?: number;
}

export interface ProcessedChapter {
  title: string;
  orderIndex: number;
  content: ContentBlock[];
}

// API request/response types
export interface BookWithProgress extends Book {
  progress: ReadingProgress | null;
}

export interface ChapterNavItem {
  id: string;
  title: string;
  orderIndex: number;
}

// Reader customization settings
export type ReadingTheme = 'light' | 'sepia' | 'dark' | 'midnight';
export type ReadingFontFamily = 'serif' | 'sans' | 'mono';
export type ReadingWidth = 'narrow' | 'normal' | 'wide';
export type ReadingMode = 'scroll' | 'paginated';

export interface ReaderSettings {
  fontSize: number;       // in pixels: 14 to 28
  fontFamily: ReadingFontFamily;
  lineHeight: number;     // multiplier: 1.4 to 2.2
  readingWidth: ReadingWidth;
  theme: ReadingTheme;
  readingMode: ReadingMode; // 'scroll' or 'paginated'
  wordsPerPage: number;     // e.g. 200 to 500 words per page
}
