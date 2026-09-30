'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import type { Book, ReaderSettings, ReadingProgress } from '@/types';
import Spinner from '@/components/ui/Spinner';

interface PdfViewerReaderProps {
  book: Book;
  settings: ReaderSettings;
  initialProgress?: ReadingProgress | null;
}

// Theme background colors matching the reflow reader
const THEME_BG: Record<string, string> = {
  light: '#f3f4f6',
  sepia: '#ece5d8',
  dark: '#141416',
  midnight: '#0b0f17',
};

const THEME_TEXT: Record<string, string> = {
  light: '#1f2937',
  sepia: '#44403c',
  dark: '#e4e4e7',
  midnight: '#c9d1d9',
};

const THEME_TOOLBAR_BG: Record<string, string> = {
  light: '#ffffff',
  sepia: '#f6f1e8',
  dark: '#1e1e24',
  midnight: '#131924',
};

const THEME_BORDER: Record<string, string> = {
  light: '#e5e7eb',
  sepia: '#ded6c6',
  dark: '#2d2d38',
  midnight: '#1f293d',
};

/**
 * Isolated Page Component:
 * Each page manages its own Canvas and cancels its own renderTask cleanly
 * via React cleanup when scale or page changes.
 */
interface PdfPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any;
  pageNum: number;
  scale: number;
  width: number;
  height: number;
}

