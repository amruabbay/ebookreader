'use client';

import { useEffect, useRef, useState } from 'react';
import type { Highlight, HighlightColor } from '@/types';

interface SelectionPopoverProps {
  position: { x: number; y: number; bottom?: number } | null;
  activeHighlight?: Highlight | null;
  hasNote?: boolean;
  onHighlight: (color: HighlightColor) => void;
  onRemoveHighlight?: () => void;
  onOpenNote?: () => void;
  onClose: (clearSelection?: boolean) => void;
}

export default function SelectionPopover({
  position,
  activeHighlight,
  hasNote = false,
  onHighlight,
  onRemoveHighlight,
  onOpenNote,
  onClose,
}: SelectionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const computePos = (pos: { x: number; y: number; bottom?: number }, el?: HTMLElement | null) => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 390;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 844;
    const popoverW = el ? el.offsetWidth : 270;
    const popoverH = el ? el.offsetHeight : 44;

    const clampedX = Math.max(8, Math.min(screenW - popoverW - 8, pos.x - popoverW / 2));
    const topPlacement = pos.y - popoverH - 10;
    const bottomPlacement = (pos.bottom ?? (pos.y + 24)) + 12;

    let clampedY: number;
    if (topPlacement >= 60) {
      clampedY = topPlacement;
    } else if (bottomPlacement + popoverH <= screenH - 60) {
      clampedY = bottomPlacement;
    } else {
      clampedY = Math.max(60, screenH - popoverH - 80);
    }

    return { left: clampedX, top: clampedY };
  };

  const [stylePos, setStylePos] = useState<{ left: number; top: number }>(() => {
    return position ? computePos(position) : { left: 0, top: 0 };
  });

  useEffect(() => {
    if (!position) return;

    const updatePos = () => {
      setStylePos(computePos(position, popoverRef.current));
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    return () => window.removeEventListener('resize', updatePos);
  }, [position?.x, position?.y, position?.bottom, activeHighlight]);

  // Handle outside click & escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current) {
        const path = e.composedPath ? e.composedPath() : [];
        if (path.includes(popoverRef.current) || popoverRef.current.contains(e.target as Node)) {
          return;
        }
        // Outside click hides popover without destroying active text selection/handles
        onClose(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(true);
    };

    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={popoverRef}
      data-selection-popover="true"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => {
        // Stop touch inside popover from bubbling to outside-click dismissal
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
      className="fixed z-50 flex items-center p-1 sm:p-1.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-150 animate-in fade-in zoom-in-95 max-w-[calc(100vw-16px)] select-none touch-manipulation"
      style={{
        left: `${stylePos.left}px`,
        top: `${stylePos.top}px`,
        backgroundColor: 'var(--reader-surface)',
        borderColor: 'var(--reader-border)',
        color: 'var(--reader-text)',
      }}
    >
      {/* 5 Colors + Underline Palette: 1-Tap Highlight */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-1">
        {/* Yellow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHighlight('yellow');
          }}
          className={`w-7 h-7 rounded-full bg-[#fef08a] border border-[#facc15] hover:scale-115 active:scale-90 transition-transform cursor-pointer shadow-xs touch-manipulation ${
            activeHighlight?.color === 'yellow' ? 'ring-2 ring-neutral-700 dark:ring-white scale-110' : ''
          }`}
          title="Kuning Lembut"
          aria-label="Kuning"
        />

        {/* Green */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHighlight('green');
          }}
          className={`w-7 h-7 rounded-full bg-[#bbf7d0] border border-[#4ade80] hover:scale-115 active:scale-90 transition-transform cursor-pointer shadow-xs touch-manipulation ${
            activeHighlight?.color === 'green' ? 'ring-2 ring-neutral-700 dark:ring-white scale-110' : ''
          }`}
          title="Hijau Lembut"
          aria-label="Hijau"
        />

        {/* Blue */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHighlight('blue');
          }}
          className={`w-7 h-7 rounded-full bg-[#bfdbfe] border border-[#60a5fa] hover:scale-115 active:scale-90 transition-transform cursor-pointer shadow-xs touch-manipulation ${
            activeHighlight?.color === 'blue' ? 'ring-2 ring-neutral-700 dark:ring-white scale-110' : ''
          }`}
          title="Biru Lembut"
          aria-label="Biru"
        />

        {/* Rose */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHighlight('red');
          }}
          className={`w-7 h-7 rounded-full bg-[#fecdd3] border border-[#fb7185] hover:scale-115 active:scale-90 transition-transform cursor-pointer shadow-xs touch-manipulation ${
            activeHighlight?.color === 'red' || activeHighlight?.color === 'pink'
              ? 'ring-2 ring-neutral-700 dark:ring-white scale-110'
              : ''
          }`}
          title="Rose Lembut"
          aria-label="Rose"
        />

        {/* Purple */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHighlight('purple');
          }}
          className={`w-7 h-7 rounded-full bg-[#e9d5ff] border border-[#c084fc] hover:scale-115 active:scale-90 transition-transform cursor-pointer shadow-xs touch-manipulation ${
            activeHighlight?.color === 'purple' ? 'ring-2 ring-neutral-700 dark:ring-white scale-110' : ''
          }`}
          title="Ungu Lembut"
          aria-label="Ungu"
        />

        {/* Underline Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHighlight('underline');
          }}
          className={`w-7 h-7 rounded-md border flex items-center justify-center hover:scale-115 active:scale-90 transition-transform cursor-pointer shadow-xs touch-manipulation ${
            activeHighlight?.color === 'underline' ? 'ring-2 ring-neutral-700 dark:ring-white scale-110' : ''
          }`}
          style={{
            backgroundColor: 'var(--reader-bg)',
            borderColor: 'var(--reader-border)',
            color: 'var(--reader-text)',
          }}
          title="Garis Bawah (Underline)"
          aria-label="Garis Bawah"
        >
          <span className="font-serif font-bold text-xs underline decoration-[#f43f5e]/70 decoration-2 underline-offset-2">
            U
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 opacity-20 mx-1" style={{ backgroundColor: 'var(--reader-text)' }} />

      {/* Action Buttons: Note and Delete/Cancel */}
      <div className="flex items-center gap-0.5">
        {/* Note Option */}
        {onOpenNote && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenNote();
            }}
            className="p-1.5 sm:p-2 opacity-75 hover:opacity-100 active:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer relative touch-manipulation"
            style={{ color: 'var(--reader-text)' }}
            title={hasNote ? 'Edit Catatan' : 'Tambah Catatan'}
            aria-label="Catatan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            {hasNote && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute top-1 right-1" />
            )}
          </button>
        )}

        {/* Delete button (if active highlight) OR Close button */}
        {activeHighlight && onRemoveHighlight ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveHighlight();
            }}
            className="p-1.5 sm:p-2 opacity-75 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer touch-manipulation"
            style={{ color: 'var(--reader-text)' }}
            title="Hapus Highlight"
            aria-label="Hapus Highlight"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose(true);
            }}
            className="p-1.5 sm:p-2 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer touch-manipulation"
            style={{ color: 'var(--reader-text)' }}
            title="Tutup"
            aria-label="Tutup"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
