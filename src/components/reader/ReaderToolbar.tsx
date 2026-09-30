'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { ReadingTheme, ReadingMode } from '@/types';

interface ReaderToolbarProps {
  bookTitle: string;
  chapterTitle?: string;
  onToggleToc: (initialTab?: 'toc' | 'highlights' | 'notes') => void;
  onToggleSettings: () => void;
  progressPercentage: number;
  readingStats?: {
    wordsLeftInChapter: number;
    minutesLeftInChapter: number;
  };
  currentLang?: 'en' | 'id';
  isTranslating?: boolean;
  onToggleLanguage?: () => void;
  currentTheme?: ReadingTheme;
  onToggleTheme?: () => void;
  readingMode: ReadingMode;
  onReadingModeChange: (mode: ReadingMode) => void;
  isPdfAvailable?: boolean;
  currentViewMode?: 'reflow' | 'pdf-viewer';
  onToggleViewMode?: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onOpenRating?: () => void;
}

export default function ReaderToolbar({
  bookTitle,
  chapterTitle,
  onToggleToc,
  onToggleSettings,
  progressPercentage,
  readingStats,
  currentLang = 'en',
  isTranslating = false,
  onToggleLanguage,
  currentTheme = 'light',
  onToggleTheme,
  readingMode = 'scroll',
  onReadingModeChange,
  isPdfAvailable = false,
  currentViewMode = 'reflow',
  onToggleViewMode,
  isBookmarked = false,
  onToggleBookmark,
  onOpenRating,
}: ReaderToolbarProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  return (
    <header
      className="sticky top-0 z-30 transition-colors w-full select-none"
      style={{
        backgroundColor: 'var(--reader-bg)',
        color: 'var(--reader-text)',
      }}
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-8 max-w-3xl mx-auto w-full">
        {/* Left side: Malaka-style open book logo returning to / (Library) */}
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl opacity-80 hover:opacity-100 transition-all hover:scale-105 cursor-pointer flex items-center justify-center text-current"
          title="Kembali ke Perpustakaan"
          aria-label="Kembali ke Perpustakaan"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C10.5 3.2 8.5 2.5 6.5 2.5C4.5 2.5 2.7 3.1 1.5 4.1C1.2 4.3 1 4.6 1 5V18.5C1 19.3 1.7 20 2.5 20C4.2 20 6 20.6 7.5 21.5C9 20.6 10.8 20 12.5 20C14.2 20 16 20.6 17.5 21.5C19 20.6 20.8 20 22.5 20C23.3 20 24 19.3 24 18.5V5C24 4.6 23.8 4.3 23.5 4.1C22.3 3.1 20.5 2.5 18.5 2.5C16.5 2.5 14.5 3.2 13 4.5L12 5.5L11 4.5H12ZM11 6.8V18.5C9.7 18.2 8.2 18 6.5 18C4.8 18 3.5 18.3 2.5 18.7V5.5C3.6 4.9 5 4.5 6.5 4.5C8.2 4.5 9.8 5.3 11 6.8ZM13 18.5V6.8C14.2 5.3 15.8 4.5 17.5 4.5C19 4.5 20.4 4.9 21.5 5.5V18.7C20.5 18.3 19.2 18 17.5 18C15.8 18 14.3 18.2 13 18.5Z" />
          </svg>
        </Link>

        {/* Right side: Sleek Malaka-style floating capsule pill */}
        <div
          className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-full border shadow-2xs transition-all backdrop-blur-md"
          style={{
            backgroundColor: 'var(--reader-surface)',
            borderColor: 'var(--reader-border)',
          }}
        >
          {/* 1. Table of Contents */}
          <button
            onClick={() => onToggleToc('toc')}
            className="p-1.5 rounded-full opacity-70 hover:opacity-100 hover:scale-105 transition-all cursor-pointer"
            title="Daftar Isi Bab"
            aria-label="Table of contents"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>

          {/* 2. Highlights / Notes */}
          <button
            onClick={() => onToggleToc('highlights')}
            className="p-1.5 rounded-full opacity-70 hover:opacity-100 hover:scale-105 transition-all cursor-pointer"
            title="Sorotan & Catatan"
            aria-label="Highlights and notes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>

          {/* 3. Typography Aa */}
          <button
            onClick={onToggleSettings}
            className="px-2 py-0.5 rounded-full opacity-80 hover:opacity-100 hover:scale-105 transition-all cursor-pointer font-serif font-bold text-sm tracking-tight"
            title="Pengaturan Tampilan (Aa)"
            aria-label="Appearance settings"
          >
            Aa
          </button>

          {/* 4. Bookmark Ribbon Icon (Red ribbon marker matching Malaka UI) */}
          <button
            onClick={onToggleBookmark}
            className="p-1.5 rounded-full transition-all cursor-pointer hover:scale-105 flex items-center justify-center"
            title={isBookmarked ? 'Hapus Pembatas Buku' : 'Tambah Pembatas Buku'}
            aria-label="Toggle Bookmark"
          >
            <div
              className={`w-3.5 h-2 rounded-xs transition-all ${
                isBookmarked
                  ? 'bg-red-600 shadow-xs scale-110'
                  : 'bg-red-600/35 hover:bg-red-600/60'
              }`}
            />
          </button>

          {/* 5. More Options (•••) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen((v) => !v)}
              className="p-1.5 rounded-full opacity-70 hover:opacity-100 hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
              title="Opsi Lainnya"
              aria-label="More options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="6" cy="12" r="1.5" />
                <circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>

            {/* Sleek Popover Menu */}
            {moreMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-60 rounded-2xl border shadow-xl backdrop-blur-xl p-2 z-50 text-xs flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
                style={{
                  backgroundColor: 'var(--reader-bg)',
                  borderColor: 'var(--reader-border)',
                  color: 'var(--reader-text)',
                }}
              >
                {/* Theme Toggle */}
                <button
                  onClick={() => {
                    onToggleTheme?.();
                    setMoreMenuOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-500/10 transition-colors w-full text-left cursor-pointer"
                >
                  <span className="font-medium">Tema Tampilan</span>
                  <span className="capitalize opacity-60 text-[11px] font-mono">{currentTheme}</span>
                </button>

                {/* Reading Mode Switcher */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-500/10 transition-colors">
                  <span className="font-medium">Mode Baca</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        onReadingModeChange('scroll');
                        setMoreMenuOpen(false);
                      }}
                      className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                        readingMode === 'scroll' ? 'bg-red-600 text-white shadow-2xs' : 'opacity-60'
                      }`}
                    >
                      Scroll
                    </button>
                    <button
                      onClick={() => {
                        onReadingModeChange('paginated');
                        setMoreMenuOpen(false);
                      }}
                      className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                        readingMode === 'paginated' ? 'bg-red-600 text-white shadow-2xs' : 'opacity-60'
                      }`}
                    >
                      Slide
                    </button>
                  </div>
                </div>

                {/* Translation EN <-> ID */}
                {onToggleLanguage && (
                  <button
                    onClick={() => {
                      onToggleLanguage();
                      setMoreMenuOpen(false);
                    }}
                    disabled={isTranslating}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-500/10 transition-colors w-full text-left cursor-pointer"
                  >
                    <span className="font-medium">Terjemahan AI</span>
                    <span className="font-semibold text-rose-500 text-[11px]">
                      {currentLang === 'id' ? 'Bahasa Indonesia' : 'Bahasa Asli'}
                    </span>
                  </button>
                )}

                {/* PDF View Mode (if PDF) */}
                {isPdfAvailable && onToggleViewMode && (
                  <button
                    onClick={() => {
                      onToggleViewMode();
                      setMoreMenuOpen(false);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-500/10 transition-colors w-full text-left cursor-pointer"
                  >
                    <span className="font-medium">Format Dokumen</span>
                    <span className="font-semibold opacity-75 text-[11px]">
                      {currentViewMode === 'pdf-viewer' ? 'PDF Asli' : 'Reflow (Bersih)'}
                    </span>
                  </button>
                )}

                {/* Beri Rating */}
                {onOpenRating && (
                  <button
                    onClick={() => {
                      onOpenRating();
                      setMoreMenuOpen(false);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-500/10 transition-colors w-full text-left border-t mt-1 pt-2 cursor-pointer"
                    style={{ borderColor: 'var(--reader-border)' }}
                  >
                    <span className="font-medium">Beri Rating Buku</span>
                    <span className="text-amber-400">★ ★ ★ ★ ★</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
