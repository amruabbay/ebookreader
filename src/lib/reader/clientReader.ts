'use client';

export const READER_COOKIE_NAME = 'ebook_reader_id';
export const READER_NAME_KEY = 'ebook_reader_name';

function generateRandomReaderId(): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  return `reader_${randomPart}_${timePart}`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Ensures this device/browser has a persistent, unique reader ID.
 * Reads from localStorage or cookie, or generates a new one.
 */
export function getOrCreateClientReaderId(): string {
  if (typeof window === 'undefined') return 'default';

  try {
    let id = localStorage.getItem(READER_COOKIE_NAME);
    const cookieId = getCookie(READER_COOKIE_NAME);

    if (id && !cookieId) {
      // Sync from localStorage to cookie
      setCookie(READER_COOKIE_NAME, id);
    } else if (!id && cookieId) {
      // Sync from cookie to localStorage
      id = cookieId;
      localStorage.setItem(READER_COOKIE_NAME, id);
    } else if (!id && !cookieId) {
      // Create fresh ID for this browser
      id = generateRandomReaderId();
      localStorage.setItem(READER_COOKIE_NAME, id);
      setCookie(READER_COOKIE_NAME, id);
    }

    return id || 'default';
  } catch {
    return 'default';
  }
}

/**
 * Allows the user to switch or import another reader ID key (e.g. to sync across devices).
 */
export function switchClientReaderId(newId: string): void {
  if (typeof window === 'undefined') return;
  const cleanId = newId.trim();
  if (!cleanId) return;

  try {
    localStorage.setItem(READER_COOKIE_NAME, cleanId);
    setCookie(READER_COOKIE_NAME, cleanId);
    window.dispatchEvent(new CustomEvent('reader-profile-changed', { detail: { readerId: cleanId } }));
  } catch (err) {
    console.error('Failed to update reader ID:', err);
  }
}

/**
 * Resets this device's reader ID to a brand new one (fresh save).
 */
export function resetClientReaderId(): string {
  const freshId = generateRandomReaderId();
  switchClientReaderId(freshId);
  return freshId;
}

/**
 * Gets the friendly name of this device/profile (default: "Perangkat Ini").
 */
export function getClientReaderName(): string {
  if (typeof window === 'undefined') return 'Perangkat Ini';
  try {
    return localStorage.getItem(READER_NAME_KEY) || 'Perangkat Ini';
  } catch {
    return 'Perangkat Ini';
  }
}

/**
 * Sets the friendly name of this device/profile.
 */
export function setClientReaderName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = name.trim() || 'Perangkat Ini';
    localStorage.setItem(READER_NAME_KEY, trimmed);
    window.dispatchEvent(new CustomEvent('reader-profile-changed', { detail: { name: trimmed } }));
  } catch (err) {
    console.error('Failed to set reader name:', err);
  }
}
