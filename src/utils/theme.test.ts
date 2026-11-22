import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  resolveTheme,
  toggleThemePreference,
  useTheme,
} from './theme';

type MatchMediaListener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  const listeners = new Set<MatchMediaListener>();

  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, cb: MatchMediaListener) => {
      if (event === 'change') listeners.add(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: MatchMediaListener) => {
      if (event === 'change') listeners.delete(cb);
    }),
    dispatchEvent: vi.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });

  return {
    setDark(nextDark: boolean) {
      matches = nextDark;
      const event = { matches: nextDark, media: mql.media } as MediaQueryListEvent;
      listeners.forEach((cb) => cb(event));
    },
  };
}

describe('theme utilities and useTheme', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.head.innerHTML = '<meta name="color-scheme" content="light dark" />';
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('defaults to OS light scheme with light dark meta and no localStorage entry', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(result.current.storedTheme).toBeNull();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content,
    ).toBe('light dark');
  });

  it('defaults to OS dark scheme when prefers-color-scheme is dark', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(result.current.storedTheme).toBeNull();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content,
    ).toBe('light dark');
  });

  it('toggles away from OS preference to store explicit override and reverts to system on second toggle', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    // First toggle: OS is light -> user wants dark -> store 'dark'
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(result.current.storedTheme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content,
    ).toBe('dark');

    // Second toggle: matches OS (light) again -> remove storage key and restore 'light dark'
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(result.current.storedTheme).toBeNull();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content,
    ).toBe('light dark');
  });

  it('updates live on OS preference change when following system, without clearing an explicit override', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    // Following OS: OS switches to dark -> resolvedTheme becomes 'dark'
    act(() => {
      media.setDark(true);
    });
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.storedTheme).toBeNull();

    // User explicitly toggles to light while OS is dark
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.storedTheme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    // OS switches to light -> stored override 'light' must NOT be retroactively cleared
    act(() => {
      media.setDark(false);
    });
    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.storedTheme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('synchronizes across tabs via window storage events', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'dark',
        }),
      );
    });

    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.storedTheme).toBe('dark');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content,
    ).toBe('dark');
  });

  it('handles localStorage errors gracefully', () => {
    mockMatchMedia(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });

    expect(getStoredTheme()).toBeNull();
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.resolvedTheme).toBe('dark');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content,
    ).toBe('dark');
  });

  it('pure helpers resolve and toggle preferences deterministically', () => {
    expect(resolveTheme(null, 'dark')).toBe('dark');
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(toggleThemePreference(null, 'light')).toBe('dark');
    expect(toggleThemePreference('dark', 'light')).toBeNull();
    expect(toggleThemePreference(null, 'dark')).toBe('light');
    expect(toggleThemePreference('light', 'dark')).toBeNull();
  });
});
