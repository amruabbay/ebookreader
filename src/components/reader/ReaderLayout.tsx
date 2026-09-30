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
import ChapterErrorBoundary from './ChapterErrorBoundary';
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
  const [currentChapterId, setCurrentChapterId] = useState<string>(() => {
    const exists = chapters.some((c) => c.id === initialProgress?.chapterId);
    return exists ? (initialProgress?.chapterId as string) : (chapters[0]?.id || '');
  });
  const filteredNavItems = useMemo(() => {
    return navItems.filter(
      (item) =>
        !/terima\s+kasih\s+telah\s+mengunduh|ebook\s+simon\s*&\s*schuster|klik\s+di\s+sini\s+untuk\s+mendaftar|click\s+here\s+to\s+sign\s+up|dapatkan\s+ebook\s+gratis|kami\s+harap\s+anda\s+menikmati/i.test(
          item.title
        )
    );
  }, [navItems]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocInitialTab, setTocInitialTab] = useState<'toc' | 'bookmarks' | 'highlights' | 'notes'>('toc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; icon?: 'bookmark' | 'check' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, icon?: 'bookmark' | 'check') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, icon });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

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
    // Base target: desktop (2 columns) is 280 words, mobile (1 column) is ~95-105 words
    const isSmallMobile = typeof window !== 'undefined' && window.innerHeight < 720;
    const baseTarget = isDesktop ? 290 : isSmallMobile ? 85 : 100;

    // Density factor from user setting (if set)
    let densityFactor = 1.0;
    if (settings.wordsPerPage) {
      const userRef = isDesktop ? 290 : 100;
      const ratio = settings.wordsPerPage / userRef;
      if (ratio >= 0.6 && ratio <= 1.4) {
        densityFactor = ratio;
      }
    }

    // Scale dynamically with font size and line height
    const fontScale = Math.pow(18 / Math.max(12, settings.fontSize), 1.4);
    const lineScale = 1.75 / Math.max(1.2, settings.lineHeight);

    const calculated = Math.round(baseTarget * densityFactor * fontScale * lineScale);
    // Safe bounds to prevent vertical overflow on any device
    const minWords = isDesktop ? 160 : 45;
    const maxWords = isDesktop ? 380 : 135;
    return Math.min(maxWords, Math.max(minWords, calculated));
  }, [isDesktop, settings.wordsPerPage, settings.fontSize, settings.lineHeight]);

  // Pagination calculation for paginated mode
  const pages = useMemo(() => {
    return paginateChapter(displayedContent, effectiveWordsPerPage, {
      firstPageReserve: isDesktop ? 70 : 40,
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

  // Initial page restoration for paginated mode
  const initialPageRestoredRef = useRef(false);
  useEffect(() => {
    if (initialPageRestoredRef.current) return;
    if (settings.readingMode === 'paginated' && pages.length > 0 && initialProgress) {
      initialPageRestoredRef.current = true;
      const initialChId = initialProgress.chapterId;
      const chIndex = chapters.findIndex((c) => c.id === initialChId);
      const activeIdx = chIndex >= 0 ? chIndex : 0;

      const rawPos = initialProgress.contentPosition;
      if (rawPos >= 1 && rawPos <= pages.length) {
        setCurrentPage(rawPos);
      } else {
        const fraction = Math.max(
          0,
          Math.min(1, (initialProgress.progressPercentage / 100) * chapters.length - activeIdx)
        );
        const restoredPage = Math.min(
          pages.length,
          Math.max(1, Math.round(fraction * (pages.length - 1)) + 1)
        );
        setCurrentPage(restoredPage);
      }
    }
  }, [settings.readingMode, pages.length, initialProgress, chapters]);

  // Smooth position preservation when switching between scroll and paginated modes in real-time
  const prevReadingModeRef = useRef(settings.readingMode);
  useEffect(() => {
    if (prevReadingModeRef.current !== settings.readingMode) {
      const wasPaginated = prevReadingModeRef.current === 'paginated';
      const isNowScroll = settings.readingMode === 'scroll';
      const isNowPaginated = settings.readingMode === 'paginated';

      if (wasPaginated && isNowScroll) {
        // We were in paginated mode at safeCurrentPage
        const fraction = pages.length > 1 ? (safeCurrentPage - 1) / (pages.length - 1) : 0;
        setTimeout(() => {
          if (readingAreaRef.current) {
            const el = readingAreaRef.current;
            const chEl = document.getElementById(`chapter-${currentChapterId}`);
            if (chEl) {
              const chTop = chEl.offsetTop;
              const chHeight = chEl.offsetHeight;
              const targetTop = chTop + fraction * Math.max(0, chHeight - el.clientHeight);
              el.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            }
          }
        }, 100);
      } else if (!wasPaginated && isNowPaginated) {
        // We were in scroll mode. Calculate current scroll fraction of active chapter
        if (readingAreaRef.current) {
          const el = readingAreaRef.current;
          const chEl = document.getElementById(`chapter-${currentChapterId}`);
          let fraction = 0;
          if (chEl) {
            const relativeScroll = el.scrollTop - chEl.offsetTop;
            const availableScroll = Math.max(1, chEl.offsetHeight - el.clientHeight);
            fraction = Math.max(0, Math.min(1, relativeScroll / availableScroll));
          } else {
            const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
            fraction = Math.max(0, Math.min(1, el.scrollTop / maxScroll));
          }
          const targetPage = Math.min(
            pages.length,
            Math.max(1, Math.round(fraction * (pages.length - 1)) + 1)
          );
          setCurrentPage(targetPage);
        }
      }
      prevReadingModeRef.current = settings.readingMode;
    }
  }, [settings.readingMode, currentChapterId, safeCurrentPage, pages.length]);

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

  const handleOpenToc = useCallback((tab: 'toc' | 'bookmarks' | 'highlights' | 'notes' = 'toc') => {
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

  // Mobile Touch Gestures: Horizontal Swipe & Tap-Zone detection
  const touchStateRef = useRef<{ startX: number; startY: number; startTime: number }>({
    startX: 0,
    startY: 0,
    startTime: 0,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStateRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTime: Date.now(),
      };
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStateRef.current.startX;
        const deltaY = e.changedTouches[0].clientY - touchStateRef.current.startY;
        const deltaTime = Date.now() - touchStateRef.current.startTime;

        // Check horizontal swipe (must be horizontal, > 45px, within 450ms)
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaTime < 450) {
          if (settings.readingMode === 'paginated') {
            if (deltaX < 0) {
              goToNextPage();
            } else {
              goToPrevPage();
            }
          } else {
            if (deltaX < 0) {
              goToNextChapter();
            } else {
              goToPrevChapter();
            }
          }
          return;
        }

        // Check Tap (little movement, < 250ms)
        if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12 && deltaTime < 250) {
          // Check if user is selecting text - don't interfere with selection
          const selection = window.getSelection();
          if (selection && selection.toString().trim().length > 0) return;

          const screenW = window.innerWidth;
          const tapX = e.changedTouches[0].clientX;

          if (settings.readingMode === 'paginated') {
            // Tap zones: Left 20% -> prev page, Right 20% -> next page, Center 60% -> toggle UI
            if (tapX < screenW * 0.2) {
              goToPrevPage();
            } else if (tapX > screenW * 0.8) {
              goToNextPage();
            } else {
              setIsUIVisible((v) => !v);
            }
          } else {
            // Scroll mode: Center tap toggles UI
            setIsUIVisible((v) => !v);
          }
        }
      }
    },
    [settings.readingMode, goToNextPage, goToPrevPage, goToNextChapter, goToPrevChapter]
  );

  // Bookmark in-flight action ref
  const isBookmarkActionInProgressRef = useRef(false);

  // Bookmark toggling with optimistic update and toast feedback
  const handleToggleBookmark = useCallback(async () => {
    if (isBookmarkActionInProgressRef.current) return;
    isBookmarkActionInProgressRef.current = true;

    if (currentBookmark) {
      // Optimistically remove bookmark
      const bookmarkToRemove = currentBookmark;
      setBookmarks((prev) => prev.filter((b) => b.chapterId !== currentChapterId && b.id !== bookmarkToRemove.id));
      showToast('Penanda halaman dihapus');

      try {
        const url = bookmarkToRemove.id.startsWith('temp-')
          ? `/api/bookmarks?bookId=${encodeURIComponent(book.id)}&chapterId=${encodeURIComponent(currentChapterId)}`
          : `/api/bookmarks?id=${encodeURIComponent(bookmarkToRemove.id)}&bookId=${encodeURIComponent(book.id)}&chapterId=${encodeURIComponent(currentChapterId)}`;

        await fetch(url, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete bookmark:', err);
      } finally {
        isBookmarkActionInProgressRef.current = false;
      }
    } else {
      // Optimistically add bookmark
      const tempId = `temp-${Date.now()}`;
      const scrollPos = readingAreaRef.current?.scrollTop || 0;
      const chTitle = displayedTitle || currentChapter?.title || 'Bab';
      const optimisticBookmark: Bookmark = {
        id: tempId,
        bookId: book.id,
        chapterId: currentChapterId,
        contentPosition: scrollPos,
        label: chTitle,
        createdAt: new Date().toISOString(),
      };

      setBookmarks((prev) => [optimisticBookmark, ...prev.filter((b) => b.chapterId !== currentChapterId)]);
      showToast('Halaman berhasil ditandai', 'bookmark');

      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            chapterId: currentChapterId,
            contentPosition: scrollPos,
            label: chTitle,
          }),
        });

        if (res.ok) {
          const newBookmark = await res.json();
          setBookmarks((prev) =>
            prev.map((b) => (b.id === tempId || b.chapterId === currentChapterId ? newBookmark : b))
          );
        }
      } catch (err) {
        console.error('Failed to save bookmark:', err);
      } finally {
        isBookmarkActionInProgressRef.current = false;
      }
    }
  }, [currentBookmark, book.id, currentChapterId, currentChapter, displayedTitle, showToast]);

  // Delete bookmark from sidebar
  const handleDeleteBookmark = useCallback(async (id: string) => {
    const target = bookmarks.find((b) => b.id === id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    showToast('Penanda halaman dihapus');
    try {
      const url = target
        ? `/api/bookmarks?id=${encodeURIComponent(id)}&bookId=${encodeURIComponent(target.bookId)}&chapterId=${encodeURIComponent(target.chapterId)}`
        : `/api/bookmarks?id=${encodeURIComponent(id)}`;
      await fetch(url, { method: 'DELETE' });
    } catch {
      // ignore
    }
  }, [bookmarks, showToast]);

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
        className="h-dvh-safe flex flex-col transition-colors duration-200 overflow-x-hidden w-full max-w-full"
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
          isBookmarked={!!currentBookmark}
          onToggleBookmark={handleToggleBookmark}
          onOpenRating={() => setIsRatingModalOpen(true)}
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
        <PdfViewerReader
          book={book}
          settings={settings}
          initialProgress={initialProgress}
          chapterId={chapters[0]?.id || currentChapterId}
          onProgressChange={setProgressPercentage}
        />
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
      className="h-dvh-safe flex flex-col transition-colors duration-200 overflow-x-hidden w-full max-w-full"
      style={{
        backgroundColor: 'var(--reader-bg)',
        color: 'var(--reader-text)',
      }}
    >
      {/* Reader Toolbar with Immersive Toggle */}
      <div
        className={`transition-all duration-300 ease-in-out z-30 shrink-0 ${
          isUIVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <ReaderToolbar
          bookTitle={book.title}
          chapterTitle={displayedTitle}
          onToggleToc={handleOpenToc}
          onToggleSettings={() => {
            setIsUIVisible(true);
            setSettingsOpen((v) => !v);
          }}
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
          isBookmarked={!!currentBookmark}
          onToggleBookmark={handleToggleBookmark}
          onOpenRating={() => setIsRatingModalOpen(true)}
        />
      </div>

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
          chapters={filteredNavItems}
          currentChapterId={currentChapterId}
          onSelectChapter={handleSelectChapter}
          isOpen={tocOpen}
          onClose={() => setTocOpen(false)}
          highlights={highlights}
          notes={notes}
          onSelectHighlight={handleSelectHighlight}
          onDeleteHighlight={handleDeleteHighlight}
          initialTab={tocInitialTab}
          bookmarks={bookmarks}
          onSelectBookmark={handleSelectBookmark}
          onDeleteBookmark={handleDeleteBookmark}
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
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={
            settings.readingMode === 'paginated'
              ? 'flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-between relative w-full max-w-full'
              : 'flex-1 overflow-y-auto overflow-x-hidden relative pb-28 sm:pb-24 w-full max-w-full'
          }
          style={{
            paddingBottom:
              settings.readingMode === 'paginated'
                ? 'calc(5.5rem + env(safe-area-inset-bottom, 0px))'
                : undefined,
          }}
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
                {/* Malaka-style Editorial Book Header Card */}
                <div className="mb-14 pt-2 border-b pb-8 select-none" style={{ borderColor: 'var(--reader-border)' }}>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      {book.author && (
                        <p className="text-sm font-medium opacity-60 mb-2 font-sans tracking-wide">
                          {book.author}
                        </p>
                      )}
                      <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight leading-snug mb-3">
                        {book.title}
                      </h1>
                      <p className="text-xs opacity-50 font-sans">
                        {chapters.length} chapters
                      </p>
                    </div>
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-20 sm:w-24 h-28 sm:h-34 object-cover rounded-lg shadow-sm shrink-0 border"
                        style={{ borderColor: 'var(--reader-border)' }}
                      />
                    ) : (
                      <div
                        className="w-20 sm:w-24 h-28 sm:h-34 rounded-lg shadow-sm shrink-0 border flex flex-col items-center justify-center p-2 text-center"
                        style={{ backgroundColor: 'var(--reader-surface)', borderColor: 'var(--reader-border)' }}
                      >
                        <span className="text-2xl mb-1">📖</span>
                        <span className="text-[10px] font-serif font-bold line-clamp-3 leading-tight opacity-75">{book.title}</span>
                      </div>
                    )}
                  </div>
                </div>

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

                      <ChapterErrorBoundary
                        chapterTitle={chTitle}
                        onNextChapter={index < chapters.length - 1 ? goToNextChapter : undefined}
                      >
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
                      </ChapterErrorBoundary>

                      {/* Chapter Separator between chapters (Matching Malaka Image 1 ornament) */}
                      {index < chapters.length - 1 && (
                        <div className="flex items-center justify-center gap-3 my-20 opacity-35 select-none">
                          <div className="h-px w-20 bg-gradient-to-r from-transparent to-current" />
                          <svg width="48" height="12" viewBox="0 0 48 12" fill="currentColor">
                            <circle cx="12" cy="6" r="3" />
                            <circle cx="20" cy="6" r="4.5" />
                            <circle cx="28" cy="6" r="4.5" />
                            <circle cx="36" cy="6" r="3" />
                          </svg>
                          <div className="h-px w-20 bg-gradient-to-l from-transparent to-current" />
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
              <div className="flex-1 w-full min-h-0">
                <ChapterErrorBoundary
                  chapterTitle={displayedTitle}
                  onNextChapter={currentChapterIndex < chapters.length - 1 ? goToNextChapter : undefined}
                >
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
                </ChapterErrorBoundary>
              </div>
            )}
          </div>
        </main>

        {/* Floating Bottom Progress Capsule with Segmented Bar (Matching Malaka Image 1, 2, 3) */}
        {settings.readingMode === 'scroll' && (
          <div
            className={`fixed left-1/2 -translate-x-1/2 z-20 w-[280px] sm:w-[320px] px-5 py-2.5 rounded-full border shadow-xl backdrop-blur-xl flex flex-col gap-1.5 select-none transition-all duration-300 ${
              isUIVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
            }`}
            style={{
              backgroundColor: 'var(--reader-toolbar-bg)',
              borderColor: 'var(--reader-border)',
              color: 'var(--reader-text)',
              bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-sans font-medium">
              <span className="opacity-75 tabular-nums">
                {currentChapterIndex + 1}/{chapters.length}
              </span>
              <span className="opacity-75 tabular-nums font-semibold">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>

            {/* Segmented chapter progress bar */}
            <div className="flex items-center gap-1 w-full h-1">
              {chapters.map((_, i) => {
                const isCompleted = i < currentChapterIndex;
                const isCurrent = i === currentChapterIndex;
                const chapterSpan = 100 / Math.max(1, chapters.length);
                const chapterStart = i * chapterSpan;
                const intraChapterRatio = Math.max(
                  0,
                  Math.min(1, (progressPercentage - chapterStart) / chapterSpan)
                );

                return (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full overflow-hidden transition-all duration-200"
                    style={{ backgroundColor: 'rgba(150, 150, 150, 0.25)' }}
                  >
                    {isCompleted && (
                      <div className="w-full h-full bg-red-600 dark:bg-red-500 rounded-full" />
                    )}
                    {isCurrent && (
                      <div
                        className="h-full bg-red-600 dark:bg-red-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(15, intraChapterRatio * 100)}%` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Slide Mode (Paginated): Fixed Bottom Navigation Bar (Matching Image 2) */}
        {settings.readingMode === 'paginated' && (
          <footer
            className={`fixed bottom-0 left-0 right-0 min-h-16 border-t backdrop-blur-md px-3 sm:px-10 flex items-center justify-between select-none z-20 transition-all duration-300 ease-in-out pb-safe ${
              isUIVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
            }`}
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full shadow-xl border text-xs font-medium backdrop-blur-md"
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
              color: 'var(--reader-text)',
            }}
          >
            {toastMessage.icon === 'bookmark' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-red-600">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
              </svg>
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
