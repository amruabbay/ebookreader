'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BookWithProgress } from '@/types';
import BookCard from '@/components/library/BookCard';
import BookGrid from '@/components/library/BookGrid';
import EmptyLibrary from '@/components/library/EmptyLibrary';
import UploadModal from '@/components/library/UploadModal';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';
import { getOrCreateClientReaderId } from '@/lib/reader/clientReader';

// Timeless and renowned authors from literature, philosophy, and history
const TIMELESS_AUTHORS = [
  { name: 'William Shakespeare', count: '8 karya' },
  { name: 'Lewis Carroll', count: '4 karya' },
  { name: 'Arthur Conan Doyle', count: '12 karya' },
  { name: 'Jane Austen', count: '6 karya' },
  { name: 'Marcus Aurelius', count: '4 karya' },
  { name: 'Sun Tzu', count: '2 karya' },
  { name: 'Mary Shelley', count: '3 karya' },
  { name: 'Franz Kafka', count: '5 karya' },
  { name: 'Plato', count: '8 karya' },
  { name: 'Fyodor Dostoevsky', count: '7 karya' },
  { name: 'Leo Tolstoy', count: '6 karya' },
  { name: 'Friedrich Nietzsche', count: '5 karya' },
  { name: 'Oscar Wilde', count: '4 karya' },
  { name: 'Charles Dickens', count: '9 karya' },
];

