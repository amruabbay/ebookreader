'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  chapterTitle?: string;
  onRetry?: () => void;
  onNextChapter?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ChapterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chapter rendering error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="my-12 p-8 rounded-2xl border text-center max-w-lg mx-auto shadow-sm"
          style={{
            backgroundColor: 'var(--reader-surface)',
            borderColor: 'var(--reader-border)',
            color: 'var(--reader-text)',
          }}
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" x2="12" y1="8" y2="12"/>
              <line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
          </div>
          <h3 className="font-editorial text-base font-bold mb-1">Gagal Memuat Konten Bab</h3>
          <p className="text-xs opacity-70 mb-6 leading-relaxed">
            Terjadi kendala saat memproses tampilan teks pada {this.props.chapterTitle ? `"${this.props.chapterTitle}"` : 'bab ini'}.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl text-xs font-semibold border opacity-80 hover:opacity-100 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--reader-bg)',
                borderColor: 'var(--reader-border)',
              }}
            >
              Coba Muat Ulang
            </button>
            {this.props.onNextChapter && (
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onNextChapter?.();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] transition-all cursor-pointer shadow-xs"
              >
                Lompat ke Bab Berikutnya →
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
