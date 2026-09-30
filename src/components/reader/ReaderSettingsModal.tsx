'use client';

import { useEffect, useRef } from 'react';
import type { ReaderSettings, ReadingFontFamily, ReadingMode, ReadingTheme, ReadingWidth } from '@/types';

interface ReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onFontSizeChange: (size: number) => void;
  onFontFamilyChange: (font: ReadingFontFamily) => void;
  onLineHeightChange: (lh: number) => void;
  onReadingWidthChange: (width: ReadingWidth) => void;
  onThemeChange: (theme: ReadingTheme) => void;
  onReadingModeChange: (mode: ReadingMode) => void;
  onWordsPerPageChange: (words: number) => void;
}

export default function ReaderSettingsModal({
  isOpen,
  onClose,
  settings,
  onFontSizeChange,
  onFontFamilyChange,
  onLineHeightChange,
  onReadingWidthChange,
  onThemeChange,
  onReadingModeChange,
  onWordsPerPageChange,
}: ReaderSettingsModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const themes: { id: ReadingTheme; label: string; bg: string; text: string; border: string }[] = [
    { id: 'light', label: 'Light', bg: '#ffffff', text: '#18181b', border: '#e4e4e7' },
    { id: 'sepia', label: 'Sepia', bg: '#fbf0d9', text: '#433422', border: '#ebdcc3' },
    { id: 'dark', label: 'Dark', bg: '#18181b', text: '#f4f4f5', border: '#3f3f46' },
    { id: 'midnight', label: 'Midnight', bg: '#09090b', text: '#e2e8f0', border: '#1e293b' },
  ];

  const fonts: { id: ReadingFontFamily; label: string; className: string }[] = [
    { id: 'serif', label: 'Serif (Georgia)', className: 'font-reader-serif' },
    { id: 'sans', label: 'Sans (Geist / Inter)', className: 'font-reader-sans' },
    { id: 'mono', label: 'Mono (Code)', className: 'font-reader-mono' },
  ];

  const widths: { id: ReadingWidth; label: string }[] = [
    { id: 'narrow', label: 'Narrow' },
    { id: 'normal', label: 'Normal' },
    { id: 'wide', label: 'Wide' },
  ];

  const lineHeights: { value: number; label: string }[] = [
    { value: 1.5, label: 'Tight' },
    { value: 1.75, label: 'Normal' },
    { value: 2.0, label: 'Relaxed' },
  ];

  const currentWordsPerPage = settings.wordsPerPage || 340;

  return (
    <div
      ref={popoverRef}
      className="absolute top-14 right-4 z-50 w-88 p-5 rounded-2xl shadow-2xl border transition-all animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
      style={{
        backgroundColor: 'var(--reader-bg)',
        color: 'var(--reader-text)',
        borderColor: 'var(--reader-border)',
      }}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: 'var(--reader-border)' }}>
        <h3 className="text-sm font-semibold tracking-wide">Pengaturan Tampilan</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          aria-label="Close settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="space-y-4.5 text-xs">
        {/* Reading Mode (Scroll vs Paginated) */}
        <div>
          <label className="block font-medium mb-1.5 opacity-80">Mode Membaca</label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl" style={{ backgroundColor: 'var(--reader-surface)' }}>
            <button
              onClick={() => onReadingModeChange('scroll')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                settings.readingMode !== 'paginated'
                  ? 'shadow-xs font-semibold'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: settings.readingMode !== 'paginated' ? 'var(--reader-bg)' : 'transparent',
                color: 'var(--reader-text)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" />
                <path d="m19 9-7-6-7 6" />
                <path d="m19 15-7 6-7-6" />
              </svg>
              <span>Scroll Vertikal</span>
            </button>

            <button
              onClick={() => onReadingModeChange('paginated')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                settings.readingMode === 'paginated'
                  ? 'shadow-xs font-semibold'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: settings.readingMode === 'paginated' ? 'var(--reader-bg)' : 'transparent',
                color: 'var(--reader-text)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
              <span>Halaman Buku</span>
            </button>
          </div>
        </div>

        {/* If Paginated: Words per page */}
        {settings.readingMode === 'paginated' && (
          <div
            className="p-3 rounded-xl border space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150"
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold block text-[11px]">Batas Kata Per Halaman</label>
                <span className="text-[10px] opacity-60">Jumlah kata per 1 halaman buku</span>
              </div>
              <span
                className="font-mono font-bold text-xs px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: 'var(--reader-bg)',
                  borderColor: 'var(--reader-border)',
                }}
              >
                {currentWordsPerPage} kata
              </span>
            </div>

            {/* Quick preset chips */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {[280, 340, 400, 460].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onWordsPerPageChange(preset)}
                  className={`py-1 px-1.5 text-center rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                    currentWordsPerPage === preset
                      ? 'bg-blue-500 text-white font-bold shadow-xs'
                      : 'border opacity-75 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: 'var(--reader-border)',
                    backgroundColor: currentWordsPerPage === preset ? undefined : 'var(--reader-bg)',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Fine-tune stepper */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onWordsPerPageChange(currentWordsPerPage - 25)}
                disabled={currentWordsPerPage <= 100}
                className="flex-1 py-1 rounded-md border text-[11px] font-bold disabled:opacity-30 cursor-pointer text-center hover:opacity-100 opacity-80"
                style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}
              >
                -25 kata
              </button>
              <button
                onClick={() => onWordsPerPageChange(currentWordsPerPage + 25)}
                disabled={currentWordsPerPage >= 800}
                className="flex-1 py-1 rounded-md border text-[11px] font-bold disabled:opacity-30 cursor-pointer text-center hover:opacity-100 opacity-80"
                style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}
              >
                +25 kata
              </button>
            </div>
          </div>
        )}

        {/* Theme Picker */}
        <div>
          <label className="block font-medium mb-1.5 opacity-80">Tema Warna</label>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((th) => {
              const active = settings.theme === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => onThemeChange(th.id)}
                  style={{
                    backgroundColor: th.bg,
                    color: th.text,
                    borderColor: active ? 'var(--reader-accent)' : th.border,
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                    active ? 'ring-2 ring-blue-500/40 font-semibold shadow-xs scale-102' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <span className="text-[11px]">{th.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="block font-medium mb-1.5 opacity-80">Gaya Tulisan</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ backgroundColor: 'var(--reader-surface)' }}>
            {fonts.map((f) => {
              const active = settings.fontFamily === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onFontFamilyChange(f.id)}
                  className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${f.className} ${
                    active
                      ? 'shadow-xs font-semibold'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: active ? 'var(--reader-bg)' : 'transparent',
                    color: 'var(--reader-text)',
                  }}
                >
                  {f.id.charAt(0).toUpperCase() + f.id.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-medium opacity-80">Ukuran Tulisan</label>
            <span className="font-mono text-[11px] opacity-70">{settings.fontSize}px</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFontSizeChange(settings.fontSize - 1)}
              disabled={settings.fontSize <= 13}
              className="flex-1 py-1.5 rounded-lg border flex items-center justify-center font-bold text-sm transition-colors disabled:opacity-30 cursor-pointer"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              }}
              aria-label="Decrease font size"
            >
              A-
            </button>
            <button
              onClick={() => onFontSizeChange(18)}
              className="px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors cursor-pointer opacity-70 hover:opacity-100"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              }}
            >
              Reset
            </button>
            <button
              onClick={() => onFontSizeChange(settings.fontSize + 1)}
              disabled={settings.fontSize >= 32}
              className="flex-1 py-1.5 rounded-lg border flex items-center justify-center font-bold text-sm transition-colors disabled:opacity-30 cursor-pointer"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              }}
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>
        </div>

        {/* Line Spacing */}
        <div>
          <label className="block font-medium mb-1.5 opacity-80">Jarak Antar Baris</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ backgroundColor: 'var(--reader-surface)' }}>
            {lineHeights.map((lh) => {
              const active = settings.lineHeight === lh.value;
              return (
                <button
                  key={lh.value}
                  onClick={() => onLineHeightChange(lh.value)}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    active ? 'shadow-xs font-semibold' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: active ? 'var(--reader-bg)' : 'transparent',
                    color: 'var(--reader-text)',
                  }}
                >
                  {lh.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reading Width */}
        <div>
          <label className="block font-medium mb-1.5 opacity-80">Lebar Teks</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ backgroundColor: 'var(--reader-surface)' }}>
            {widths.map((w) => {
              const active = settings.readingWidth === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => onReadingWidthChange(w.id)}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    active ? 'shadow-xs font-semibold' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: active ? 'var(--reader-bg)' : 'transparent',
                    color: 'var(--reader-text)',
                  }}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
