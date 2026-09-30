'use client';

import Link from 'next/link';
import type { BookWithProgress } from '@/types';

interface BookCardProps {
  book: BookWithProgress;
  onDelete?: (id: string) => void;
  variant?: 'shelf' | 'grid' | 'ranked';
  rank?: number;
  category?: string;
}

export default function BookCard({
  book,
  onDelete,
  variant = 'grid',
  rank,
  category = 'Non-Fiksi',
}: BookCardProps) {
  const rawProgress = book.progress?.progressPercentage ?? 0;
  const progress = rawProgress > 0 ? Math.max(1, Math.round(rawProgress)) : 0;
  const isReady = book.status === 'ready';
  const isFailed = book.status === 'failed';

  // Generate publisher/author initials & consistent color
  const authorName = book.author || 'Penulis Tidak Dikenal';
  const initial = authorName.charAt(0).toUpperCase();
  const avatarColors = [
    'bg-purple-600 text-white',
    'bg-blue-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-indigo-600 text-white',
  ];
  const colorIndex = Math.abs(authorName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % avatarColors.length;
  const avatarClass = avatarColors[colorIndex];

  // -------------------------------------------------------------
  // RANKED VARIANT (Pilihan Editor 1, 2, 3...)
  // -------------------------------------------------------------
  if (variant === 'ranked') {
    return (
      <div className="flex items-start gap-3 sm:gap-4 p-3 rounded-2xl bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a] hover:border-[#d6cebf] dark:hover:border-[#3f3f46] hover:shadow-md transition-all group">
        {/* Ranked number */}
        {rank && (
          <span className="font-editorial text-2xl sm:text-3xl font-bold text-[#1c1917] dark:text-white shrink-0 w-6 text-center mt-1">
            {rank}
          </span>
        )}

        {/* Thumbnail cover */}
        <Link href={`/reader/${book.id}`} className="shrink-0 relative">
          <div className="w-16 sm:w-20 aspect-[3/4] book-cover-3d bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900 rounded-md overflow-hidden">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="p-1.5 flex flex-col justify-between h-full bg-[#f4ebe1] dark:bg-[#252528] text-[#44403c] dark:text-[#d4d4d8]">
                <span className="text-[9px] font-bold line-clamp-3 leading-tight">{book.title}</span>
                <span className="text-[8px] text-[#78716c] truncate">{authorName}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
          <div>
            {/* Title */}
            <Link href={`/reader/${book.id}`}>
              <h4 className="text-xs sm:text-sm font-bold text-[#1c1917] dark:text-white line-clamp-2 leading-snug group-hover:text-[#e11d48] transition-colors" title={book.title}>
                {book.title}
              </h4>
            </Link>

            {/* Author with Avatar */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={`w-4 h-4 rounded-full ${avatarClass} flex items-center justify-center text-[9px] font-bold shrink-0`}>
                {initial}
              </div>
              <span className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] truncate font-medium">
                {authorName}
              </span>
            </div>
          </div>

          {/* Subtext info (Chapters & Reading status) */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#78716c] dark:text-[#a1a1aa] mt-2">
            <span>
              {book.viewMode === 'pdf-viewer'
                ? `${book.totalPages || 0} Hlm (PDF)`
                : book.totalChapters
                  ? `${book.totalChapters} Bab`
                  : 'Format Reflow'}
            </span>
            <span>&bull;</span>
            <span className={progress > 0 ? 'text-[#e11d48] font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
              {progress > 0 ? `${progress}% dibaca` : 'Tersedia'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SHELF VARIANT (Horizontal Carousel: Lanjutkan Membaca, Terbaru)
  // -------------------------------------------------------------
  if (variant === 'shelf') {
    return (
      <div className="w-48 sm:w-56 shrink-0 group flex flex-col">
        {/* Header tags (Category) */}
        <div className="flex items-center justify-between gap-1 mb-2 px-1">
          <span className="text-[11px] font-semibold text-[#78716c] dark:text-[#a1a1aa] truncate">
            {category}
          </span>
          {progress > 0 && (
            <span className="text-[10px] font-semibold text-[#e11d48]">
              {progress}%
            </span>
          )}
        </div>

        {/* 3D Floating Book Cover */}
        <Link href={`/reader/${book.id}`} className="block relative">
          <div className="aspect-[3/4] w-full book-cover-3d bg-white dark:bg-[#202024] rounded-md overflow-hidden relative border border-[#ede8e1]/60 dark:border-neutral-800">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="h-full p-4 flex flex-col justify-between bg-gradient-to-br from-[#faf7f2] to-[#ede5d8] dark:from-[#242427] dark:to-[#1a1a1c] text-[#292524] dark:text-[#e4e4e7]">
                <div className="w-5 h-5 rounded bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] flex items-center justify-center text-[10px] font-bold">
                  {book.title.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-editorial text-sm font-bold line-clamp-4 leading-tight mb-2">
                    {book.title}
                  </h3>
                  <p className="text-[10px] text-[#78716c] dark:text-[#a1a1aa] truncate font-medium">
                    {authorName}
                  </p>
                </div>
              </div>
            )}

            {/* If there's delete action */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(book.id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                title="Hapus Buku"
                aria-label="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                </svg>
              </button>
            )}
          </div>
        </Link>

        {/* Slim Progress Bar with Red Indicator (Malaka style) */}
        <div className="mt-3.5 mb-2 px-0.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-[#e7e3da] dark:bg-[#2e2e33] rounded-full overflow-hidden relative">
              <div
                className="h-full bg-[#e11d48] rounded-full transition-all duration-300 relative"
                style={{ width: `${Math.max(progress, 2)}%` }}
              >
                {/* Red dot at end of progress bar */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#e11d48]" />
              </div>
            </div>
            <span className="text-[10px] font-semibold text-[#78716c] dark:text-[#a1a1aa] shrink-0">
              {progress}%
            </span>
          </div>
        </div>

        {/* Title */}
        <Link href={`/reader/${book.id}`}>
          <h4 className="font-editorial font-bold text-xs sm:text-sm text-[#1c1917] dark:text-white line-clamp-2 leading-snug group-hover:text-[#e11d48] transition-colors" title={book.title}>
            {book.title}
          </h4>
        </Link>

        {/* Publisher / Author with Circle Icon */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] flex items-center justify-center text-[7px] font-bold shrink-0">
            M
          </div>
          <span className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] truncate font-medium">
            {authorName}
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DEFAULT GRID VARIANT (My Library Grid)
  // -------------------------------------------------------------
  return (
    <div className="group relative flex flex-col bg-white dark:bg-[#18181b] rounded-2xl border border-[#ede8e1] dark:border-[#27272a] p-3 hover:border-[#d6cebf] dark:hover:border-[#3f3f46] hover:shadow-lg transition-all duration-200">
      {/* Cover */}
      <Link href={`/reader/${book.id}`} className="block relative">
        <div className="aspect-[3/4] w-full book-cover-3d bg-gradient-to-br from-[#faf7f2] to-[#ede5d8] dark:from-[#242427] dark:to-[#1a1a1c] rounded-lg overflow-hidden relative">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="h-full p-4 flex flex-col justify-between text-[#292524] dark:text-[#e4e4e7]">
              <div className="w-6 h-6 rounded bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] flex items-center justify-center text-xs font-bold">
                M
              </div>
              <div>
                <h4 className="font-editorial text-sm font-bold line-clamp-4 leading-snug mb-2">
                  {book.title}
                </h4>
                <p className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] truncate font-medium">
                  {authorName}
                </p>
              </div>
            </div>
          )}

          {/* Status badge if uploading / failed, or PDF indicator */}
          {!isReady ? (
            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
              isFailed
                ? 'bg-red-500 text-white'
                : 'bg-amber-500 text-white animate-pulse'
            }`}>
              {isFailed ? 'Gagal' : 'Memproses…'}
            </div>
          ) : book.viewMode === 'pdf-viewer' ? (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-rose-600/90 text-white backdrop-blur-xs shadow-xs">
              PDF
            </div>
          ) : null}

          {/* Delete button (hover) */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(book.id);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer z-10"
              title="Hapus buku"
              aria-label={`Hapus ${book.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </Link>

      {/* Info & Progress */}
      <div className="pt-3 flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/reader/${book.id}`}>
            <h3 className="font-editorial font-bold text-xs sm:text-sm text-[#1c1917] dark:text-white line-clamp-2 leading-snug group-hover:text-[#e11d48] transition-colors" title={book.title}>
              {book.title}
            </h3>
          </Link>

          <div className="flex items-center gap-1.5 mt-1.5">
            <div className={`w-3.5 h-3.5 rounded-full ${avatarClass} flex items-center justify-center text-[8px] font-bold shrink-0`}>
              {initial}
            </div>
            <p className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] truncate font-medium">
              {authorName}
            </p>
          </div>
        </div>

        {/* Progress bar and button */}
        <div className="mt-3 pt-2 border-t border-[#f5f2eb] dark:border-[#27272a]">
          {isReady && progress > 0 ? (
            <div className="mb-2">
              <div className="flex justify-between text-[10px] font-semibold text-[#78716c] dark:text-[#a1a1aa] mb-1">
                <span>Progres Membaca</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 bg-[#ede8e1] dark:bg-[#2e2e33] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#e11d48] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-[#a8a29e] dark:text-[#71717a] mb-2 flex items-center gap-1">
              {book.viewMode === 'pdf-viewer' ? (
                <>
                  <span>📄</span>
                  <span className="font-medium text-rose-600 dark:text-rose-400">PDF Viewer ({book.totalPages || 0} hal)</span>
                </>
              ) : (
                <>
                  <span>📖</span>
                  <span>Tersedia Reflow &amp; Bab</span>
                </>
              )}
            </div>
          )}

          {isReady && (
            <Link
              href={`/reader/${book.id}`}
              className="block w-full py-1.5 text-center text-xs font-semibold rounded-lg bg-[#faf8f5] dark:bg-[#202024] hover:bg-[#1c1917] hover:text-white dark:hover:bg-white dark:hover:text-[#1c1917] border border-[#ede8e1] dark:border-[#27272a] text-[#1c1917] dark:text-[#f4f4f5] transition-all"
            >
              {progress > 0 ? 'Lanjutkan Membaca' : 'Mulai Membaca'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

