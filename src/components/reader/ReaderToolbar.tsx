'use client';

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
}: ReaderToolbarProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors"
      style={{
        backgroundColor: 'var(--reader-toolbar-bg)',
        borderColor: 'var(--reader-border)',
        color: 'var(--reader-text)',
      }}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        {/* Left side: Back to library & Titles */}
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity shrink-0 py-1 px-2 rounded-lg"
            style={{ backgroundColor: 'var(--reader-surface)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Library</span>
          </Link>

          <span className="opacity-30">|</span>

          <div className="min-w-0">
            <h1 className="text-xs font-semibold truncate leading-tight">
              {bookTitle}
            </h1>
            {chapterTitle && (
              <p className="text-[11px] opacity-60 truncate leading-tight flex items-center gap-1.5">
                <span>{chapterTitle}</span>
                {currentLang === 'id' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    ID
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Action controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Reading stats estimate */}
          {readingStats && readingStats.minutesLeftInChapter > 0 && (
            <span className="hidden lg:inline-block text-[11px] opacity-60 font-mono mr-1">
              ~{readingStats.minutesLeftInChapter} min
            </span>
          )}

          {/* PDF vs Reflow toggle if book is a PDF */}
          {isPdfAvailable && onToggleViewMode && (
            <button
              type="button"
              onClick={onToggleViewMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer mr-1 select-none ${
                currentViewMode === 'pdf-viewer'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs'
                  : 'opacity-75 hover:opacity-100'
              }`}
              style={{
                backgroundColor: currentViewMode === 'pdf-viewer' ? undefined : 'var(--reader-surface)',
                borderColor: currentViewMode === 'pdf-viewer' ? undefined : 'var(--reader-border)',
              }}
              title={
                currentViewMode === 'pdf-viewer'
                  ? 'Beralih ke Mode Reflow (Teks Responsif)'
                  : 'Beralih ke Mode Dokumen PDF Asli'
              }
              aria-label="Toggle View Mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span className="hidden sm:inline">{currentViewMode === 'pdf-viewer' ? 'PDF Asli' : 'Reflow'}</span>
            </button>
          )}

          {/* Mode Switcher Segmented Pill Toggle: Scroll vs Slide (Only in Reflow mode) */}
          {currentViewMode !== 'pdf-viewer' && (
            <div
              className="flex items-center p-0.5 rounded-full border shadow-2xs select-none mr-1"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
              }}
            >
              <button
                type="button"
                onClick={() => onReadingModeChange('scroll')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  readingMode === 'scroll'
                    ? 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] shadow-xs'
                    : 'opacity-65 hover:opacity-100'
                }`}
                title="Mode Scroll (Gulir Vertikal)"
                aria-label="Mode Scroll"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
                  <path d="M12 18h.01"/>
                </svg>
                <span className="hidden sm:inline">Scroll</span>
              </button>

              <button
                type="button"
                onClick={() => onReadingModeChange('paginated')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  readingMode === 'paginated'
                    ? 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] shadow-xs'
                    : 'opacity-65 hover:opacity-100'
                }`}
                title="Mode Slide (Halaman Terbagi)"
                aria-label="Mode Slide"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="15" x="3" y="4.5" rx="2" ry="2"/>
                  <path d="M9 4.5v15"/>
                </svg>
                <span className="hidden sm:inline">Slide</span>
              </button>
            </div>
          )}

          {/* Table of Contents button */}
          <button
            onClick={() => onToggleToc('toc')}
            className="p-2 rounded-xl opacity-75 hover:opacity-100 transition-all cursor-pointer flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9"
            style={{ backgroundColor: 'var(--reader-surface)' }}
            title="Daftar Isi Bab"
            aria-label="Table of contents"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" x2="21" y1="6" y2="6" />
              <line x1="8" x2="21" y1="12" y2="12" />
              <line x1="8" x2="21" y1="18" y2="18" />
              <line x1="3" x2="3.01" y1="6" y2="6" />
              <line x1="3" x2="3.01" y1="12" y2="12" />
              <line x1="3" x2="3.01" y1="18" y2="18" />
            </svg>
          </button>

          {/* Highlights / Notes toggle button */}
          <button
            onClick={() => onToggleToc('highlights')}
            className="p-2 rounded-xl opacity-75 hover:opacity-100 transition-all cursor-pointer flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9"
            style={{ backgroundColor: 'var(--reader-surface)' }}
            title="Sorotan & Catatan Saya"
            aria-label="Highlights and notes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>

          {/* Appearance / Settings (Aa) */}
          <button
            onClick={onToggleSettings}
            className="p-2 rounded-xl opacity-75 hover:opacity-100 transition-all cursor-pointer font-serif font-bold text-sm flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9"
            style={{ backgroundColor: 'var(--reader-surface)' }}
            title="Pengaturan Tampilan (Aa)"
            aria-label="Appearance settings"
          >
            Aa
          </button>

          {/* Translation Toggle: EN <-> ID */}
          {onToggleLanguage && (
            <button
              onClick={onToggleLanguage}
              disabled={isTranslating}
              className={`px-2 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                currentLang === 'id'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  : 'opacity-75 hover:opacity-100'
              }`}
              style={{
                backgroundColor: currentLang === 'id' ? undefined : 'var(--reader-surface)',
              }}
              title={
                currentLang === 'id'
                  ? 'Bahasa Indonesia aktif (Klik untuk beralih kembali ke Bahasa Inggris)'
                  : 'Terjemahkan bab ini ke Bahasa Indonesia'
              }
              aria-label="Toggle Indonesian translation"
            >
              {isTranslating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  {/* Indonesian flag mini badge */}
                  <span className="inline-flex flex-col w-4 h-2.5 rounded-xs overflow-hidden border border-black/20 shadow-2xs">
                    <span className="w-full h-1/2 bg-red-600" />
                    <span className="w-full h-1/2 bg-white" />
                  </span>
                  <span className="tracking-wide font-mono text-[10px]">{currentLang === 'id' ? 'ID' : 'EN'}</span>
                </div>
              )}
            </button>
          )}

          {/* Theme Quick Toggle (Light / Dark) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl opacity-75 hover:opacity-100 transition-all cursor-pointer flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9"
              style={{ backgroundColor: 'var(--reader-surface)' }}
              title={
                currentTheme === 'dark' || currentTheme === 'midnight'
                  ? 'Beralih ke Mode Terang (Light)'
                  : 'Beralih ke Mode Gelap (Dark)'
              }
              aria-label="Toggle theme"
            >
              {currentTheme === 'dark' || currentTheme === 'midnight' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" /><path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" /><path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-700 dark:text-neutral-300">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full opacity-30" style={{ backgroundColor: 'var(--reader-border)' }}>
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${progressPercentage}%`,
            backgroundColor: 'var(--reader-accent)',
          }}
        />
      </div>
    </header>
  );
}
