import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import UserMenuPopover from './user-menu-popover';
import { THEME_STORAGE_KEY } from '../utils/theme';

describe('UserMenuPopover', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.head.innerHTML = '<meta name="color-scheme" content="light dark" />';
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('renders Dark mode switch reflecting OS default', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    render(
      <UserMenuPopover>
        <span>Alex</span>
      </UserMenuPopover>,
    );

    const toggle = screen.getByRole('switch', { name: /dark mode/i });
    expect(toggle).toBeChecked();
  });

  it('toggles override and reverts to system without calling onLogout', () => {
    const onLogout = vi.fn();
    render(
      <UserMenuPopover onLogout={onLogout}>
        <span>Alex</span>
      </UserMenuPopover>,
    );

    const toggle = screen.getByRole('switch', { name: /dark mode/i });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content,
    ).toBe('dark');
    expect(onLogout).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content,
    ).toBe('light dark');
    expect(onLogout).not.toHaveBeenCalled();
  });
});
