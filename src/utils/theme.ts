import { useCallback, useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'setlistify_color_scheme';

export type ThemeScheme = 'light' | 'dark';
export type StoredTheme = ThemeScheme | null;

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Reads the current OS/browser color scheme preference.
 */
export function getSystemScheme(): ThemeScheme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Reads the user's explicit color scheme override from localStorage, if any.
 */
export function getStoredTheme(): StoredTheme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function setStoredTheme(stored: StoredTheme): void {
  try {
    if (stored === null) {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, stored);
    }
  } catch {
    // Ignore storage errors (e.g. private browsing / blocked storage)
  }
}

/**
 * Resolves the active color scheme from an optional stored override and the OS scheme.
 */
export function resolveTheme(stored: StoredTheme, system: ThemeScheme): ThemeScheme {
  return stored ?? system;
}

/**
 * Updates `<meta name="color-scheme">` in `<head>` to reflect the stored preference
 * or `'light dark'` when following the OS default.
 */
export function applyThemeMeta(stored: StoredTheme): void {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'color-scheme';
    document.head?.appendChild(meta);
  }
  meta.content = stored ?? 'light dark';
}

/**
 * Computes the next stored preference for a two-state toggle:
 * flipping away from the OS scheme persists an explicit override;
 * flipping back to match the OS clears the override to follow future OS changes.
 */
export function toggleThemePreference(
  currentStored: StoredTheme,
  system: ThemeScheme,
): StoredTheme {
  const rendered = resolveTheme(currentStored, system);
  const target: ThemeScheme = rendered === 'dark' ? 'light' : 'dark';
  return target === system ? null : target;
}

export interface UseThemeResult {
  resolvedTheme: ThemeScheme;
  isDark: boolean;
  storedTheme: StoredTheme;
  toggleTheme: () => void;
}

/**
 * React hook managing light/dark mode state, OS preference changes,
 * cross-tab storage synchronization, and `<meta name="color-scheme">`.
 */
export function useTheme(): UseThemeResult {
  const [storedTheme, setStoredThemeState] = useState<StoredTheme>(() => getStoredTheme());
  const [systemScheme, setSystemScheme] = useState<ThemeScheme>(() => getSystemScheme());

  useEffect(() => {
    applyThemeMeta(storedTheme);
  }, [storedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia(DARK_MEDIA_QUERY) : null;

    const handleMediaChange = (event: MediaQueryListEvent) => {
      setSystemScheme(event.matches ? 'dark' : 'light');
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setStoredThemeState(getStoredTheme());
      }
    };

    mediaQuery?.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery?.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const currentSystem = getSystemScheme();
    setSystemScheme(currentSystem);
    setStoredThemeState((prevStored) => {
      const nextStored = toggleThemePreference(prevStored, currentSystem);
      setStoredTheme(nextStored);
      applyThemeMeta(nextStored);
      return nextStored;
    });
  }, []);

  const resolvedTheme = resolveTheme(storedTheme, systemScheme);

  return {
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    storedTheme,
    toggleTheme,
  };
}