function getAuthorInitials(name: string): string {
  if (!name) return '??';
  const clean = name.replace(/^(Sir|Lord|Dr\.|Prof\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AUTHOR_PALETTES = [
  { bg: 'bg-amber-100 dark:bg-amber-950/70', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-300 dark:border-amber-700/60' },
  { bg: 'bg-emerald-100 dark:bg-emerald-950/70', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-300 dark:border-emerald-700/60' },
  { bg: 'bg-sky-100 dark:bg-sky-950/70', text: 'text-sky-800 dark:text-sky-200', border: 'border-sky-300 dark:border-sky-700/60' },
  { bg: 'bg-rose-100 dark:bg-rose-950/70', text: 'text-rose-800 dark:text-rose-200', border: 'border-rose-300 dark:border-rose-700/60' },
  { bg: 'bg-indigo-100 dark:bg-indigo-950/70', text: 'text-indigo-800 dark:text-indigo-200', border: 'border-indigo-300 dark:border-indigo-700/60' },
  { bg: 'bg-purple-100 dark:bg-purple-950/70', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-300 dark:border-purple-700/60' },
  { bg: 'bg-teal-100 dark:bg-teal-950/70', text: 'text-teal-800 dark:text-teal-200', border: 'border-teal-300 dark:border-teal-700/60' },
  { bg: 'bg-stone-200 dark:bg-stone-800', text: 'text-stone-800 dark:text-stone-200', border: 'border-stone-300 dark:border-stone-600' },
];

function getAuthorPalette(name: string, index: number) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const paletteIndex = Math.abs(hash + index) % AUTHOR_PALETTES.length;
  return AUTHOR_PALETTES[paletteIndex];
}

// General Knowledge & Reading Collections
const COLLECTIONS = [
  {
    title: 'Filsafat & Logika',
    color: 'from-orange-500 to-rose-600',
    booksCount: 18,
    theme: 'Etika, Logika & Eksistensi',
    topic: 'philosophy',
    bgBadge: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  },
  {
    title: 'Sains & Alam Semesta',
    color: 'from-teal-600 to-cyan-700',
    booksCount: 24,
    theme: 'Kosmos, Fisika & Evolusi',
    topic: 'astronomy',
    bgBadge: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  },
  {
    title: 'Sastra & Fiksi Klasik',
    color: 'from-indigo-600 to-blue-700',
    booksCount: 35,
    theme: 'Novel, Puisi & Drama',
    topic: 'fiction',
    bgBadge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
  },
  {
    title: 'Sejarah & Peradaban',
    color: 'from-amber-400 to-orange-500',
    booksCount: 16,
    theme: 'Arkeologi & Garis Waktu',
    topic: 'history',
    bgBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  },
  {
    title: 'Psikologi & Kognisi',
    color: 'from-yellow-500 to-amber-600',
    booksCount: 12,
    theme: 'Pola Pikir & Perilaku',
    topic: 'psychology',
    bgBadge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  },
  {
    title: 'Biologi & Evolusi',
    color: 'from-emerald-500 to-green-600',
    booksCount: 17,
    theme: 'Spesies, Alam & Genom',
    topic: 'biology',
    bgBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  },
];

export default function LibraryPage() {
  const [books, setBooks] = useState<BookWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      setBooks(data);
      setError(null);
    } catch {
      setError('Gagal memuat buku perpustakaan.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getOrCreateClientReaderId();
    fetchBooks();

    const handleProfileChange = () => {
      fetchBooks();
    };
    window.addEventListener('reader-profile-changed', handleProfileChange);
    return () => window.removeEventListener('reader-profile-changed', handleProfileChange);
  }, [fetchBooks]);

  const handleDelete = useCallback(async (id: string) => {
    const book = books.find((b) => b.id === id);
    if (!book) return;

    const confirmed = window.confirm(`Hapus "${book.title}"? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert('Gagal menghapus buku. Silakan coba lagi.');
    }
  }, [books]);

  // Books with reading progress (Continue Reading shelf)
  const continueReadingBooks = useMemo(() => {
    const userReading = books.filter((b) => (b.progress?.progressPercentage ?? 0) > 0);
    if (userReading.length > 0) return userReading;
    // Fallback to latest uploaded books
    return books.slice(0, 4);
  }, [books]);

  // Recommended picks from user library
  const editorPicks = useMemo(() => {
    return books.slice(0, 6);
  }, [books]);

  // Dynamic authors list (combining user library authors + timeless literature masters)
  const displayAuthors = useMemo(() => {
    const userAuthorsMap = new Map<string, number>();
    for (const b of books) {
      const a = b.author?.trim();
      if (a) {
        userAuthorsMap.set(a, (userAuthorsMap.get(a) || 0) + 1);
      }
    }

    const list: { name: string; count: string; isUserAuthor: boolean }[] = [];

    // Add user authors first
    userAuthorsMap.forEach((bookCount, name) => {
      list.push({
        name,
        count: `${bookCount} buku`,
        isUserAuthor: true,
      });
    });

    // Add timeless masters (without duplicates)
    for (const timeless of TIMELESS_AUTHORS) {
      if (!list.some((a) => a.name.toLowerCase() === timeless.name.toLowerCase())) {
        list.push({
          name: timeless.name,
          count: timeless.count,
          isUserAuthor: false,
        });
      }
    }

    return list;
  }, [books]);

  // Filtered personal books
  const filteredPersonalBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesSearch =
        searchFilter === '' ||
        book.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesAuthor =
        !selectedAuthor ||
        book.author?.toLowerCase().includes(selectedAuthor.toLowerCase());
      return matchesSearch && matchesAuthor;
    });
  }, [books, searchFilter, selectedAuthor]);

  if (isLoading) {
    return (
      <AppShell pageTitle="Home" onBookUploaded={fetchBooks}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[#78716c] dark:text-[#a1a1aa]">Memuat perpustakaan…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Home" onBookUploaded={fetchBooks}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* =====================================================================
            SECTION 1: LANJUTKAN MEMBACA (CONTINUE READING)
           ===================================================================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-white flex items-center gap-2">
              <span>Lanjutkan Membaca</span>
            </h2>
            <Link
              href="#koleksi-saya"
              className="text-[#78716c] hover:text-[#1c1917] dark:text-[#a1a1aa] dark:hover:text-white text-xs font-semibold flex items-center gap-1 group"
            >
              <span>Lihat Semua</span>
              <span className="text-base group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          </div>

          {/* Horizontal scroll shelf */}
          <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 pt-1">
            {continueReadingBooks.map((book: BookWithProgress, idx: number) => (
              <BookCard
                key={book.id}
                book={book}
                variant="shelf"
                category={idx % 2 === 0 ? 'Filsafat' : 'Sastra Klasik'}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 2: REKOMENDASI PILIHAN (CURATED PICKS)
           ===================================================================== */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-white">
              Rekomendasi Pilihan
            </h2>
            <Link
              href="/discover"
              className="text-[#78716c] hover:text-[#1c1917] dark:text-[#a1a1aa] dark:hover:text-white text-xs font-semibold flex items-center gap-1 group"
            >
              <span>Jelajahi Lebih Banyak</span>
              <span className="text-base group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          </div>
          <p className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Karya klasik &amp; buku terfavorit untuk dibaca</span>
          </p>

          {/* Ranked 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {editorPicks.map((book: BookWithProgress, idx: number) => (
              <BookCard
                key={book.id}
                book={book}
                variant="ranked"
                rank={idx + 1}
              />
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 3: KOLEKSI TERBARU (NEW RELEASES)
           ===================================================================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-white">
              Koleksi Terbaru
            </h2>
            <Link
              href="#koleksi-saya"
              className="text-[#78716c] hover:text-[#1c1917] dark:text-[#a1a1aa] dark:hover:text-white text-xs font-semibold flex items-center gap-1 group"
            >
              <span>Semua Koleksi</span>
              <span className="text-base group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          </div>

          {/* Horizontal shelf */}
          <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 pt-1">
            {books.slice(0, 6).map((book: BookWithProgress, idx: number) => (
              <BookCard
                key={`new-${book.id}`}
                book={book}
                variant="shelf"
                category={idx % 3 === 0 ? 'Filsafat' : idx % 3 === 1 ? 'Sains' : 'Sastra'}
              />
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 4: PENULIS PILIHAN (AUTHORS SHELF)
           ===================================================================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-white">
                Penulis Pilihan
              </h2>
              <p className="text-xs text-[#78716c] dark:text-[#a1a1aa] mt-0.5">
                Karya sastra dan pemikiran dari para penulis terkemuka
              </p>
            </div>
            <span className="text-xs text-[#78716c] dark:text-[#a1a1aa] font-medium bg-[#f5f5f4] dark:bg-[#27272a] px-2.5 py-1 rounded-full border border-[#e7e5e4] dark:border-[#3f3f46]">
              {displayAuthors.length} Penulis
            </span>
          </div>

          {/* Horizontal author shelf with elegant monograms */}
          <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 pt-1">
            {displayAuthors.map((author, index) => {
              const isSelected = selectedAuthor === author.name;
              const palette = getAuthorPalette(author.name, index);
              const initials = getAuthorInitials(author.name);

              return (
                <button
                  key={author.name}
                  onClick={() => {
                    if (author.isUserAuthor) {
                      const newSelected = isSelected ? null : author.name;
                      setSelectedAuthor(newSelected);
                      if (newSelected) {
                        const el = document.getElementById('koleksi-saya');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      window.location.href = `/discover?q=${encodeURIComponent(author.name)}`;
                    }
                  }}
                  className="flex flex-col items-center shrink-0 group text-center cursor-pointer focus:outline-none w-20 sm:w-24 transition-transform hover:-translate-y-1"
                  title={author.isUserAuthor ? `Filter buku karya ${author.name}` : `Jelajahi karya ${author.name} di Discover`}
                >
                  {/* Monogram Circle Avatar */}
                  <div
                    className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center border-2 transition-all shadow-xs relative select-none ${palette.bg} ${palette.border} ${
                      isSelected
                        ? 'ring-3 ring-[#e11d48] scale-105 shadow-md'
                        : 'group-hover:shadow-md'
                    }`}
                  >
                    <span className={`font-editorial font-bold text-base sm:text-lg tracking-wider ${palette.text}`}>
                      {initials}
                    </span>

                    {/* Quill subtle badge */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#18181b] border border-[#e7e5e4] dark:border-[#3f3f46] flex items-center justify-center shadow-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 dark:text-neutral-400">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                        <path d="M2 2l7.586 7.586"/>
                        <circle cx="11" cy="11" r="2"/>
                      </svg>
                    </div>
                  </div>

                  {/* Author Name: 2 lines allowed, no awkward truncation */}
                  <h4 className="font-editorial font-bold text-xs text-[#1c1917] dark:text-white mt-2 leading-tight line-clamp-2 px-0.5 group-hover:text-[#e11d48] transition-colors">
                    {author.name}
                  </h4>

                  {/* Book / Works Count */}
                  <p className="text-[10px] text-[#78716c] dark:text-[#a1a1aa] mt-1 font-medium">
                    {author.count}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            SECTION 5: KOLEKSI (CURATED BINDER CARDS)
           ===================================================================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-white">
              Koleksi
            </h2>
            <Link
              href="/discover"
              className="text-[#78716c] hover:text-[#1c1917] dark:text-[#a1a1aa] dark:hover:text-white text-xs font-semibold flex items-center gap-1 group"
            >
              <span>Semua Koleksi</span>
              <span className="text-base group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          </div>

          {/* Cards carousel */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {COLLECTIONS.map((col) => (
              <Link
                key={col.title}
                href={`/discover?topic=${encodeURIComponent(col.topic)}`}
                className="collection-card bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a] p-4 flex flex-col justify-between h-44 group cursor-pointer"
              >
                {/* Header colored notch */}
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${col.bgBadge}`}>
                    {col.booksCount} Buku
                  </span>
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${col.color}`} />
                </div>

                {/* Card Title */}
                <div>
                  <h4 className="font-editorial font-bold text-xs sm:text-sm text-[#1c1917] dark:text-white line-clamp-3 leading-snug group-hover:text-[#e11d48] transition-colors">
                    {col.title}
                  </h4>
                  <p className="text-[10px] text-[#78716c] dark:text-[#a1a1aa] mt-1.5 font-medium">
                    {col.theme}
                  </p>
                </div>

                {/* Bottom stack visual cue */}
                <div className="pt-2 border-t border-[#f5f2eb] dark:border-[#27272a] flex items-center justify-between text-[10px] text-[#78716c] dark:text-[#a1a1aa]">
                  <span>Buka Rak</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 6: PERPUSTAKAAN PRIBADI SAYA (MY FULL LIBRARY)
           ===================================================================== */}
        <section id="koleksi-saya" className="pt-6 border-t border-[#ede8e1] dark:border-[#27272a]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-white">
                Perpustakaan Pribadi Saya
              </h2>
              <p className="text-xs text-[#78716c] dark:text-[#a1a1aa] mt-1">
                {books.length} {books.length === 1 ? 'buku terpasang' : 'buku terpasang'} &bull; Format Reflowable EPUB &amp; PDF
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search filter in personal library */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari buku saya…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a] text-[#1c1917] dark:text-white placeholder:text-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#1c1917] dark:focus:ring-white w-40 sm:w-56"
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 hover:text-neutral-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {selectedAuthor && (
            <div className="mb-4 flex items-center gap-2 text-xs bg-[#f5f2eb] dark:bg-[#27272a] px-3 py-1.5 rounded-lg w-fit">
              <span>Menampilkan buku karya: <strong>{selectedAuthor}</strong></span>
              <button onClick={() => setSelectedAuthor(null)} className="text-neutral-500 hover:text-black dark:hover:text-white font-bold ml-1">✕</button>
            </div>
          )}

          {/* Book grid or Empty state */}
          {books.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a]">
              <EmptyLibrary onUpload={() => setIsUploadOpen(true)} />
            </div>
          ) : filteredPersonalBooks.length === 0 ? (
            <div className="text-center py-12 p-8 rounded-2xl bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a]">
              <p className="font-editorial text-sm font-bold text-neutral-700 dark:text-neutral-300">
                Tidak ada buku yang cocok dengan pencarian &ldquo;{searchFilter}&rdquo;
              </p>
              <button
                onClick={() => { setSearchFilter(''); setSelectedAuthor(null); }}
                className="mt-3 text-xs text-[#e11d48] font-semibold underline cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <BookGrid books={filteredPersonalBooks} onDelete={handleDelete} />
          )}
        </section>
      </div>

      {/* Upload modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={fetchBooks}
      />
    </AppShell>
  );
}

