'use client';

import { useState, useEffect } from 'react';
import type { ChapterNavItem, Highlight, Note, Bookmark } from '@/types';

interface TableOfContentsProps {
  chapters: ChapterNavItem[];
  currentChapterId: string;
  onSelectChapter: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  notes: Note[];
  onSelectHighlight: (highlight: Highlight) => void;
  onDeleteHighlight: (id: string) => void;
  initialTab?: TabType;
  bookmarks?: Bookmark[];
  onSelectBookmark?: (bookmark: Bookmark) => void;
  onDeleteBookmark?: (id: string) => void;
}

type TabType = 'toc' | 'bookmarks' | 'highlights' | 'notes';

export default function TableOfContents({
  chapters,
  currentChapterId,
  onSelectChapter,
  isOpen,
  onClose,
  highlights,
  notes,
  onSelectHighlight,
  onDeleteHighlight,
  initialTab = 'toc',
  bookmarks = [],
  onSelectBookmark,
  onDeleteBookmark,
}: TableOfContentsProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sync activeTab when initialTab or isOpen changes
  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const getChapterTitle = (chapterId: string) => {
    return chapters.find((c) => c.id === chapterId)?.title || 'Unknown Chapter';
  };

  const getNoteForHighlight = (highlightId: string) => {
    return notes.find((n) => n.highlightId === highlightId)?.content;
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar on RIGHT */}
      <aside
        className={`fixed top-0 right-0 z-50 h-dvh-safe w-80 sm:w-96 max-w-[85vw] border-l shadow-2xl overflow-hidden transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 ${
          isOpen
            ? 'translate-x-0 opacity-100 visible pointer-events-auto'
            : 'translate-x-full opacity-0 invisible pointer-events-none'
        }`}
        style={{
          backgroundColor: 'var(--reader-bg)',
          borderColor: 'var(--reader-border)',
          color: 'var(--reader-text)',
        }}
      >
        {/* Header with tabs */}
        <div className="p-4 border-b flex flex-col gap-3" style={{ borderColor: 'var(--reader-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Navigation</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              aria-label="Close sidebar"
              title="Tutup navigasi"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Tab selector */}
          <div className="grid grid-cols-4 rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--reader-surface)' }}>
            <button
              onClick={() => setActiveTab('toc')}
              className={`py-1.5 px-0.5 text-[11px] rounded-lg font-medium transition-all cursor-pointer text-center whitespace-nowrap ${
                activeTab === 'toc' ? 'shadow-xs font-semibold' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeTab === 'toc' ? 'var(--reader-bg)' : 'transparent',
                color: 'var(--reader-text)',
              }}
              title="Daftar Bab"
            >
              Bab
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`py-1.5 px-0.5 text-[11px] rounded-lg font-medium transition-all cursor-pointer text-center whitespace-nowrap ${
                activeTab === 'bookmarks' ? 'shadow-xs font-semibold' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeTab === 'bookmarks' ? 'var(--reader-bg)' : 'transparent',
                color: 'var(--reader-text)',
              }}
              title="Penanda Buku"
            >
              Tanda{bookmarks.length > 0 ? ` (${bookmarks.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('highlights')}
              className={`py-1.5 px-0.5 text-[11px] rounded-lg font-medium transition-all cursor-pointer text-center whitespace-nowrap ${
                activeTab === 'highlights' ? 'shadow-xs font-semibold' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeTab === 'highlights' ? 'var(--reader-bg)' : 'transparent',
                color: 'var(--reader-text)',
              }}
              title="Sorotan Teks"
            >
              Sorot{highlights.length > 0 ? ` (${highlights.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-1.5 px-0.5 text-[11px] rounded-lg font-medium transition-all cursor-pointer text-center whitespace-nowrap ${
                activeTab === 'notes' ? 'shadow-xs font-semibold' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeTab === 'notes' ? 'var(--reader-bg)' : 'transparent',
                color: 'var(--reader-text)',
              }}
              title="Catatan"
            >
              Catatan{notes.length > 0 ? ` (${notes.length})` : ''}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Table of Contents Tab */}
          {activeTab === 'toc' && (
            <nav>
              <ul className="space-y-1">
                {chapters
                  .filter(
                    (chapter) =>
                      !/terima\s+kasih\s+telah\s+mengunduh|ebook\s+simon\s*&\s*schuster|klik\s+di\s+sini\s+untuk\s+mendaftar|click\s+here\s+to\s+sign\s+up|dapatkan\s+ebook\s+gratis|kami\s+harap\s+anda\s+menikmati/i.test(
                        chapter.title
                      )
                  )
                  .map((chapter, index) => {
                    const isActive = chapter.id === currentChapterId;
                    return (
                      <li key={chapter.id}>
                      <button
                        onClick={() => {
                          onSelectChapter(chapter.id);
                          onClose();
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between ${
                          isActive
                            ? 'font-bold'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isActive ? 'var(--reader-surface)' : 'transparent',
                          color: 'var(--reader-text)',
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="opacity-50 text-[10px] tabular-nums font-mono">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="truncate">{chapter.title}</span>
                        </div>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--reader-accent)' }} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          {/* Bookmarks Tab */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-2.5">
              {bookmarks.length === 0 ? (
                <div className="text-center py-16 px-4 opacity-50 text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                    </svg>
                  </div>
                  <p className="font-semibold">Belum ada penanda halaman</p>
                  <p className="text-[11px] mt-1 leading-relaxed opacity-75">
                    Klik ikon penanda pita (bookmark) di bilah atas untuk menandai posisi membaca Anda.
                  </p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-3 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-xs group"
                    style={{
                      backgroundColor: 'var(--reader-surface)',
                      borderColor: 'var(--reader-border)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-red-500 shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                          </svg>
                        </span>
                        <span className="text-[10px] font-semibold opacity-60 uppercase tracking-wider truncate">
                          {bm.label || getChapterTitle(bm.chapterId)}
                        </span>
                      </div>
                      {onDeleteBookmark && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBookmark(bm.id);
                          }}
                          className="p-1 opacity-40 hover:opacity-100 hover:text-red-500 transition-all cursor-pointer shrink-0"
                          title="Hapus penanda"
                          aria-label="Delete bookmark"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onSelectBookmark?.(bm);
                        onClose();
                      }}
                      className="text-left cursor-pointer group-hover:opacity-100 transition-opacity"
                    >
                      <p className="text-xs font-semibold line-clamp-2 leading-relaxed opacity-90">
                        {bm.label || getChapterTitle(bm.chapterId)}
                      </p>
                    </button>

                    <span className="text-[10px] opacity-40">
                      {new Date(bm.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Highlights Tab */}
          {activeTab === 'highlights' && (
            <div className="space-y-2.5">
              {highlights.length === 0 ? (
                <div className="text-center py-16 px-4 opacity-50 text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 11-6 6v3h3l6-6" />
                      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
                    </svg>
                  </div>
                  <p className="font-semibold">Belum ada highlight</p>
                  <p className="text-[11px] mt-1 leading-relaxed opacity-75">
                    Pilih atau blok teks saat membaca buku untuk memberi sorotan warna (highlight).
                  </p>
                </div>
              ) : (
                highlights.map((hl) => {
                  const noteContent = getNoteForHighlight(hl.id);
                  const colorStyles: Record<string, { border: string; dot: string }> = {
                    yellow: { border: 'border-l-amber-300', dot: 'bg-amber-300' },
                    green: { border: 'border-l-emerald-300', dot: 'bg-emerald-300' },
                    blue: { border: 'border-l-blue-300', dot: 'bg-blue-300' },
                    pink: { border: 'border-l-rose-300', dot: 'bg-rose-300' },
                    red: { border: 'border-l-rose-300', dot: 'bg-rose-300' },
                    purple: { border: 'border-l-purple-300', dot: 'bg-purple-300' },
                    underline: { border: 'border-l-rose-300', dot: 'bg-rose-300' },
                  };
                  const style = colorStyles[hl.color] || colorStyles.yellow;

                  return (
                    <div
                      key={hl.id}
                      className={`p-3 rounded-xl border border-l-4 ${style.border} flex flex-col gap-2 transition-all hover:shadow-xs group`}
                      style={{
                        backgroundColor: 'var(--reader-surface)',
                        borderColor: 'var(--reader-border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                          <span className="text-[10px] font-semibold opacity-60 uppercase tracking-wider truncate">
                            {getChapterTitle(hl.chapterId)}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHighlight(hl.id);
                          }}
                          className="p-1 opacity-40 hover:opacity-100 hover:text-red-500 transition-all cursor-pointer shrink-0"
                          title="Hapus highlight"
                          aria-label="Delete highlight"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          onSelectHighlight(hl);
                          onClose();
                        }}
                        className="text-left cursor-pointer group-hover:opacity-100 transition-opacity"
                      >
                        <p className="text-xs font-serif italic line-clamp-3 leading-relaxed opacity-90">
                          &ldquo;{hl.selectedText}&rdquo;
                        </p>
                      </button>

                      {noteContent && (
                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-xs flex items-start gap-1.5 mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 opacity-60">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          <p className="opacity-90 line-clamp-2">{noteContent}</p>
                        </div>
                      )}

                      <span className="text-[10px] opacity-40">
                        {new Date(hl.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-2.5">
              {notes.length === 0 ? (
                <div className="text-center py-16 px-4 opacity-50 text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </div>
                  <p className="font-semibold">Belum ada catatan</p>
                  <p className="text-[11px] mt-1 leading-relaxed opacity-75">
                    Sorot teks pada buku dan pilih &ldquo;Catatan&rdquo; untuk menulis catatan pribadi.
                  </p>
                </div>
              ) : (
                notes.map((note) => {
                  const associatedHighlight = highlights.find((h) => h.id === note.highlightId);
                  return (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-xs group"
                      style={{
                        backgroundColor: 'var(--reader-surface)',
                        borderColor: 'var(--reader-border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold opacity-60 uppercase tracking-wider truncate">
                          {associatedHighlight ? getChapterTitle(associatedHighlight.chapterId) : 'Catatan'}
                        </span>
                        {associatedHighlight && (
                          <button
                            onClick={() => onDeleteHighlight(associatedHighlight.id)}
                            className="p-1 opacity-40 hover:opacity-100 hover:text-red-500 transition-all cursor-pointer shrink-0"
                            title="Hapus catatan"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap font-medium">
                        {note.content}
                      </p>

                      {associatedHighlight && (
                        <button
                          onClick={() => {
                            onSelectHighlight(associatedHighlight);
                            onClose();
                          }}
                          className="text-left p-2 rounded-lg bg-black/5 dark:bg-white/5 cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <p className="text-[11px] italic font-serif line-clamp-2 opacity-75">
                            &ldquo;{associatedHighlight.selectedText}&rdquo;
                          </p>
                        </button>
                      )}

                      <span className="text-[10px] opacity-40">
                        {new Date(note.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