const PdfPage = memo(function PdfPage({ doc, pageNum, scale, width, height }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null;

    async function render() {
      if (!doc || !canvasRef.current) return;
      setIsRendered(false);
      setRenderError(null);

      try {
        const page = await doc.getPage(pageNum);
        if (isCancelled) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });

        await renderTask.promise;

        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any)?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNum} render error:`, err);
          if (!isCancelled) {
            setRenderError('Gagal merender halaman.');
          }
        }
      }
    }

    render();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [doc, pageNum, scale, retryCount]);

  return (
    <div
      data-page={pageNum}
      className="flex flex-col items-center select-none"
    >
      {/* Page Card */}
      <div
        className="relative bg-white shadow-lg rounded-xs overflow-hidden border border-neutral-300 dark:border-neutral-700 transition-shadow duration-150"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Loading Spinner Overlay */}
        {!isRendered && !renderError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-neutral-900/80 gap-2 z-10 backdrop-blur-2xs">
            <Spinner size="sm" />
            <span className="text-[11px] font-mono text-neutral-500">Memuat hal {pageNum}…</span>
          </div>
        )}

        {/* Render Error Overlay */}
        {renderError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 text-center gap-2 z-10">
            <p className="text-xs font-semibold">{renderError}</p>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      {/* Page Number Label */}
      <div className="mt-1.5 text-[11px] font-mono font-medium text-neutral-500 dark:text-neutral-400">
        Halaman {pageNum}
      </div>
    </div>
  );
});

export default function PdfViewerReader({ book, settings, initialProgress }: PdfViewerReaderProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(book.totalPages || 0);
  const [currentPage, setCurrentPage] = useState(() => {
    if (initialProgress?.contentPosition && initialProgress.contentPosition >= 1) {
      return Math.floor(initialProgress.contentPosition);
    }
    return 1;
  });
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 500, height: 750 });
  const [inputPageVal, setInputPageVal] = useState(String(currentPage));

  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input value when currentPage changes
  useEffect(() => {
    setInputPageVal(String(currentPage));
  }, [currentPage]);

  // Load pdfjs-dist and the PDF document
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setIsLoading(true);
      setError(null);

      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const cMapUrl = `${baseUrl}/cmaps/`;
        const standardFontDataUrl = `${baseUrl}/standard_fonts/`;
        const wasmUrl = `${baseUrl}/wasm/`;

        // Fetch PDF from our API
        const pdfUrl = `/api/books/${book.id}/pdf`;

        const doc = await pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl,
          cMapPacked: true,
          standardFontDataUrl,
          wasmUrl,
        } as Parameters<typeof pdfjsLib.getDocument>[0]).promise;

        if (cancelled) {
          doc.cleanup();
          return;
        }

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__PDF_DOC__ = doc;
        }

        // Preload page 1 to measure natural page dimensions
        try {
          const firstPage = await doc.getPage(1);
          const defaultViewport = firstPage.getViewport({ scale: 1.0 });
          const naturalW = Math.round(defaultViewport.width);
          const naturalH = Math.round(defaultViewport.height);

          setPageSize({
            width: naturalW,
            height: naturalH,
          });

          // Calculate initial comfortable scale
          // Fit height so the full page is comfortably visible without excessive scrolling
          const container = containerRef.current;
          const containerHeight = (container?.clientHeight || window.innerHeight) - 120;
          const containerWidth = (container?.clientWidth || window.innerWidth) - 48;

          if (naturalH > 0 && containerHeight > 200) {
            const fitH = Number((containerHeight / naturalH).toFixed(2));
            const fitW = Number((containerWidth / naturalW).toFixed(2));
            // Default to fitting page height or comfortable width, capped at 1.4x
            const defaultFit = Math.min(fitW, Math.max(0.6, fitH));
            setScale(Math.max(0.5, Math.min(1.4, defaultFit)));
          }
        } catch (e) {
          console.warn('Could not measure first page:', e);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load PDF:', err);
          setError('Gagal memuat file PDF. Pastikan file masih tersedia.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [book.id]);

  // Window radius of rendered pages around currentPage
  // 4 pages ahead and 4 pages behind = 9 active pages, ensuring fluid scrolling without memory overload
  const windowRadius = 4;

  const currentScaledWidth = Math.round(pageSize.width * scale);
  const currentScaledHeight = Math.round(pageSize.height * scale);
  // Total card height = card height + 24px gap + 22px label container
  const pageCardTotalHeight = currentScaledHeight + 46;

  // Jump to a specific page smoothly without scroll feedback interference
  const goToPage = useCallback((page: number, smooth = true) => {
    const clamped = Math.max(1, Math.min(page, numPages || 1));
    setCurrentPage(clamped);
    setInputPageVal(String(clamped));

    const container = containerRef.current;
    if (!container) return;

    isProgrammaticScrollRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    const targetTop = clamped === 1 ? 0 : Math.max(0, 24 + (clamped - 1) * pageCardTotalHeight - 8);
    container.scrollTo({
      top: targetTop,
      behavior: smooth ? 'smooth' : 'auto',
    });

    // Re-enable scroll listener after programmatic scroll completes
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, smooth ? 600 : 50);
  }, [numPages, pageCardTotalHeight]);

  // Initial jump to saved progress after doc loads
  const hasRestoredProgressRef = useRef(false);
  useEffect(() => {
    if (!isLoading && pdfDoc && !hasRestoredProgressRef.current) {
      hasRestoredProgressRef.current = true;
      if (initialProgress?.contentPosition && initialProgress.contentPosition > 1) {
        goToPage(Math.floor(initialProgress.contentPosition), false);
      }
    }
  }, [isLoading, pdfDoc, initialProgress, goToPage]);

  // Track current page based on scroll position in virtual list
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const scrollCenter = container.scrollTop + container.clientHeight * 0.35;
      const newPage = Math.max(1, Math.min(numPages, Math.floor(scrollCenter / pageCardTotalHeight) + 1));
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentPage, numPages, pageCardTotalHeight]);

  // Save progress periodically (debounced 1.5s)
  useEffect(() => {
    if (!pdfDoc || numPages <= 0) return;

    const timer = setTimeout(() => {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          chapterId: `${book.id}-viewer`,
          contentPosition: currentPage,
          progressPercentage: Number(((currentPage - 1) / Math.max(1, numPages - 1)).toFixed(4)),
        }),
      }).catch(() => {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [book.id, currentPage, numPages, pdfDoc]);

  // Zoom controls
  const zoomIn = useCallback(() => setScale((s) => Math.min(3.0, Number((s + 0.15).toFixed(2)))), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2)))), []);

  const zoomFitWidth = useCallback(() => {
    if (!containerRef.current || !pageSize.width) return;
    const containerWidth = containerRef.current.clientWidth - 48;
    const fitScale = Number((containerWidth / pageSize.width).toFixed(2));
    setScale(Math.max(0.4, Math.min(2.5, fitScale)));
  }, [pageSize.width]);

  const zoomFitPage = useCallback(() => {
    if (!containerRef.current || !pageSize.height) return;
    const containerHeight = containerRef.current.clientHeight - 100;
    const fitScale = Number((containerHeight / pageSize.height).toFixed(2));
    setScale(Math.max(0.4, Math.min(2.0, fitScale)));
  }, [pageSize.height]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(numPages);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentPage, goToPage, numPages, zoomIn, zoomOut]);

  const zoomPercentage = useMemo(() => Math.round(scale * 100), [scale]);

  const bg = THEME_BG[settings.theme] || THEME_BG.light;
  const textColor = THEME_TEXT[settings.theme] || THEME_TEXT.light;
  const toolbarBg = THEME_TOOLBAR_BG[settings.theme] || THEME_TOOLBAR_BG.light;
  const borderColor = THEME_BORDER[settings.theme] || THEME_BORDER.light;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: bg, color: textColor }}>
        <Spinner size="lg" />
        <p className="text-sm font-medium opacity-75">Memuat PDF Viewer &amp; Komponen Dokumen…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6" style={{ background: bg, color: textColor }}>
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm font-medium text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: bg, color: textColor }}>
      {/* ── Top PDF Toolbar ── */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0 select-none shadow-xs z-20"
        style={{
          borderColor,
          background: toolbarBg,
        }}
      >
        {/* Page navigation controls */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
            title="Halaman Pertama (Home)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 19 2 12 11 5 11 19" />
              <polygon points="22 19 13 12 22 5 22 19" />
            </svg>
          </button>

          {/* Prev page */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
            title="Halaman Sebelumnya (Arrow Left)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Page input box */}
          <div className="flex items-center gap-1.5 text-xs font-medium px-1">
            <input
              type="text"
              value={inputPageVal}
              onChange={(e) => setInputPageVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = Number((e.currentTarget as HTMLInputElement).value);
                  if (!isNaN(val) && val >= 1 && val <= numPages) {
                    goToPage(val);
                  } else {
                    setInputPageVal(String(currentPage));
                  }
                }
              }}
              onBlur={(e) => {
                const val = Number((e.currentTarget as HTMLInputElement).value);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  goToPage(val);
                } else {
                  setInputPageVal(String(currentPage));
                }
              }}
              className="w-11 text-center py-1 rounded border text-xs font-mono font-semibold"
              style={{
                background: 'transparent',
                borderColor,
                color: textColor,
              }}
            />
            <span className="opacity-50">/ {numPages}</span>
          </div>

          {/* Next page */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
            title="Halaman Berikutnya (Arrow Right)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Last page */}
          <button
            onClick={() => goToPage(numPages)}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
            title="Halaman Terakhir (End)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 19 22 12 13 5 13 19" />
              <polygon points="2 19 11 12 2 5 2 19" />
            </svg>
          </button>
        </div>

        {/* Quick Jump Shortcuts */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs">
          <button
            onClick={() => goToPage(1)}
            className="px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cover
          </button>
          {numPages >= 4 && (
            <button
              onClick={() => goToPage(4)}
              className="px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Judul
            </button>
          )}
          {numPages >= 9 && (
            <button
              onClick={() => goToPage(9)}
              className="px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Daftar Isi
            </button>
          )}
          {numPages >= 11 && (
            <button
              onClick={() => goToPage(11)}
              className="px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Pendahuluan
            </button>
          )}
          {numPages >= 31 && (
            <button
              onClick={() => goToPage(31)}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              Bab 1
            </button>
          )}
        </div>

        {/* Zoom controls & view presets */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.4}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
            title="Perkecil (-)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <span className="text-[11px] font-mono font-semibold px-1 w-10 text-center">
            {zoomPercentage}%
          </span>

          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
            title="Perbesar (+)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Fit Page Preset */}
          <button
            onClick={zoomFitPage}
            className="px-2 py-1 rounded text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Pas Satu Halaman (Fit Page)"
          >
            Pas Layar
          </button>

          {/* Fit Width Preset */}
          <button
            onClick={zoomFitWidth}
            className="px-2 py-1 rounded text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Pas Lebar (Fit Width)"
          >
            Pas Lebar
          </button>
        </div>
      </div>

      {/* ── Virtualized Pages Container ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{
          background: bg,
        }}
      >
        <div className="flex flex-col items-center py-6 gap-6 min-h-full">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
            const isMounted = Math.abs(pageNum - currentPage) <= windowRadius;

            return isMounted && pdfDoc ? (
              <PdfPage
                key={`${pageNum}-${scale}`}
                doc={pdfDoc}
                pageNum={pageNum}
                scale={scale}
                width={currentScaledWidth}
                height={currentScaledHeight}
              />
            ) : (
              /* Lightweight unmounted page placeholder */
              <div
                key={pageNum}
                data-page={pageNum}
                className="flex flex-col items-center select-none"
              >
                <div
                  className="bg-white/60 dark:bg-neutral-900/60 shadow-xs rounded-xs border border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-2"
                  style={{
                    width: `${currentScaledWidth}px`,
                    height: `${currentScaledHeight}px`,
                  }}
                >
                  <span className="text-xs font-mono font-medium text-neutral-400">
                    Halaman {pageNum}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] font-mono text-neutral-400">
                  Halaman {pageNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Page Scrubber Slider ── */}
      {numPages > 1 && (
        <div
          className="flex items-center gap-3 px-6 py-2 border-t shrink-0 select-none z-20"
          style={{
            borderColor,
            background: toolbarBg,
          }}
        >
          <span className="text-[11px] font-mono font-medium opacity-60 min-w-10">
            Hal {currentPage}
          </span>
          <input
            type="range"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={(e) => {
              const p = Number(e.target.value);
              goToPage(p, false);
            }}
            className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
          <span className="text-[11px] font-mono font-medium opacity-60 min-w-10 text-right">
            {Math.round(((currentPage - 1) / Math.max(1, numPages - 1)) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

