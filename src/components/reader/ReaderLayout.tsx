'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Book, Chapter, ChapterNavItem, ReadingProgress, Bookmark, Highlight, Note, HighlightColor, ContentBlock, ViewMode } from '@/types';
import ReaderToolbar from './ReaderToolbar';
import TableOfContents from './TableOfContents';
import ChapterContent from './ChapterContent';
import ReaderSettingsModal from './ReaderSettingsModal';
import SelectionPopover from './SelectionPopover';
import NoteEditorModal from './NoteEditorModal';
import PdfViewerReader from './PdfViewerReader';
import Spinner from '@/components/ui/Spinner';
import { useReaderSettings } from '@/lib/reader/useReaderSettings';
import { paginateChapter } from '@/lib/reader/paginate';

interface ReaderLayoutProps {
  book: Book;
  chapters: Chapter[];
  navItems: ChapterNavItem[];
  initialProgress: ReadingProgress | null;
}

export default function ReaderLayout({ book, chapters, navItems, initialProgress }: ReaderLayoutProps) {
  const [currentChapterId, setCurrentChapterId] = useState<string>(
    initialProgress?.chapterId || chapters[0]?.id || ''
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocInitialTab, setTocInitialTab] = useState<'toc' | 'highlights' | 'notes'>('toc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [userRating, setUserRating] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem(`ebook_rating_${book.id}`);
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [progressPercentage, setProgressPercentage] = useState(
    initialProgress?.progressPercentage || 0
  );

  const isPdfAvailable = useMemo(() => {
    const name = (book.originalFileName || '').toLowerCase();
    return name.endsWith('.pdf') || name.includes('.pdf');
  }, [book.originalFileName]);

  const [activeViewMode, setActiveViewMode] = useState<ViewMode>(book.viewMode || 'reflow');

  const handleToggleViewMode = useCallback(() => {
    setActiveViewMode((prev) => (prev === 'pdf-viewer' ? 'reflow' : 'pdf-viewer'));
  }, []);

  // Annotations state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Active popover state for text selection and clicked highlight
  const [activePopover, setActivePopover] = useState<{
    position: { x: number; y: number; bottom?: number };
    activeHighlight?: Highlight;
    selectionData?: {
      text: string;
      startOffset: number;
      endOffset: number;
      chapterId?: string;
    };
  } | null>(null);

  // Note editor modal state
  const [noteModal, setNoteModal] = useState<{
    isOpen: boolean;
    highlight?: Highlight;
    selectedText: string;
    noteContent: string;
  }>({
    isOpen: false,
    selectedText: '',
    noteContent: '',
  });

  // Translation state (EN <-> ID)
  const [currentLang, setCurrentLang] = useState<'en' | 'id'>('en');
  const [translatingChapterIds, setTranslatingChapterIds] = useState<Record<string, boolean>>({});
  const inFlightTranslationsRef = useRef<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Record<string, { title: string; content: ContentBlock[] }>>({});
  const [translationError, setTranslationError] = useState<string | null>(null);

  const isTranslating = Boolean(translatingChapterIds[currentChapterId]);

  const {
    settings,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setReadingWidth,
    setTheme,
    setReadingMode,
    setWordsPerPage,
  } = useReaderSettings();

  // Synchronize document.documentElement ('dark' class) with reader settings theme
  useEffect(() => {
    const isDark = settings.theme === 'dark' || settings.theme === 'midnight';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Fast theme toggler for toolbar
  const handleToggleTheme = useCallback(() => {
    const isDark = settings.theme === 'dark' || settings.theme === 'midnight';
    setTheme(isDark ? 'light' : 'dark');
  }, [settings.theme, setTheme]);

  const readingAreaRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChapter = chapters.find((c) => c.id === currentChapterId);
  const currentChapterIndex = chapters.findIndex((c) => c.id === currentChapterId);

  // Load annotations on mount
  const loadAnnotations = useCallback(async () => {
    try {
      const [bmRes, hlRes, ntRes] = await Promise.all([
        fetch(`/api/bookmarks?bookId=${book.id}`),
        fetch(`/api/highlights?bookId=${book.id}`),
        fetch(`/api/notes?bookId=${book.id}`),
      ]);

      if (bmRes.ok) setBookmarks(await bmRes.json());
      if (hlRes.ok) setHighlights(await hlRes.json());
      if (ntRes.ok) setNotes(await ntRes.json());
    } catch {
      // Ignore background load failures
    }
  }, [book.id]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Is current chapter bookmarked?
  const currentBookmark = useMemo(() => {
    return bookmarks.find((bm) => bm.chapterId === currentChapterId);
  }, [bookmarks, currentChapterId]);

  // Reading stats: word count and estimated reading time
  const readingStats = useMemo(() => {
    if (!currentChapter) return { wordsLeftInChapter: 0, minutesLeftInChapter: 0 };
    let words = 0;
    for (const b of currentChapter.content) {
      words += b.text.trim().split(/\s+/).filter(Boolean).length;
    }
    const minutes = Math.max(1, Math.round(words / 200));
    return { wordsLeftInChapter: words, minutesLeftInChapter: minutes };
  }, [currentChapter]);

  // Dedicated chapter translation helper
  const translateChapter = useCallback(async (chapterId: string) => {
    if (!chapterId || translations[chapterId] || inFlightTranslationsRef.current.has(chapterId)) {
      return;
    }

    inFlightTranslationsRef.current.add(chapterId);
    setTranslatingChapterIds((prev) => ({ ...prev, [chapterId]: true }));
    setTranslationError(null);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          targetLang: 'id',
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal menerjemahkan bab');
      }

      const data = await res.json();
      if (data.translation) {
        setTranslations((prev) => ({
          ...prev,
          [chapterId]: {
            title: data.translation.translatedTitle,
            content: data.translation.content,
          },
        }));
      }
    } catch (err) {
      console.error(`Translation error for chapter ${chapterId}:`, err);
    } finally {
      inFlightTranslationsRef.current.delete(chapterId);
      setTranslatingChapterIds((prev) => ({ ...prev, [chapterId]: false }));
    }
  }, [translations]);

  // Language translation handler
  const handleToggleLanguage = useCallback(() => {
    if (currentLang === 'id') {
      setCurrentLang('en');
      return;
    }

    setCurrentLang('id');
    if (!translations[currentChapterId]) {
      translateChapter(currentChapterId);
    }
  }, [currentLang, currentChapterId, translations, translateChapter]);

  // When in ID mode, translate active chapter and automatically pre-fetch the next chapter in the background!
  useEffect(() => {
    if (currentLang !== 'id') return;

    // 1. Translate active chapter if needed
    if (!translations[currentChapterId]) {
      translateChapter(currentChapterId);
    }

    // 2. In scroll mode, also pre-fetch the next chapter ahead of time in the background
    if (settings.readingMode === 'scroll') {
      const currIdx = chapters.findIndex((c) => c.id === currentChapterId);
      if (currIdx !== -1 && currIdx < chapters.length - 1) {
        const nextChapter = chapters[currIdx + 1];
        if (nextChapter && !translations[nextChapter.id]) {
          translateChapter(nextChapter.id);
        }
      }
    }
  }, [currentLang, currentChapterId, translations, settings.readingMode, chapters, translateChapter]);

  const displayedTitle =
    currentLang === 'id' && translations[currentChapterId]
      ? translations[currentChapterId].title
      : currentChapter?.title || '';

  const displayedContent =
    currentLang === 'id' && translations[currentChapterId]
      ? translations[currentChapterId].content
      : currentChapter?.content || [];

  // Responsive desktop detection for 2-column spread vs 1-column mobile
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute adaptive wordsPerPage that scales to fill the viewport height
  const effectiveWordsPerPage = useMemo(() => {
    // Base target: desktop (2 columns) is 340 words, mobile (1 column) is 170 words
    const baseTarget = isDesktop ? 340 : 170;

    // Density factor from user setting (if set)
    let densityFactor = 1.0;
    if (settings.wordsPerPage) {
      const userRef = isDesktop ? 340 : 170;
      const ratio = settings.wordsPerPage / userRef;
      if (ratio >= 0.6 && ratio <= 1.4) {
        densityFactor = ratio;
      }
    }

    // Scale dynamically with font size and line height
    const fontScale = Math.pow(18 / Math.max(12, settings.fontSize), 1.45);
    const lineScale = 1.75 / Math.max(1.2, settings.lineHeight);

    const calculated = Math.round(baseTarget * densityFactor * fontScale * lineScale);
    // Safe bounds to prevent vertical overflow on any device
    const minWords = isDesktop ? 200 : 100;
    const maxWords = isDesktop ? 440 : 220;
    return Math.min(maxWords, Math.max(minWords, calculated));
  }, [isDesktop, settings.wordsPerPage, settings.fontSize, settings.lineHeight]);

  // Pagination calculation for paginated mode
  const pages = useMemo(() => {
    return paginateChapter(displayedContent, effectiveWordsPerPage, {
      firstPageReserve: isDesktop ? 75 : 35,
    });
  }, [displayedContent, effectiveWordsPerPage, isDesktop]);

  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, pages.length));
  const activePage = pages[safeCurrentPage - 1];

  // Reset currentPage to 1 when chapter changes (paginated mode only)
  useEffect(() => {
    if (settings.readingMode === 'paginated') {
      setCurrentPage(1);
      if (readingAreaRef.current) {
        readingAreaRef.current.scrollTop = 0;
      }
    }
  }, [currentChapterId, settings.readingMode]);

  const goToNextPage = useCallback(() => {
    if (safeCurrentPage < pages.length) {
      setCurrentPage((p) => p + 1);
      if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0;
    } else if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterId(chapters[currentChapterIndex + 1].id);
      setCurrentPage(1);
      if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0;
    }
  }, [safeCurrentPage, pages.length, currentChapterIndex, chapters]);

  const goToPrevPage = useCallback(() => {
    if (safeCurrentPage > 1) {
      setCurrentPage((p) => p - 1);
      if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0;
    } else if (currentChapterIndex > 0) {
      const prevCh = chapters[currentChapterIndex - 1];
      const prevContent =
        currentLang === 'id' && translations[prevCh.id]
          ? translations[prevCh.id].content
          : prevCh.content;
      const prevPages = paginateChapter(prevContent, effectiveWordsPerPage, {
        firstPageReserve: isDesktop ? 75 : 35,
      });
      setCurrentChapterId(prevCh.id);
      setCurrentPage(Math.max(1, prevPages.length));
      if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0;
    }
  }, [safeCurrentPage, currentChapterIndex, chapters, currentLang, translations, effectiveWordsPerPage, isDesktop]);

  const saveProgress = useCallback(
    async (contentPosition: number, percentage: number) => {
      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            chapterId: currentChapterId,
            contentPosition,
            progressPercentage: Math.round(percentage * 100) / 100,
          }),
        });
      } catch {
        // Silent fail for progress saves
      }
    },
    [book.id, currentChapterId]
  );

  // Paginated mode progress tracking
  useEffect(() => {
    if (settings.readingMode === 'paginated' && pages.length > 0 && chapters.length > 0) {
      const pageFraction = (safeCurrentPage - 1) / pages.length;
      const overallProgress = ((currentChapterIndex + pageFraction) / chapters.length) * 100;
      setProgressPercentage(Math.min(100, Math.max(0, overallProgress)));

      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      progressTimerRef.current = setTimeout(() => {
        saveProgress(safeCurrentPage, overallProgress);
      }, 1200);
    }
  }, [safeCurrentPage, pages.length, currentChapterIndex, chapters.length, settings.readingMode, saveProgress]);

  const currentChapterIdRef = useRef(currentChapterId);
  useEffect(() => {
    currentChapterIdRef.current = currentChapterId;
  }, [currentChapterId]);

  const isUpdatingProgressRef = useRef(false);

  // Calculate progress based on continuous scroll position (scroll mode)
  const updateProgress = useCallback(() => {
    if (settings.readingMode === 'paginated') return;
    if (!readingAreaRef.current || chapters.length === 0) return;

    if (isUpdatingProgressRef.current) return;
    isUpdatingProgressRef.current = true;

    requestAnimationFrame(() => {
      isUpdatingProgressRef.current = false;
      const el = readingAreaRef.current;
      if (!el) return;

      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const overallProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgressPercentage(Math.min(100, Math.max(0, overallProgress)));

      // Determine active chapter based on viewport position
      const chapterEls = el.querySelectorAll<HTMLElement>('[data-chapter-id]');
      if (chapterEls.length > 0) {
        const targetOffset = el.getBoundingClientRect().top + 140;
        let activeId = chapterEls[0].getAttribute('data-chapter-id') || '';

        for (let i = 0; i < chapterEls.length; i++) {
          const chEl = chapterEls[i];
          const rect = chEl.getBoundingClientRect();
          if (rect.top <= targetOffset) {
            activeId = chEl.getAttribute('data-chapter-id') || activeId;
          } else {
            break;
          }
        }

        if (activeId && activeId !== currentChapterIdRef.current) {
          currentChapterIdRef.current = activeId;
          setCurrentChapterId(activeId);
        }
      }

      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      progressTimerRef.current = setTimeout(() => {
        saveProgress(Math.round(scrollTop), overallProgress);
      }, 1000);
    });
  }, [chapters.length, settings.readingMode, saveProgress]);

  // Attach scroll listener
  useEffect(() => {
    const el = readingAreaRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateProgress, { passive: true });
    return () => el.removeEventListener('scroll', updateProgress);
  }, [updateProgress]);

  // Initial scroll restoration for scroll mode
  const initialScrollRestoredRef = useRef(false);
  useEffect(() => {
    if (initialScrollRestoredRef.current) return;
    if (settings.readingMode === 'scroll') {
      initialScrollRestoredRef.current = true;
      const targetPos = initialProgress?.contentPosition;
      const targetChId = initialProgress?.chapterId;

      const timer = setTimeout(() => {
        if (targetPos && targetPos > 0 && readingAreaRef.current) {
          readingAreaRef.current.scrollTo({ top: targetPos, behavior: 'instant' });
        } else if (targetChId && targetChId !== chapters[0]?.id) {
          const el = document.getElementById(`chapter-${targetChId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
        }
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [settings.readingMode, initialProgress, chapters]);

  // Scroll to active chapter when switching to scroll mode
  const prevReadingModeRef = useRef(settings.readingMode);
  useEffect(() => {
    if (prevReadingModeRef.current !== settings.readingMode) {
      if (settings.readingMode === 'scroll' && currentChapterId) {
        setTimeout(() => {
          const el = document.getElementById(`chapter-${currentChapterId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 80);
      }
      prevReadingModeRef.current = settings.readingMode;
    }
  }, [settings.readingMode, currentChapterId]);

  // Scroll to top when chapter changes (ONLY in paginated mode)
  useEffect(() => {
    if (settings.readingMode === 'paginated' && readingAreaRef.current) {
      readingAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentChapterId, settings.readingMode]);

  // Navigate to chapter (from TOC)
  const handleSelectChapter = useCallback((id: string) => {
    setCurrentChapterId(id);
    currentChapterIdRef.current = id;
    setActivePopover(null);

    if (settings.readingMode === 'scroll') {
      const el = document.getElementById(`chapter-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [settings.readingMode]);

  const handleOpenToc = useCallback((tab: 'toc' | 'highlights' | 'notes' = 'toc') => {
    setTocInitialTab(tab);
    setTocOpen(true);
  }, []);

  const handleMarkChapterCompleted = useCallback(async () => {
    saveProgress(safeCurrentPage, 100);
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterId(chapters[currentChapterIndex + 1].id);
      currentChapterIdRef.current = chapters[currentChapterIndex + 1].id;
      setCurrentPage(1);
    } else {
      alert('Selamat! Anda telah menyelesaikan seluruh bab buku ini 🎉');
    }
  }, [currentChapterIndex, chapters, safeCurrentPage, saveProgress]);

  const goToPrevChapter = useCallback(() => {
    if (currentChapterIndex > 0) {
      const prevCh = chapters[currentChapterIndex - 1];
      setCurrentChapterId(prevCh.id);
      currentChapterIdRef.current = prevCh.id;
      setActivePopover(null);
      if (settings.readingMode === 'scroll') {
        const el = document.getElementById(`chapter-${prevCh.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentChapterIndex, chapters, settings.readingMode]);

  const goToNextChapter = useCallback(() => {
    if (currentChapterIndex < chapters.length - 1) {
      const nextCh = chapters[currentChapterIndex + 1];
      setCurrentChapterId(nextCh.id);
      currentChapterIdRef.current = nextCh.id;
      setActivePopover(null);
      if (settings.readingMode === 'scroll') {
        const el = document.getElementById(`chapter-${nextCh.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentChapterIndex, chapters, settings.readingMode]);

  // Bookmark toggling
  const handleToggleBookmark = useCallback(async () => {
    if (currentBookmark) {
      // Remove bookmark
      try {
        const res = await fetch(`/api/bookmarks?id=${currentBookmark.id}`, { method: 'DELETE' });
        if (res.ok) {
          setBookmarks((prev) => prev.filter((b) => b.id !== currentBookmark.id));
        }
      } catch {
        // ignore
      }
    } else {
      // Add bookmark
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            chapterId: currentChapterId,
            contentPosition: readingAreaRef.current?.scrollTop || 0,
            label: currentChapter?.title || '',
          }),
        });
        if (res.ok) {
          const newBookmark = await res.json();
          setBookmarks((prev) => [newBookmark, ...prev]);
        }
      } catch {
        // ignore
      }
    }
  }, [currentBookmark, book.id, currentChapterId, currentChapter]);

  // Delete bookmark from sidebar
  const handleDeleteBookmark = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/bookmarks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
      }
    } catch {
      // ignore
    }
  }, []);

  // Jump to bookmark
  const handleSelectBookmark = useCallback((bm: Bookmark) => {
    setCurrentChapterId(bm.chapterId);
    currentChapterIdRef.current = bm.chapterId;
    setTimeout(() => {
      if (settings.readingMode === 'scroll') {
        if (bm.contentPosition > 0 && readingAreaRef.current) {
          readingAreaRef.current.scrollTo({ top: bm.contentPosition, behavior: 'smooth' });
        } else {
          const el = document.getElementById(`chapter-${bm.chapterId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        if (readingAreaRef.current && bm.contentPosition > 0) {
          readingAreaRef.current.scrollTo({ top: bm.contentPosition, behavior: 'smooth' });
        }
      }
    }, 150);
  }, [settings.readingMode]);

  // Highlight color change or creation from popover
  const handlePopoverColorSelect = useCallback(
    async (color: HighlightColor) => {
      if (!activePopover) return;

      // Case 1: Existing highlight color change
      if (activePopover.activeHighlight) {
        const id = activePopover.activeHighlight.id;
        try {
          const res = await fetch('/api/highlights', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, color }),
          });
          if (res.ok) {
            setHighlights((prev) =>
              prev.map((h) => (h.id === id ? { ...h, color } : h))
            );
            setActivePopover(null);
          }
        } catch {
          // ignore
        }
        return;
      }

      // Case 2: New text selection -> create highlight
      if (activePopover.selectionData && currentChapter) {
        const targetChapterId = activePopover.selectionData.chapterId || currentChapter.id;
        try {
          const res = await fetch('/api/highlights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookId: book.id,
              chapterId: targetChapterId,
              selectedText: activePopover.selectionData.text,
              startOffset: activePopover.selectionData.startOffset,
              endOffset: activePopover.selectionData.endOffset,
              color,
            }),
          });
          if (res.ok) {
            const newHl = await res.json();
            setHighlights((prev) => [...prev, newHl]);
          }
        } catch {
          // ignore
        } finally {
          setActivePopover(null);
          window.getSelection()?.removeAllRanges();
        }
      }
    },
    [activePopover, currentChapter, book.id]
  );

  // Remove active highlight directly from popover
  const handlePopoverRemoveHighlight = useCallback(async () => {
    let targetId = activePopover?.activeHighlight?.id;

    // Fallback: If activeHighlight was not populated, look up by selection text
    if (!targetId && activePopover?.selectionData) {
      const selText = activePopover.selectionData.text.trim();
      const matched = highlights.find(
        (h) =>
          h.selectedText.trim() === selText ||
          (selText.length > 3 && h.selectedText.includes(selText)) ||
          (h.selectedText.length > 3 && selText.includes(h.selectedText.trim()))
      );
      if (matched) {
        targetId = matched.id;
      }
    }

    setActivePopover(null);
    window.getSelection()?.removeAllRanges();

    if (!targetId) return;

    // Optimistic state update: remove immediately!
    setHighlights((prev) => prev.filter((h) => h.id !== targetId));
    setNotes((prev) => prev.filter((n) => n.highlightId !== targetId));

    try {
      await fetch(`/api/highlights?id=${targetId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete highlight from server:', err);
    }
  }, [activePopover, highlights]);

  // Open note editor from popover
  const handlePopoverOpenNote = useCallback(async () => {
    if (!activePopover) return;

    // Case 1: Existing highlight note
    if (activePopover.activeHighlight) {
      const hl = activePopover.activeHighlight;
      const existingNote = notes.find((n) => n.highlightId === hl.id)?.content || '';
      setActivePopover(null);
      setNoteModal({
        isOpen: true,
        highlight: hl,
        selectedText: hl.selectedText,
        noteContent: existingNote,
      });
      return;
    }

    // Case 2: New text selection -> create highlight, then open note modal
    if (activePopover.selectionData && currentChapter) {
      const targetChapterId = activePopover.selectionData.chapterId || currentChapter.id;
      try {
        const res = await fetch('/api/highlights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            chapterId: targetChapterId,
            selectedText: activePopover.selectionData.text,
            startOffset: activePopover.selectionData.startOffset,
            endOffset: activePopover.selectionData.endOffset,
            color: 'yellow',
          }),
        });
        if (res.ok) {
          const newHl: Highlight = await res.json();
          setHighlights((prev) => [...prev, newHl]);
          setActivePopover(null);
          window.getSelection()?.removeAllRanges();
          setNoteModal({
            isOpen: true,
            highlight: newHl,
            selectedText: newHl.selectedText,
            noteContent: '',
          });
        }
      } catch {
        setActivePopover(null);
      }
    }
  }, [activePopover, currentChapter, book.id, notes]);

  // Save note in modal
  const handleSaveNote = useCallback(
    async (content: string) => {
      if (!noteModal.highlight) return;
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            highlightId: noteModal.highlight.id,
            content,
          }),
        });
        if (res.ok) {
          const savedNote: Note = await res.json();
          setNotes((prev) => {
            const filtered = prev.filter((n) => n.id !== savedNote.id);
            return [savedNote, ...filtered];
          });
        }
      } catch {
        // ignore
      }
    },
    [noteModal.highlight, book.id]
  );

  // Delete highlight (from TOC or modal)
  const handleDeleteHighlight = useCallback(async (id: string) => {
    // Optimistic state update: remove immediately!
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    setNotes((prev) => prev.filter((n) => n.highlightId !== id));

    try {
      await fetch(`/api/highlights?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete highlight from server:', err);
    }
  }, []);

  // Jump to highlight
  const handleSelectHighlight = useCallback(
    (hl: Highlight) => {
      setCurrentChapterId(hl.chapterId);
      currentChapterIdRef.current = hl.chapterId;
      setTocOpen(false);

      if (settings.readingMode === 'paginated') {
        const targetCh = chapters.find((c) => c.id === hl.chapterId);
        if (targetCh) {
          const targetContent =
            currentLang === 'id' && translations[hl.chapterId]
              ? translations[hl.chapterId].content
              : targetCh.content;
          const chPages = paginateChapter(targetContent, settings.wordsPerPage || 250);
          const pageIdx = chPages.findIndex((p) =>
            p.blocks.some((b) => b.text.includes(hl.selectedText))
          );
          if (pageIdx !== -1) {
            setCurrentPage(pageIdx + 1);
          }
        }
      }

      setTimeout(() => {
        const el = document.getElementById(`highlight-${hl.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    },
    [chapters, settings.readingMode, settings.wordsPerPage, currentLang, translations]
  );

  // Click on existing highlight -> open lightweight popover at clicked position
  const handleHighlightClick = useCallback(
    (hl: Highlight, position: { x: number; y: number; bottom?: number }) => {
      setActivePopover({
        position,
        activeHighlight: hl,
      });
    },
    []
  );

  // Text selection handler
  const handleTextSelected = useCallback(
    (
      text: string,
      position: { x: number; y: number; bottom?: number },
      startOffset: number,
      endOffset: number,
      targetChapterId?: string
    ) => {
      const effectiveChapterId = targetChapterId || currentChapterId;
      const targetHighlights = highlights.filter((h) => h.chapterId === effectiveChapterId);
      const normText = text.trim();
      const matchedHl = targetHighlights.find(
        (h) =>
          h.selectedText.trim() === normText ||
          (normText.length > 3 && h.selectedText.includes(normText)) ||
          (h.selectedText.length > 3 && normText.includes(h.selectedText.trim()))
      );
      setActivePopover({
        position,
        selectionData: { text, startOffset, endOffset, chapterId: effectiveChapterId },
        activeHighlight: matchedHl || undefined,
      });
    },
    [currentChapterId, highlights]
  );

  // Document-level text selection listener (Essential for Mobile/iOS touch text selection)
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // If selection was collapsed (e.g. user tapped outside), hide selection popover
      setActivePopover((prev) => (prev?.selectionData ? null : prev));
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (!anchorNode || !focusNode) return;

    const readingArea = readingAreaRef.current;
    if (!readingArea) return;
    if (!readingArea.contains(anchorNode) && !readingArea.contains(focusNode)) {
      return;
    }

    // Determine target chapter ID from DOM ancestry
    let targetChapterId = currentChapterId;
    let curr: Node | null = anchorNode;
    while (curr && curr !== readingArea) {
      if (curr instanceof HTMLElement && curr.getAttribute('data-chapter-id')) {
        targetChapterId = curr.getAttribute('data-chapter-id') || currentChapterId;
        break;
      }
      curr = curr.parentNode;
    }

    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      const clientRects = range.getClientRects();
      if (clientRects.length > 0) {
        rect = clientRects[0];
      }
    }
    if (rect.width === 0 && rect.height === 0) return;

    const targetHighlights = highlights.filter((h) => h.chapterId === targetChapterId);
    const normText = text.trim();
    const matchedHl = targetHighlights.find(
      (h) =>
        h.selectedText.trim() === normText ||
        (normText.length > 3 && h.selectedText.includes(normText)) ||
        (h.selectedText.length > 3 && normText.includes(h.selectedText.trim()))
    );

    setActivePopover({
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
        bottom: rect.bottom,
      },
      selectionData: {
        text,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        chapterId: targetChapterId,
      },
      activeHighlight: matchedHl || undefined,
    });
  }, [currentChapterId, highlights]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // If the touch is inside our active popover, don't dismiss!
      const target = e.target as Node;
      const popoverEl = document.querySelector('[data-selection-popover]');
      if (popoverEl && popoverEl.contains(target)) {
        return;
      }

      // Hide popover during new interaction without removing text selection
      setActivePopover((prev) => (prev?.selectionData ? null : prev));
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
        setActivePopover((prev) => (prev?.selectionData ? null : prev));
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < 2) {
        if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
        setActivePopover((prev) => (prev?.selectionData ? null : prev));
        return;
      }

      // While selection is moving/dragging, keep popover hidden to not block handles
      setActivePopover((prev) => (prev?.selectionData ? null : prev));

      // Reset debounce timer: once user stops dragging handles (300ms of quiet), show popover!
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = setTimeout(() => {
        checkTextSelection();
      }, 300);
    };

    const handleInteractionEnd = () => {
      // If touchend or mouseup fires, accelerate checking selection
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = setTimeout(() => {
        checkTextSelection();
      }, 100);
    };

    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    window.addEventListener('touchend', handleInteractionEnd, { capture: true, passive: true });
    window.addEventListener('touchcancel', handleInteractionEnd, { capture: true, passive: true });
    window.addEventListener('mouseup', handleInteractionEnd, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      window.removeEventListener('touchstart', handleTouchStart, true);
      window.removeEventListener('touchend', handleInteractionEnd, true);
      window.removeEventListener('touchcancel', handleInteractionEnd, true);
      window.removeEventListener('mouseup', handleInteractionEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [checkTextSelection]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (settings.readingMode === 'paginated') {
        if (e.key === 'ArrowLeft') goToPrevPage();
        if (e.key === 'ArrowRight') goToNextPage();
      } else {
        if (e.key === 'ArrowLeft') goToPrevChapter();
        if (e.key === 'ArrowRight') goToNextChapter();
      }
      if (e.key === 't' || e.key === 'T') setTocOpen((v) => !v);
      if (e.key === 'a' || e.key === 'A') setSettingsOpen((v) => !v);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goToPrevChapter, goToNextChapter, goToPrevPage, goToNextPage, settings.readingMode]);

  // Width container class
  const contentWidthClass = useMemo(() => {
    switch (settings.readingWidth) {
      case 'narrow':
        return 'max-w-xl';
      case 'wide':
        return 'max-w-4xl';
      case 'normal':
      default:
        return 'max-w-2xl';
    }
  }, [settings.readingWidth]);

  // Filter highlights for current chapter
  const currentChapterHighlights = useMemo(() => {
    return highlights.filter((h) => h.chapterId === currentChapterId);
  }, [highlights, currentChapterId]);

  // PDF Viewer mode: render native PDF pages instead of reflowed text
  if (activeViewMode === 'pdf-viewer') {
    return (
      <div
        data-reader-theme={settings.theme}
        className="h-dvh-safe flex flex-col transition-colors duration-200"
        style={{
          backgroundColor: 'var(--reader-bg)',
          color: 'var(--reader-text)',
        }}
      >
        <ReaderToolbar
          bookTitle={book.title}
          chapterTitle="PDF Viewer"
          onToggleToc={handleOpenToc}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
          progressPercentage={progressPercentage}
          readingStats={readingStats}
          currentLang={currentLang}
          isTranslating={false}
          onToggleLanguage={handleToggleLanguage}
          currentTheme={settings.theme}
          onToggleTheme={handleToggleTheme}
          readingMode={settings.readingMode}
          onReadingModeChange={setReadingMode}
          isPdfAvailable={isPdfAvailable}
          currentViewMode={activeViewMode}
          onToggleViewMode={handleToggleViewMode}
        />
        <ReaderSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onFontSizeChange={setFontSize}
          onFontFamilyChange={setFontFamily}
          onLineHeightChange={setLineHeight}
          onReadingWidthChange={setReadingWidth}
          onThemeChange={setTheme}
          onReadingModeChange={setReadingMode}
          onWordsPerPageChange={setWordsPerPage}
        />
        <PdfViewerReader book={book} settings={settings} initialProgress={initialProgress} />
      </div>
    );
  }

  if (!currentChapter) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--reader-bg)' }}>
        <Spinner size="lg" />
      </div>
    );
  }


  return (
    <div
      data-reader-theme={settings.theme}
      className="h-dvh-safe flex flex-col transition-colors duration-200"
      style={{
        backgroundColor: 'var(--reader-bg)',
        color: 'var(--reader-text)',
      }}
    >
      {/* Reader Toolbar */}
      <ReaderToolbar
        bookTitle={book.title}
        chapterTitle={displayedTitle}
        onToggleToc={handleOpenToc}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
        progressPercentage={progressPercentage}
        readingStats={readingStats}
        currentLang={currentLang}
        isTranslating={isTranslating}
        onToggleLanguage={handleToggleLanguage}
        currentTheme={settings.theme}
        onToggleTheme={handleToggleTheme}
        readingMode={settings.readingMode}
        onReadingModeChange={setReadingMode}
        isPdfAvailable={isPdfAvailable}
        currentViewMode={activeViewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* Settings Modal Popover */}
      <ReaderSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onFontSizeChange={setFontSize}
        onFontFamilyChange={setFontFamily}
        onLineHeightChange={setLineHeight}
        onReadingWidthChange={setReadingWidth}
        onThemeChange={setTheme}
        onReadingModeChange={setReadingMode}
        onWordsPerPageChange={setWordsPerPage}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Drawer (Right Side) */}
        <TableOfContents
          chapters={navItems}
          currentChapterId={currentChapterId}
          onSelectChapter={handleSelectChapter}
          isOpen={tocOpen}
          onClose={() => setTocOpen(false)}
          highlights={highlights}
          notes={notes}
          onSelectHighlight={handleSelectHighlight}
          onDeleteHighlight={handleDeleteHighlight}
          initialTab={tocInitialTab}
        />

        {/* Floating Side Navigation Buttons for Paginated Mode (Desktop) */}
        {settings.readingMode === 'paginated' && (
          <>
            <button
              onClick={goToPrevPage}
              disabled={currentChapterIndex === 0 && safeCurrentPage === 1}
              aria-label="Previous page"
              className="hidden xl:flex fixed left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full border shadow-lg opacity-70 hover:opacity-100 hover:scale-105 disabled:opacity-0 disabled:pointer-events-none transition-all cursor-pointer backdrop-blur-md"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              }}
              title="Halaman Sebelumnya (←)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              onClick={goToNextPage}
              disabled={currentChapterIndex === chapters.length - 1 && safeCurrentPage === pages.length}
              aria-label="Next page"
              className="hidden xl:flex fixed right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full border shadow-lg opacity-70 hover:opacity-100 hover:scale-105 disabled:opacity-0 disabled:pointer-events-none transition-all cursor-pointer backdrop-blur-md"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              }}
              title="Halaman Berikutnya (→)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Reading area */}
        <main
          ref={readingAreaRef}
          className={
            settings.readingMode === 'paginated'
              ? 'flex-1 overflow-hidden flex flex-col justify-between relative pb-20 pb-safe'
              : 'flex-1 overflow-y-auto relative pb-28 sm:pb-24'
          }
        >
          <div
            className={`w-full transition-all duration-200 ${
              settings.readingMode === 'paginated'
                ? 'max-w-6xl mx-auto px-6 lg:px-12 py-6 flex-1 flex flex-col justify-between'
                : `${contentWidthClass} mx-auto px-6 md:px-12 py-10 md:py-16`
            }`}
          >
            {/* Translation status banners */}
            {currentLang === 'id' && !isTranslating && (
              <div
                className="mb-6 p-3 rounded-xl border flex items-center justify-between text-xs transition-colors shrink-0"
                style={{
                  backgroundColor: 'var(--reader-surface)',
                  borderColor: 'var(--reader-border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Bahasa Indonesia
                  </span>
                  <span className="text-[11px] opacity-60 hidden sm:inline">
                    • Terjemahan tersimpan otomatis
                  </span>
                </div>
                <button
                  onClick={() => setCurrentLang('en')}
                  className="font-medium underline opacity-75 hover:opacity-100 cursor-pointer"
                >
                  Tampilkan Teks Asli (EN)
                </button>
              </div>
            )}

            {isTranslating && (
              <div
                className="mb-6 p-4 rounded-xl border flex items-center gap-3 text-xs shrink-0"
                style={{
                  backgroundColor: 'var(--reader-surface)',
                  borderColor: 'var(--reader-border)',
                }}
              >
                <Spinner size="sm" />
                <span className="font-medium">
                  Sedang menerjemahkan bab ini ke Bahasa Indonesia… Mohon tunggu sebentar.
                </span>
              </div>
            )}

            {translationError && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between shrink-0">
                <span>{translationError}</span>
                <button
                  onClick={handleToggleLanguage}
                  className="underline font-semibold ml-2 cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Slide Mode (Paginated): Running Header */}
            {settings.readingMode === 'paginated' && (
              <div
                className="flex items-center justify-between pb-3 mb-6 border-b text-[11px] opacity-45 tracking-wider uppercase font-sans select-none shrink-0"
                style={{ borderColor: 'var(--reader-border)' }}
              >
                <span className="truncate max-w-[45%] font-medium">{book.title}</span>
                <span className="truncate max-w-[45%] text-right font-medium">{displayedTitle}</span>
              </div>
            )}

            {/* Content Rendering: Continuous scroll of all chapters in Scroll mode, 2-column per-page in Slide mode */}
            {settings.readingMode === 'scroll' ? (
              <div className="space-y-16">
                {chapters.map((chapter, index) => {
                  const isIdLang = currentLang === 'id' && translations[chapter.id];
                  const chContent = isIdLang ? translations[chapter.id].content : chapter.content;
                  const chTitle = isIdLang ? translations[chapter.id].title : chapter.title;
                  const chHighlights = highlights.filter((h) => h.chapterId === chapter.id);

                  return (
                    <section
                      key={chapter.id}
                      id={`chapter-${chapter.id}`}
                      data-chapter-id={chapter.id}
                      data-chapter-index={index}
                      className="scroll-mt-16"
                    >
                      {currentLang === 'id' && !isIdLang && Boolean(translatingChapterIds[chapter.id]) && (
                        <div
                          className="mb-6 p-3.5 rounded-xl border flex items-center justify-center gap-2.5 text-xs animate-pulse"
                          style={{
                            backgroundColor: 'var(--reader-surface)',
                            borderColor: 'var(--reader-border)',
                          }}
                        >
                          <Spinner size="sm" />
                          <span className="opacity-80 font-medium">
                            Menerjemahkan Bab {index + 1} ke Bahasa Indonesia…
                          </span>
                        </div>
                      )}

                      <ChapterContent
                        content={chContent}
                        chapterTitle={chTitle}
                        chapterId={chapter.id}
                        chapterNumber={index + 1}
                        settings={settings}
                        highlights={chHighlights}
                        showChapterTitle={true}
                        isTwoColumn={false}
                        onTextSelected={handleTextSelected}
                        onHighlightClick={handleHighlightClick}
                      />

                      {/* Chapter Separator between chapters */}
                      {index < chapters.length - 1 && (
                        <div className="mt-16 md:mt-24 pt-8 flex items-center justify-center gap-4 opacity-30 select-none">
                          <div className="h-px w-16 bg-current" />
                          <span className="text-sm font-serif">✦ ✦ ✦</span>
                          <div className="h-px w-16 bg-current" />
                        </div>
                      )}
                    </section>
                  );
                })}

                {/* End of Book Card */}
                <div
                  className="mt-20 pt-10 border-t text-center select-none space-y-4"
                  style={{ borderColor: 'var(--reader-border)' }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="font-editorial text-xl font-bold">Akhir Buku</h3>
                  <p className="text-xs sm:text-sm opacity-70 max-w-md mx-auto">
                    Anda telah membaca seluruh isi buku <strong>{book.title}</strong>.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setIsRatingModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shadow-2xs hover:opacity-100 opacity-90 transition-all cursor-pointer"
                      style={{
                        backgroundColor: 'var(--reader-surface)',
                        borderColor: 'var(--reader-border)',
                      }}
                    >
                      <span className="text-amber-400">★</span>
                      <span>{userRating > 0 ? `Rating: ${userRating}/5` : 'Beri Rating'}</span>
                    </button>
                    <button
                      onClick={() => readingAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shadow-2xs hover:opacity-100 opacity-90 transition-all cursor-pointer"
                      style={{
                        backgroundColor: 'var(--reader-surface)',
                        borderColor: 'var(--reader-border)',
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                      <span>Kembali ke Atas</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Slide (Paginated) Mode */
              <div className="flex-1 overflow-hidden">
                <ChapterContent
                  content={activePage ? activePage.blocks : []}
                  chapterTitle={displayedTitle}
                  chapterId={currentChapterId}
                  chapterNumber={currentChapterIndex + 1}
                  settings={settings}
                  highlights={currentChapterHighlights}
                  showChapterTitle={safeCurrentPage === 1}
                  isTwoColumn={isDesktop}
                  onTextSelected={handleTextSelected}
                  onHighlightClick={handleHighlightClick}
                />
              </div>
            )}
          </div>
        </main>

        {/* Scroll Mode: Floating Bottom Progress Pill Widget (Matching Image 1) */}
        {settings.readingMode === 'scroll' && (
          <div
            className="fixed left-1/2 -translate-x-1/2 z-20 w-[280px] sm:w-[400px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border shadow-xl backdrop-blur-xl flex flex-col gap-2 select-none transition-all hover:opacity-100 opacity-95"
            style={{
              ...{
                backgroundColor: 'var(--reader-toolbar-bg)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              },
              bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            }}

          >
            <div className="flex items-center justify-between text-xs font-mono font-medium">
              <span className="opacity-80">
                {currentChapterIndex + 1}/{chapters.length}
              </span>
              <span className="text-[11px] font-semibold tabular-nums opacity-80">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            <div
              className="w-full h-1 rounded-full overflow-hidden opacity-30"
              style={{ backgroundColor: 'var(--reader-border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercentage}%`,
                  backgroundColor: '#e11d48', // vibrant red accent matching reference
                }}
              />
            </div>
          </div>
        )}

        {/* Scroll Mode: Floating Scroll-To-Top Button (Matching Image 1) */}
        {settings.readingMode === 'scroll' && (
          <button
            onClick={() => readingAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed right-4 sm:right-6 z-20 w-10 h-10 rounded-full border shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 transition-all cursor-pointer backdrop-blur-md hover:scale-105"
            style={{
              ...{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              },
              bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
            }}

            title="Kembali ke atas"
            aria-label="Scroll to top"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6"/>
            </svg>
          </button>
        )}

        {/* Slide Mode (Paginated): Fixed Bottom Navigation Bar (Matching Image 2) */}
        {settings.readingMode === 'paginated' && (
          <footer
            className="fixed bottom-0 left-0 right-0 min-h-16 border-t backdrop-blur-md px-3 sm:px-10 flex items-center justify-between select-none z-20 transition-colors pb-safe"
            /* h-16 + safe-area padding for iPhone notch */
            style={{
              backgroundColor: 'var(--reader-toolbar-bg)',
              borderColor: 'var(--reader-border)',
              color: 'var(--reader-text)',
            }}
          >
            {/* Left Button: Beri Rating */}
            <button
              onClick={() => setIsRatingModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold opacity-85 hover:opacity-100 transition-all cursor-pointer shadow-2xs"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
              }}
              title="Beri rating untuk buku ini"
            >
              <span className="text-amber-400 text-sm">{userRating > 0 ? '★' : '☆'}</span>
              <span className="hidden sm:inline">{userRating > 0 ? `Rating: ${userRating}/5` : 'Beri Rating'}</span>
            </button>

            {/* Center Pagination: < Page X of Y > */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={goToPrevPage}
                disabled={currentChapterIndex === 0 && safeCurrentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer border"
                style={{
                  backgroundColor: 'var(--reader-surface)',
                  borderColor: 'var(--reader-border)',
                }}
                title="Halaman Sebelumnya (←)"
                aria-label="Previous page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>

              <span className="text-xs font-medium tracking-wide font-sans">
                Page {safeCurrentPage} of {pages.length}
              </span>

              <button
                onClick={goToNextPage}
                disabled={currentChapterIndex === chapters.length - 1 && safeCurrentPage === pages.length}
                className="w-8 h-8 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer border"
                style={{
                  backgroundColor: 'var(--reader-surface)',
                  borderColor: 'var(--reader-border)',
                }}
                title="Halaman Berikutnya (→)"
                aria-label="Next page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Right Button: Selesai Dibaca */}
            <button
              onClick={handleMarkChapterCompleted}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-all cursor-pointer shadow-2xs"
              title="Tandai bab ini telah selesai dibaca"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="hidden sm:inline">Selesai Dibaca</span>
            </button>
          </footer>
        )}
      </div>

      {/* Interactive Book Rating Modal */}
      {isRatingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setIsRatingModalOpen(false)}
        >
          <div
            className="p-6 rounded-2xl border max-w-sm w-full shadow-2xl text-center"
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
              color: 'var(--reader-text)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-editorial text-lg font-bold mb-1">Beri Rating Buku</h3>
            <p className="text-xs opacity-70 mb-4 line-clamp-1">{book.title}</p>

            {/* 5 Interactive Stars */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  className="text-3xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                >
                  <span className={star <= userRating ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-700'}>
                    ★
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsRatingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`ebook_rating_${book.id}`, String(userRating));
                  }
                  setIsRatingModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] cursor-pointer shadow-xs"
              >
                Simpan Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating text selection & highlight action popover */}
      {activePopover && (
        <SelectionPopover
          position={activePopover.position}
          activeHighlight={activePopover.activeHighlight}
          hasNote={
            activePopover.activeHighlight
              ? Boolean(notes.some((n) => n.highlightId === activePopover.activeHighlight?.id))
              : false
          }
          onHighlight={handlePopoverColorSelect}
          onRemoveHighlight={handlePopoverRemoveHighlight}
          onOpenNote={handlePopoverOpenNote}
          onClose={(clearSelection = false) => {
            setActivePopover(null);
            if (clearSelection) {
              window.getSelection()?.removeAllRanges();
            }
          }}
        />
      )}

      {/* Note editor modal */}
      <NoteEditorModal
        isOpen={noteModal.isOpen}
        onClose={() => setNoteModal({ isOpen: false, selectedText: '', noteContent: '' })}
        selectedText={noteModal.selectedText}
        initialContent={noteModal.noteContent}
        onSave={handleSaveNote}
        onDeleteHighlight={
          noteModal.highlight ? () => handleDeleteHighlight(noteModal.highlight!.id) : undefined
        }
      />
    </div>
  );
}
