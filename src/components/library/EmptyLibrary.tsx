'use client';

import Link from 'next/link';

export default function EmptyLibrary({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Book silhouette icon */}
      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#18181b] border border-[#ede8e1] dark:border-[#27272a] shadow-sm flex items-center justify-center mb-5 text-[#1c1917] dark:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      </div>

      <h3 className="font-editorial text-xl font-bold text-[#1c1917] dark:text-white mb-2">
        Perpustakaan Pribadi Masih Kosong
      </h3>
      <p className="text-[#78716c] dark:text-[#a1a1aa] text-xs sm:text-sm max-w-sm mb-6 leading-relaxed">
        Upload file ebook PDF atau EPUB Anda untuk langsung diubah menjadi format reflowable yang nyaman dibaca di laptop dan mobile.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1c1917] text-white dark:bg-white dark:text-[#1c1917] font-semibold text-xs shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" y2="15" />
          </svg>
          <span>Upload PDF / EPUB</span>
        </button>

        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#ede8e1] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-xs font-semibold text-[#1c1917] dark:text-white hover:bg-[#faf8f5] dark:hover:bg-[#202024] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span>Jelajahi 70.000+ Buku Klasik</span>
        </Link>
      </div>
    </div>
  );
}

