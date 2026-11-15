import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { router } from './components/app_routing';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './utils/auth';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('/authUrl')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              authUrl: 'https://accounts.spotify.com/authorize',
              cachePath: '',
            }),
        } as Response);
      }
      if (urlString.includes('/getUser')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              token: 'test-token',
              user: { display_name: 'cauf', id: 'cauf' },
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });
  });

  it('renders login page on initial unauthenticated visit', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /login with spotify/i })).toBeInTheDocument();
    });
  });

  it('handles callback, persists token, and navigates to createPlaylist', async () => {
    render(<App />);
    await router.navigate({ to: '/callback', search: { code: 'valid-code' } });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/createPlaylist');
      expect(screen.getByPlaceholderText('Search for an Artist')).toBeInTheDocument();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('test-token');
      expect(JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '{}')).toEqual({
        display_name: 'cauf',
        id: 'cauf',
      });
    });
  });

  it('rehydrates authenticated session from localStorage on initial load', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'persisted-token');
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ display_name: 'cauf', id: 'cauf' })
    );

    render(<App />);
    await router.navigate({ to: '/createPlaylist' });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/createPlaylist');
      expect(screen.getByPlaceholderText('Search for an Artist')).toBeInTheDocument();
      expect(screen.getByText('cauf')).toBeInTheDocument();
    });
  });

  it('allows logging out and clears stored session', async () => {
    const user = userEvent.setup();
    localStorage.setItem(TOKEN_STORAGE_KEY, 'persisted-token');
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ display_name: 'cauf', id: 'cauf' })
    );

    render(<App />);
    await router.navigate({ to: '/createPlaylist' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
      expect(screen.queryByText('cauf')).not.toBeInTheDocument();
    });
  });
});
