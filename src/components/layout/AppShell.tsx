'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UploadModal from '@/components/library/UploadModal';

interface AppShellProps {
  children: ReactNode;
  pageTitle?: string;
  onBookUploaded?: () => void;
  showUploadButton?: boolean;
}

export default function AppShell({
  children,
  pageTitle = 'Home',
  onBookUploaded,
  showUploadButton = true,
}: AppShellProps) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Initialize and synchronize theme with DOM/localStorage/system preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    checkTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
          setIsDarkMode(true);
        } else {
          document.documentElement.classList.remove('dark');
          setIsDarkMode(false);
        }
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const dark = e.newValue === 'dark';
        if (dark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        setIsDarkMode(dark);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleDarkMode = () => {
    if (typeof window === 'undefined') return;
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#121214] text-[#1c1917] dark:text-[#f4f4f5] flex flex-col md:flex-row transition-colors duration-200">
      {/* =======================================================================
          DESKTOP SIDEBAR
         ======================================================================= */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#ede8e1] dark:border-[#27272a] bg-white dark:bg-[#18181b] min-h-screen sticky top-0 h-screen overflow-y-auto no-scrollbar z-30">
        {/* Brand Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-transparent">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Elegant Open Book Icon */}
            <div className="w-9 h-9 rounded-xl bg-[#1c1917] dark:bg-white flex items-center justify-center text-white dark:text-[#1c1917] shadow-sm group-hover:scale-105 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </div>
            <div>
              <div className="font-serif font-black text-xs tracking-widest text-[#1c1917] dark:text-white uppercase leading-none">
                Ebook
              </div>
              <div className="font-serif font-bold text-[10px] tracking-wider text-[#78716c] dark:text-[#a1a1aa] uppercase leading-tight mt-0.5">
                Reader
              </div>
            </div>
          </Link>
        </div>

        {/* Menu Navigation */}
        <div className="px-4 py-2 flex-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-[#a8a29e] dark:text-[#71717a] uppercase mb-2">
            Menu
          </p>
          <nav className="space-y-1">
            <Link
              href="/"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive('/') && pathname === '/'
                  ? 'bg-[#f5f2eb] dark:bg-[#27272a] text-[#1c1917] dark:text-white font-semibold shadow-xs'
                  : 'text-[#57534e] dark:text-[#a1a1aa] hover:bg-[#f5f5f4] dark:hover:bg-[#27272a]/60 hover:text-[#1c1917] dark:hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive('/') && pathname === '/' ? 'text-[#e11d48]' : ''}>
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </Link>

            <Link
              href="/discover"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive('/discover')
                  ? 'bg-[#f5f2eb] dark:bg-[#27272a] text-[#1c1917] dark:text-white font-semibold shadow-xs'
                  : 'text-[#57534e] dark:text-[#a1a1aa] hover:bg-[#f5f5f4] dark:hover:bg-[#27272a]/60 hover:text-[#1c1917] dark:hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive('/discover') ? 'text-[#e11d48]' : ''}>
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              <span>Explore</span>
            </Link>

            <Link
              href="/#koleksi-saya"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#57534e] dark:text-[#a1a1aa] hover:bg-[#f5f5f4] dark:hover:bg-[#27272a]/60 hover:text-[#1c1917] dark:hover:text-white transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M9 10h6" />
                <path d="M9 14h4" />
              </svg>
              <span>Library Saya</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#ede8e1] dark:border-[#27272a] space-y-3">
          {/* Reader feature badges */}
          <div className="p-2.5 rounded-xl border border-[#ede8e1] dark:border-[#27272a] bg-[#faf8f5] dark:bg-[#202024] text-[11px] text-[#78716c] dark:text-[#a1a1aa] space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-[#1c1917] dark:text-white">
              <span>📖</span>
              <span>Reflow Reader</span>
            </div>
            <p className="text-[10px] text-[#a8a29e] leading-snug">
              Ekstraksi teks otomatis &amp; navigasi bab tanpa batasan ukuran halaman.
            </p>
          </div>

          {/* User Profile Card */}
          <button
            onClick={() => setShowProfile(true)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#f5f5f4] dark:hover:bg-[#27272a] transition-colors text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-stone-700 to-stone-900 dark:from-stone-200 dark:to-white text-white dark:text-stone-900 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              R
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#1c1917] dark:text-white truncate">
                Ruang Baca Saya
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span>●</span>
                <span>Pustaka Pribadi</span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* =======================================================================
          MAIN CONTENT AREA
         ======================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md border-b border-[#ede8e1] dark:border-[#27272a] px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Brand */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] flex items-center justify-center shadow-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                </svg>
              </div>
            </div>

            <h1 className="text-base sm:text-lg font-editorial font-bold text-[#1c1917] dark:text-white tracking-tight">
              {pageTitle}
            </h1>
          </div>

          {/* Action icons right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Single Unified Upload Button */}
            {showUploadButton && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1c1917] text-white dark:bg-white dark:text-[#1c1917] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Upload Buku</span>
              </button>
            )}

            {/* Reading Keyboard Shortcuts Info */}
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-full text-[#57534e] dark:text-[#a1a1aa] hover:bg-[#f5f5f4] dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              title="Pintasan Keyboard & Bantuan"
              aria-label="Shortcuts"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full text-[#57534e] dark:text-[#a1a1aa] hover:bg-[#f5f5f4] dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              title="Notifikasi & Tips"
              aria-label="Notifikasi"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="absolute top-1 right-1 bg-[#e11d48] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white dark:ring-[#18181b]">
                3
              </span>
            </button>

            {/* Theme Switcher (Sun / Moon) */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-[#57534e] dark:text-[#a1a1aa] hover:bg-[#f5f5f4] dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              title={isDarkMode ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" /><path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" /><path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 pb-20 md:pb-10">
          {children}
        </main>
      </div>

      {/* =======================================================================
          MOBILE BOTTOM NAV
         ======================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-lg border-t border-[#ede8e1] dark:border-[#27272a] px-3 py-2 flex items-center justify-around">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            pathname === '/'
              ? 'text-[#e11d48] font-semibold'
              : 'text-[#78716c] dark:text-[#a1a1aa] hover:text-[#1c1917]'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={pathname === '/' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </Link>

        <Link
          href="/discover"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            isActive('/discover')
              ? 'text-[#e11d48] font-semibold'
              : 'text-[#78716c] dark:text-[#a1a1aa] hover:text-[#1c1917]'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span>Explore</span>
        </Link>

        <Link
          href="/#koleksi-saya"
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium text-[#78716c] dark:text-[#a1a1aa] hover:text-[#1c1917] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M9 10h6" />
          </svg>
          <span>Library</span>
        </Link>

        <button
          onClick={() => setShowProfile(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium text-[#78716c] dark:text-[#a1a1aa] hover:text-[#1c1917] transition-colors cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 font-bold text-[10px] flex items-center justify-center">
            R
          </div>
          <span>Profile</span>
        </button>
      </nav>

      {/* =======================================================================
          MODALS & OVERLAYS
         ======================================================================= */}
      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={() => {
          setIsUploadOpen(false);
          onBookUploaded?.();
        }}
      />

      {/* Reader Notifications Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/30 backdrop-blur-xs" onClick={() => setShowNotifications(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-[#ede8e1] dark:border-[#27272a] p-5 mt-14"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e1] dark:border-[#27272a]">
              <h3 className="font-editorial font-bold text-base">Notifikasi &amp; Tips</h3>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                Fitur Aktif
              </span>
            </div>
            <div className="divide-y divide-[#f5f2eb] dark:divide-[#27272a] max-h-80 overflow-y-auto mt-2">
              <div className="py-3">
                <p className="text-xs font-semibold text-[#1c1917] dark:text-white">
                  ✨ Mode Reflow Otomatis
                </p>
                <p className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] mt-1">
                  PDF &amp; EPUB diekstrak langsung ke paragraf nyaman baca tanpa perlu pinch-to-zoom.
                </p>
              </div>
              <div className="py-3">
                <p className="text-xs font-semibold text-[#1c1917] dark:text-white">
                  🔖 Progress &amp; Posisi Terakhir
                </p>
                <p className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] mt-1">
                  Aplikasi secara otomatis mencatat bab dan posisi terakhir Anda membaca.
                </p>
              </div>
              <div className="py-3">
                <p className="text-xs font-semibold text-[#1c1917] dark:text-white">
                  🔍 Jelajahi Koleksi Klasik
                </p>
                <p className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] mt-1">
                  Buka tab Explore untuk mengimpor buku klasik bebas hak cipta langsung ke perpustakaan.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNotifications(false)}
              className="w-full mt-3 py-2 text-xs font-medium rounded-xl bg-[#f5f2eb] dark:bg-[#27272a] hover:bg-[#ede8e1] transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Shortcuts & Help Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={() => setShowShortcuts(false)}>
          <div
            className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-[#ede8e1] dark:border-[#27272a] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e1] dark:border-[#27272a]">
              <h3 className="font-editorial font-bold text-base">Pintasan Navigasi Pembaca</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-neutral-400 hover:text-black dark:hover:text-white">✕</button>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#f5f2eb] dark:border-[#27272a]">
                <span className="text-neutral-600 dark:text-neutral-400">Pindah bab / halaman sebelumnya</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f5f2eb] dark:bg-[#27272a] font-mono text-[10px]">←</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#f5f2eb] dark:border-[#27272a]">
                <span className="text-neutral-600 dark:text-neutral-400">Pindah bab / halaman berikutnya</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f5f2eb] dark:bg-[#27272a] font-mono text-[10px]">→</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#f5f2eb] dark:border-[#27272a]">
                <span className="text-neutral-600 dark:text-neutral-400">Buka Daftar Isi</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f5f2eb] dark:bg-[#27272a] font-mono text-[10px]">T</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#f5f2eb] dark:border-[#27272a]">
                <span className="text-neutral-600 dark:text-neutral-400">Pencarian isi buku</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f5f2eb] dark:bg-[#27272a] font-mono text-[10px]">S</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-600 dark:text-neutral-400">Mode Layar Penuh</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f5f2eb] dark:bg-[#27272a] font-mono text-[10px]">F</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="w-full mt-5 py-2 text-xs font-semibold rounded-xl bg-[#1c1917] text-white dark:bg-white dark:text-[#1c1917]"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={() => setShowProfile(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-[#ede8e1] dark:border-[#27272a] p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-stone-700 to-stone-900 dark:from-stone-200 dark:to-white text-white dark:text-stone-900 font-bold text-2xl flex items-center justify-center mx-auto shadow-md">
              R
            </div>
            <h3 className="font-editorial font-bold text-lg mt-3 text-[#1c1917] dark:text-white">
              Ruang Baca Pribadi
            </h3>
            <p className="text-xs text-[#78716c] dark:text-[#a1a1aa]">Perpustakaan Ebook Mandiri</p>

            <div className="mt-5 space-y-2 text-left text-xs text-[#57534e] dark:text-[#a1a1aa]">
              <div className="p-3 rounded-xl bg-[#faf8f5] dark:bg-[#202024] flex justify-between">
                <span>Dukungan Format</span>
                <span className="font-bold text-[#1c1917] dark:text-white">EPUB &amp; PDF</span>
              </div>
              <div className="p-3 rounded-xl bg-[#faf8f5] dark:bg-[#202024] flex justify-between">
                <span>Penyimpanan Reflow</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Lokal &amp; Cloud Aktif</span>
              </div>
            </div>

            <button
              onClick={() => setShowProfile(false)}
              className="w-full mt-6 py-2.5 rounded-xl bg-[#1c1917] text-white dark:bg-white dark:text-[#1c1917] text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

