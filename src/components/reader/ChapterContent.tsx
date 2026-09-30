'use client';

import { useMemo, useCallback } from 'react';
import type { ContentBlock, Highlight, HighlightColor, ReaderSettings } from '@/types';

interface ChapterContentProps {
  content: ContentBlock[];
  chapterTitle: string;
  chapterId?: string;
  chapterNumber?: number;
  settings: ReaderSettings;
  highlights: Highlight[];
  onTextSelected: (
    text: string,
    position: { x: number; y: number; bottom?: number },
    startOffset: number,
    endOffset: number,
    chapterId?: string
  ) => void;
  onHighlightClick: (highlight: Highlight, position: { x: number; y: number; bottom?: number }) => void;
  showChapterTitle?: boolean;
  isTwoColumn?: boolean;
}

export default function ChapterContent({
  content,
  chapterTitle,
  chapterId,
  chapterNumber,
  settings,
  highlights,
  onTextSelected,
  onHighlightClick,
  showChapterTitle = true,
  isTwoColumn = false,
}: ChapterContentProps) {
  // Determine font family CSS class
  const fontClass = useMemo(() => {
    switch (settings.fontFamily) {
      case 'sans':
        return 'font-reader-sans';
      case 'mono':
        return 'font-reader-mono';
      case 'serif':
      default:
        return 'font-reader-serif';
    }
  }, [settings.fontFamily]);

  // Build a map of chapter highlights for quick lookup
  const chapterHighlights = useMemo(() => {
    return [...highlights].sort((a, b) => b.selectedText.length - a.selectedText.length);
  }, [highlights]);

  // Function to render text with embedded highlights
  const renderTextWithHighlights = useCallback(
    (text: string) => {
      if (chapterHighlights.length === 0) return text;

      // Check if any highlight matches this text (direct or normalized whitespace)
      const matchingHighlights = chapterHighlights.filter((h) => {
        if (!h.selectedText) return false;
        if (text.includes(h.selectedText)) return true;
        const normHl = h.selectedText.replace(/\s+/g, ' ').trim();
        const normText = text.replace(/\s+/g, ' ');
        return normHl.length > 0 && normText.includes(normHl);
      });
      if (matchingHighlights.length === 0) return text;

      // Sort matching highlights by their position in text
      const positions: { start: number; end: number; highlight: Highlight }[] = [];
      for (const h of matchingHighlights) {
        let index = text.indexOf(h.selectedText);
        let matchLen = h.selectedText.length;
        if (index === -1) {
          const normHl = h.selectedText.replace(/\s+/g, ' ').trim();
          index = text.indexOf(normHl);
          matchLen = normHl.length;
        }
        while (index !== -1) {
          const end = index + matchLen;
          // Check collision
          const overlap = positions.some(
            (p) => (index >= p.start && index < p.end) || (end > p.start && end <= p.end)
          );
          if (!overlap) {
            positions.push({ start: index, end, highlight: h });
          }
          index = text.indexOf(h.selectedText, index + 1);
        }
      }

      if (positions.length === 0) return text;

      positions.sort((a, b) => a.start - b.start);

      const segments: React.ReactNode[] = [];
      let lastIndex = 0;

      positions.forEach((pos, i) => {
        if (pos.start > lastIndex) {
          segments.push(text.slice(lastIndex, pos.start));
        }

        const colorClass = `reader-highlight-${pos.highlight.color}`;
        segments.push(
          <mark
            key={`${pos.highlight.id}-${i}`}
            id={`highlight-${pos.highlight.id}`}
            data-highlight-id={pos.highlight.id}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onHighlightClick(pos.highlight, {
                x: rect.left + rect.width / 2,
                y: rect.top,
                bottom: rect.bottom,
              });
            }}
            className={`${colorClass} cursor-pointer transition-all hover:opacity-80 inline rounded-xs px-0.5 touch-manipulation`}
            title="Klik untuk opsi highlight"
          >
            {text.slice(pos.start, pos.end)}
          </mark>
        );

        lastIndex = pos.end;
      });

      if (lastIndex < text.length) {
        segments.push(text.slice(lastIndex));
      }

      return <>{segments}</>;
    },
    [chapterHighlights, onHighlightClick]
  );

  return (
    <article
      className={`reading-content select-text transition-colors duration-200 ${fontClass} ${
        isTwoColumn ? 'md:columns-2 md:gap-12 lg:gap-16' : ''
      }`}
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      {showChapterTitle && (
        <div className="mb-8 break-inside-avoid break-after-avoid">
          <p className="text-[11px] font-sans uppercase tracking-widest opacity-50 mb-1 font-bold">
            {chapterNumber !== undefined ? `Bab ${chapterNumber}` : 'Bab'}
          </p>
          <h1
            className="font-bold tracking-tight leading-tight"
            style={{
              fontSize: `${Math.round(settings.fontSize * 1.55)}px`,
              color: 'var(--reader-text)',
            }}
          >
            {chapterTitle}
          </h1>
        </div>
      )}

      <div className={isTwoColumn ? '' : 'space-y-6'}>
        {content.map((block, index) => {
          switch (block.type) {
            case 'heading':
              return renderHeading(block, index, settings, renderTextWithHighlights);

            case 'blockquote':
              return (
                <blockquote
                  key={index}
                  data-block-index={index}
                  className="border-l-3 pl-5 italic my-6 opacity-85 break-inside-avoid"
                  style={{
                    borderColor: 'var(--reader-border)',
                    color: 'var(--reader-text)',
                  }}
                >
                  {renderTextWithHighlights(block.text)}
                </blockquote>
              );

            case 'list':
              return (
                <div
                  key={index}
                  data-block-index={index}
                  className="pl-6 mb-4 leading-relaxed break-inside-avoid"
                  style={{ color: 'var(--reader-text)' }}
                >
                  {renderTextWithHighlights(block.text)}
                </div>
              );

            case 'paragraph':
            default:
              return (
                <p
                  key={index}
                  data-block-index={index}
                  className="text-justify md:text-left transition-colors mb-4 break-inside-auto break-words [overflow-wrap:anywhere]"
                  style={{ color: 'var(--reader-text)' }}
                >
                  {renderTextWithHighlights(block.text)}
                </p>
              );
          }
        })}
      </div>
    </article>
  );
}

function renderHeading(
  block: ContentBlock,
  index: number,
  settings: ReaderSettings,
  renderTextWithHighlights: (text: string) => React.ReactNode
) {
  const baseStyle = { color: 'var(--reader-text)' };
  switch (block.level) {
    case 1:
      return (
        <h2
          key={index}
          data-block-index={index}
          className="font-bold mt-8 mb-4 break-inside-avoid break-after-avoid"
          style={{ ...baseStyle, fontSize: `${Math.round(settings.fontSize * 1.3)}px` }}
        >
          {renderTextWithHighlights(block.text)}
        </h2>
      );
    case 2:
      return (
        <h3
          key={index}
          data-block-index={index}
          className="font-bold mt-6 mb-3 break-inside-avoid break-after-avoid"
          style={{ ...baseStyle, fontSize: `${Math.round(settings.fontSize * 1.18)}px` }}
        >
          {renderTextWithHighlights(block.text)}
        </h3>
      );
    default:
      return (
        <h4
          key={index}
          data-block-index={index}
          className="font-semibold mt-5 mb-2 break-inside-avoid break-after-avoid"
          style={{ ...baseStyle, fontSize: `${Math.round(settings.fontSize * 1.05)}px` }}
        >
          {renderTextWithHighlights(block.text)}
        </h4>
      );
  }
}
