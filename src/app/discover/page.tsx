'use client';

import { useState, useEffect, useCallback, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/ui/Spinner';

interface DiscoverBook {
  id: number;
  title: string;
  author: string;
  coverUrl: string | null;
  subjects: string[];
  downloadCount: number;
  epubUrl: string | null;
}

interface ShelfCoverItem {
  bookTitle: string;
  bgGradient: string;
  url: string;
}

interface WoodenShelf {
  id: string;
  title: string;
  count: string;
  topic: string;
  covers: ShelfCoverItem[];
}

// Wooden Shelves Categories
const WOODEN_SHELVES: WoodenShelf[] = [
  {
    id: 'antropologi',
    title: 'Antropologi',
    count: '32 books',
    topic: 'anthropology',
    covers: [
      { bookTitle: 'The Golden Bough', bgGradient: 'from-amber-700 to-amber-950', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80' },
      { bookTitle: 'The Descent of Man', bgGradient: 'from-stone-700 to-stone-900', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&q=80' },
      { bookTitle: 'Primitive Culture', bgGradient: 'from-orange-800 to-amber-950', url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&q=80' },
    ],
  },
  {
    id: 'astronomi',
    title: 'Astronomi',
    count: '24 books',
    topic: 'astronomy',
    covers: [
      { bookTitle: 'Astronomy for Everybody', bgGradient: 'from-blue-900 to-indigo-950', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=80' },
      { bookTitle: 'The Story of the Heavens', bgGradient: 'from-slate-800 to-slate-950', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=300&q=80' },
    ],
  },
  {
    id: 'berpikir-kritis',
    title: 'Filsafat & Logika',
    count: '51 books',
    topic: 'philosophy',
    covers: [
      { bookTitle: 'The Republic', bgGradient: 'from-emerald-800 to-teal-950', url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=300&q=80' },
      { bookTitle: 'Meditasi Stoik', bgGradient: 'from-cyan-900 to-blue-950', url: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300&q=80' },
      { bookTitle: 'Beyond Good & Evil', bgGradient: 'from-slate-700 to-stone-900', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&q=80' },
    ],
  },
  {
    id: 'biologi',
    title: 'Biologi',
    count: '17 books',
    topic: 'biology',
    covers: [
      { bookTitle: 'On the Origin of Species', bgGradient: 'from-green-800 to-emerald-950', url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=300&q=80' },
      { bookTitle: 'Voyage of the Beagle', bgGradient: 'from-teal-800 to-slate-900', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80' },
    ],
  },
  {
    id: 'psikologi',
    title: 'Psikologi',
    count: '28 books',
    topic: 'psychology',
    covers: [
      { bookTitle: 'Interpretation of Dreams', bgGradient: 'from-purple-900 to-slate-950', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&q=80' },
      { bookTitle: 'The Crowd: Popular Mind', bgGradient: 'from-violet-800 to-indigo-950', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80' },
    ],
  },
  {
    id: 'sejarah',
    title: 'Sejarah',
    count: '40 books',
    topic: 'history',
    covers: [
      { bookTitle: 'Short History of World', bgGradient: 'from-amber-900 to-stone-950', url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=300&q=80' },
      { bookTitle: 'Decline & Fall of Rome', bgGradient: 'from-yellow-950 to-stone-900', url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=300&q=80' },
    ],
  },
];

function ShelfBookCover({
  cover,
  index,
  total,
  shelfTitle,
}: {
  cover: ShelfCoverItem;
  index: number;
  total: number;
  shelfTitle: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="w-18 sm:w-20 aspect-[3/4] rounded-md overflow-hidden shadow-lg border border-white/20 transform transition-all duration-300 group-hover:scale-105 relative select-none shrink-0"
      style={{
        transform: `translateX(${(index - (total - 1) / 2) * 14}px) rotate(${(index - (total - 1) / 2) * 4}deg)`,
        zIndex: index + 1,
      }}
    >
      {!imgError ? (
        <img
          src={cover.url}
          alt={cover.bookTitle || shelfTitle}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${cover.bgGradient} p-2 flex flex-col justify-between text-white relative shadow-inner`}>
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/30" />
          <span className="text-[7px] font-mono tracking-widest uppercase opacity-75 pl-1">CLASSIC</span>
          <span className="font-editorial text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-3 pl-1 drop-shadow-xs">
            {cover.bookTitle}
          </span>
          <div className="h-0.5 w-4 bg-white/40 rounded-full ml-1" />
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { label: 'Semua Kategori', value: '' },
  { label: 'Antropologi', value: 'anthropology' },
  { label: 'Filsafat', value: 'philosophy' },
  { label: 'Astronomi', value: 'astronomy' },
  { label: 'Biologi', value: 'biology' },
  { label: 'Psikologi', value: 'psychology' },
  { label: 'Fiksi Klasik', value: 'fiction' },
  { label: 'Petualangan', value: 'adventure' },
  { label: 'Sejarah', value: 'history' },
];

function DiscoverBookCard({
  book,
  state,
  onImport,
  onReadNow,
}: {
  book: DiscoverBook;
  state: { status: 'idle' | 'importing' | 'imported' | 'failed'; bookId?: string; error?: string };
  onImport: (book: DiscoverBook) => void;
  onReadNow: (bookId: string) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="group flex flex-col bg-white dark:bg-[#18181b] rounded-2xl border border-[#ede8e1] dark:border-[#27272a] p-3 hover:border-[#d6cebf] dark:hover:border-[#3f3f46] hover:shadow-lg transition-all duration-200">
      {/* Book Cover 3D */}
      <div className="aspect-[3/4] book-cover-3d bg-gradient-to-br from-[#faf7f2] to-[#ede5d8] dark:from-[#242427] dark:to-[#1a1a1c] relative overflow-hidden flex items-center justify-center rounded-lg">
        {book.coverUrl && !imgFailed ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="p-4 text-center flex flex-col justify-between h-full w-full relative text-[#292524] dark:text-[#e4e4e7]">
            <div className="w-5 h-5 rounded bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] flex items-center justify-center text-[10px] font-bold">
              M
            </div>
            <div>
              <p className="font-editorial font-bold text-xs leading-snug line-clamp-4">
                {book.title}
              </p>
              <p className="text-[10px] text-[#78716c] dark:text-[#a1a1aa] mt-2 truncate font-medium">
                {book.author}
              </p>
            </div>
          </div>
        )}

        {/* Reads count badge */}
        {book.downloadCount > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[9px] text-white font-semibold">
            {book.downloadCount > 1000 ? `${(book.downloadCount / 1000).toFixed(0)}k` : book.downloadCount} pembaca
          </div>
        )}
      </div>

      {/* Info & Action */}
      <div className="pt-3 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-editorial font-bold text-xs sm:text-sm text-[#1c1917] dark:text-white line-clamp-2 leading-snug group-hover:text-[#e11d48] transition-colors" title={book.title}>
            {book.title}
          </h4>
          <p className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] truncate mt-1 font-medium">
            {book.author}
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-[#f5f2eb] dark:border-[#27272a]">
          {state.status === 'imported' && state.bookId ? (
            <button
              onClick={() => onReadNow(state.bookId!)}
              className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Baca Sekarang</span>
            </button>
          ) : state.status === 'importing' ? (
            <button
              disabled
              className="w-full py-1.5 px-2 rounded-lg text-xs font-medium bg-[#f5f2eb] dark:bg-[#27272a] text-[#78716c] dark:text-[#a1a1aa] flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <Spinner size="sm" />
              <span>Memproses…</span>
            </button>
          ) : (
            <button
              onClick={() => onImport(book)}
              className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-black text-white dark:bg-white dark:text-[#1c1917] dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Tambah ke Koleksi</span>
            </button>
          )}

          {state.status === 'failed' && (
            <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 text-center truncate" title={state.error}>
              {state.error || 'Gagal menambahkan'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscoverPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [books, setBooks] = useState<DiscoverBook[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('topic') || '');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Sync state if URL query params change (e.g. navigation from collections or authors)
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (topicParam !== null && topicParam !== activeCategory) {
      setActiveCategory(topicParam);
    }
    const qParam = searchParams.get('q') || searchParams.get('search');
    if (qParam !== null && qParam !== searchQuery) {
      setSearchQuery(qParam);
    }
  }, [searchParams]);

  // Track importing book IDs: bookId -> state
  const [importStatus, setImportStatus] = useState<Record<number, { status: 'idle' | 'importing' | 'imported' | 'failed'; bookId?: string; error?: string }>>({});

  const fetchBooks = useCallback(async (query: string, category: string, language: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      if (category) params.set('topic', category);
      if (language && language !== 'All') params.set('language', language);
      params.set('page', '1');

      const res = await fetch(`/api/discover?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBooks(data.books || []);
      setHasMore(!!data.next);
      setTotalCount(data.count || (data.books ? data.books.length : 0));
    } catch {
      setError('Gagal memuat katalog buku dari Gutenberg. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (activeCategory) params.set('topic', activeCategory);
      if (selectedLanguage && selectedLanguage !== 'All') params.set('language', selectedLanguage);
      params.set('page', String(nextPage));

      const res = await fetch(`/api/discover?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newBooks: DiscoverBook[] = data.books || [];

      setBooks((prev) => {
        const existingIds = new Set(prev.map((b) => b.id));
        const uniqueNew = newBooks.filter((b) => !existingIds.has(b.id));
        return [...prev, ...uniqueNew];
      });

      setCurrentPage(nextPage);
      setHasMore(!!data.next);
      if (data.count) setTotalCount(data.count);
    } catch (err) {
      console.error('Failed to load more books:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks(searchQuery, activeCategory, selectedLanguage);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory, selectedLanguage, fetchBooks]);

  const handleImport = async (book: DiscoverBook) => {
    setImportStatus((prev) => ({
      ...prev,
      [book.id]: { status: 'importing' },
    }));

    try {
      const res = await fetch('/api/discover/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          epubUrl: book.epubUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import book');
      }

      setImportStatus((prev) => ({
        ...prev,
        [book.id]: { status: 'imported', bookId: data.book?.id },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setImportStatus((prev) => ({
        ...prev,
        [book.id]: { status: 'failed', error: msg },
      }));
    }
  };

  const handleReadNow = (bookId: string) => {
    startTransition(() => {
      router.push(`/reader/${bookId}`);
    });
  };

  const handleSelectShelf = (topic: string) => {
    setActiveCategory(topic);
    setTimeout(() => {
      const resultsEl = document.getElementById('discover-results');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleToggleCategory = (catValue: string) => {
    // If clicking already selected category, deselect back to all
    setActiveCategory((prev) => (prev === catValue ? '' : catValue));
  };

  const activeCategoryLabel = CATEGORIES.find((c) => c.value === activeCategory)?.label || activeCategory;

  return (
    <AppShell pageTitle="Explore">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* =====================================================================
            FILTER ROW & SEARCH BAR (MALAKA EXPLORE HEADER)
           ===================================================================== */}
        <div className="space-y-4">
          {/* Top Filter Dropdown Pills */}
          <div className="flex items-center gap-4 text-xs font-semibold text-[#57534e] dark:text-[#a1a1aa] pb-1 border-b border-[#ede8e1] dark:border-[#27272a]">
            {/* Bahasa Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-[#ede8e1] dark:border-[#27272a] hover:bg-[#faf8f5] dark:hover:bg-[#27272a] transition-colors cursor-pointer">
                <span>Bahasa {selectedLanguage !== 'All' ? `(${selectedLanguage})` : '+'}</span>
                <span className="text-[10px] text-neutral-400">▾</span>
              </button>
              <div className="hidden group-hover:block absolute left-0 top-full mt-1 bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a] rounded-xl shadow-lg p-1.5 z-30 w-36">
                {['All', 'Bahasa Indonesia', 'English'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className="w-full text-left px-2.5 py-1 rounded-lg text-xs hover:bg-[#faf8f5] dark:hover:bg-[#27272a] cursor-pointer"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Large Malaka Search Input */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari buku, penulis, atau kategori..."
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a] rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder:text-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#1c1917] dark:focus:ring-white transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            WOODEN SHELVES SECTION (RAK BUKU KAYU KATEGORI)
           ===================================================================== */}
        {!searchQuery && !activeCategory && (
          <section className="space-y-4">
            <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#1c1917] dark:text-white">
              Kategori Pilihan
            </h3>

            {/* Grid of Wooden Shelves */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {WOODEN_SHELVES.map((shelf) => (
                <div
                  key={shelf.id}
                  onClick={() => handleSelectShelf(shelf.topic)}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  {/* Overlapping Book covers sitting on the shelf */}
                  <div className="relative h-32 w-full flex items-end justify-center px-4 -mb-1 z-10">
                    {shelf.covers.map((cov, i) => (
                      <ShelfBookCover
                        key={`${shelf.id}-${i}`}
                        cover={cov}
                        index={i}
                        total={shelf.covers.length}
                        shelfTitle={shelf.title}
                      />
                    ))}
                  </div>

                  {/* Realistic Wooden Plank Shelf with 4 Screws */}
                  <div className="wooden-shelf w-full py-2.5 px-3 flex flex-col items-center justify-center text-center relative z-20">
                    {/* Top corner screws */}
                    <div className="shelf-screw top-1.5 left-2" />
                    <div className="shelf-screw top-1.5 right-2" />

                    {/* Category Title on Wood */}
                    <span className="font-editorial font-bold text-xs sm:text-sm text-[#fdfaf5] tracking-wide drop-shadow-sm my-1">
                      {shelf.title}
                    </span>

                    {/* Bottom corner screws */}
                    <div className="shelf-screw bottom-1.5 left-2" />
                    <div className="shelf-screw bottom-1.5 right-2" />
                  </div>

                  {/* Subtitle count */}
                  <span className="text-[11px] text-[#78716c] dark:text-[#a1a1aa] mt-2 font-medium">
                    {shelf.count}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Pills Bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => handleToggleCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.value
                    ? 'bg-[#1c1917] text-white dark:bg-white dark:text-[#1c1917] shadow-xs'
                    : 'bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a] text-[#57534e] dark:text-[#a1a1aa] hover:border-[#1c1917]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Active filter badge if category is selected */}
          {activeCategory && (
            <div className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#a1a1aa] pt-1">
              <span>Kategori aktif:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] font-semibold text-xs">
                {activeCategoryLabel}
                <button
                  onClick={() => setActiveCategory('')}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                  title="Hapus filter kategori"
                >
                  ✕
                </button>
              </span>
              <button
                onClick={() => { setActiveCategory(''); setSearchQuery(''); }}
                className="text-[11px] underline hover:text-[#1c1917] dark:hover:text-white cursor-pointer ml-1"
              >
                Reset ke semua buku
              </button>
            </div>
          )}
        </div>

        {/* =====================================================================
            MAIN DISCOVERY BOOKS GRID
           ===================================================================== */}
        <section id="discover-results" className="space-y-4 pt-2">
          {error && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => fetchBooks(searchQuery, activeCategory, selectedLanguage)}
                className="underline font-bold ml-4 cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Results summary bar */}
          {!isLoading && books.length > 0 && (
            <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#a1a1aa] pb-2 border-b border-[#ede8e1] dark:border-[#27272a]">
              <span>
                Menampilkan <strong className="text-[#1c1917] dark:text-white">{books.length}</strong> buku {activeCategory ? `dalam kategori "${activeCategoryLabel}"` : 'klasik'}
              </span>
              {hasMore && (
                <span className="hidden sm:inline-block">
                  Halaman {currentPage} &bull; Klik &ldquo;Muat Lebih Banyak&rdquo; di bawah
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner size="lg" />
              <p className="text-xs text-[#78716c] dark:text-[#a1a1aa]">Memuat koleksi buku…</p>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-2xl bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a]">
              <div className="w-14 h-14 rounded-2xl bg-[#faf8f5] dark:bg-[#202024] flex items-center justify-center mx-auto mb-3 text-neutral-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h4 className="font-editorial text-base font-bold text-[#1c1917] dark:text-white">
                Buku tidak ditemukan
              </h4>
              <p className="text-xs text-[#78716c] dark:text-[#a1a1aa] mt-1 max-w-sm mx-auto">
                {activeCategory
                  ? `Tidak ada buku yang cocok dalam kategori "${activeCategoryLabel}".`
                  : 'Coba kata kunci pencarian atau kategori yang berbeda.'}
              </p>
              {(activeCategory || searchQuery) && (
                <button
                  onClick={() => { setActiveCategory(''); setSearchQuery(''); }}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Tampilkan Semua Buku</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                {books.map((book) => (
                  <DiscoverBookCard
                    key={book.id}
                    book={book}
                    state={importStatus[book.id] || { status: 'idle' }}
                    onImport={handleImport}
                    onReadNow={handleReadNow}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-10 text-center flex flex-col items-center justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-8 py-3 rounded-xl bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a] hover:border-[#1c1917] dark:hover:border-white font-semibold text-xs text-[#1c1917] dark:text-white shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <Spinner size="sm" />
                        <span>Memuat buku berikutnya…</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <span>Muat Lebih Banyak ({books.length} termuat)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-[#a8a29e] mt-2">
                    Menampilkan {books.length} dari {totalCount.toLocaleString()} buku
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <AppShell pageTitle="Explore">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-[#78716c] dark:text-[#a1a1aa]">Memuat koleksi buku…</p>
          </div>
        </AppShell>
      }
    >
      <DiscoverPageContent />
    </Suspense>
  );
}
