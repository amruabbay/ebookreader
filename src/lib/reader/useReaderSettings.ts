'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReaderSettings, ReadingFontFamily, ReadingMode, ReadingTheme, ReadingWidth } from '@/types';

const STORAGE_KEY = 'ebook_reader_settings';

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 1.75,
  readingWidth: 'normal',
  theme: 'light',
  readingMode: 'scroll',
  wordsPerPage: 340,
};

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    let initialTheme: ReadingTheme = 'light';
    if (typeof window !== 'undefined') {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) initialTheme = 'dark';
    }
    return {
      ...DEFAULT_SETTINGS,
      theme: initialTheme,
    };
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved settings from localStorage on mount & adapt to active theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const appTheme = localStorage.getItem('theme');
      const isSystemDark =
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentDark =
        document.documentElement.classList.contains('dark') ||
        appTheme === 'dark' ||
        (!appTheme && isSystemDark);

      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          // If no explicit theme saved in reader settings, follow current app/system mode
          theme: parsed.theme || (currentDark ? 'dark' : 'light'),
        });
      } else {
        setSettings((prev) => ({
          ...prev,
          theme: currentDark ? 'dark' : 'light',
        }));
      }
    } catch {
      // Use defaults if localStorage is unavailable
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const updateSetting = useCallback(<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    updateSetting('fontSize', Math.min(32, Math.max(13, fontSize)));
  }, [updateSetting]);

  const setFontFamily = useCallback((fontFamily: ReadingFontFamily) => {
    updateSetting('fontFamily', fontFamily);
  }, [updateSetting]);

  const setLineHeight = useCallback((lineHeight: number) => {
    updateSetting('lineHeight', lineHeight);
  }, [updateSetting]);

  const setReadingWidth = useCallback((readingWidth: ReadingWidth) => {
    updateSetting('readingWidth', readingWidth);
  }, [updateSetting]);

  const setTheme = useCallback((theme: ReadingTheme) => {
    updateSetting('theme', theme);
    if (typeof window !== 'undefined') {
      if (theme === 'dark' || theme === 'midnight') {
        document.documentElement.classList.add('dark');
        try {
          localStorage.setItem('theme', 'dark');
        } catch {}
      } else {
        document.documentElement.classList.remove('dark');
        try {
          localStorage.setItem('theme', 'light');
        } catch {}
      }
    }
  }, [updateSetting]);

  // Keep reader theme in sync when system theme or app theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        if (e.newValue === 'dark') {
          updateSetting('theme', 'dark');
          document.documentElement.classList.add('dark');
        } else if (e.newValue === 'light') {
          updateSetting('theme', 'light');
          document.documentElement.classList.remove('dark');
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [setTheme, updateSetting]);

  const setReadingMode = useCallback((readingMode: ReadingMode) => {
    updateSetting('readingMode', readingMode);
  }, [updateSetting]);

  const setWordsPerPage = useCallback((wordsPerPage: number) => {
    updateSetting('wordsPerPage', Math.min(1000, Math.max(80, wordsPerPage)));
  }, [updateSetting]);

  return {
    settings,
    isLoaded,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setReadingWidth,
    setTheme,
    setReadingMode,
    setWordsPerPage,
  };
}
