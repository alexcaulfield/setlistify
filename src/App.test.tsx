import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { router } from './components/app_routing';

describe('App', () => {
  beforeEach(() => {
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

  // 1. Initial Unauthenticated Path: landing route shows login CTA
  it('renders login page on initial unauthenticated visit', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /login with spotify/i })).toBeInTheDocument();
    });
  });

  // 2. Golden Path: OAuth callback exchanges code and navigates to main app view
  it('handles callback and navigates to createPlaylist', async () => {
    render(<App />);
    await router.navigate({ to: '/callback', search: { code: 'valid-code' } });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/createPlaylist');
      expect(screen.getByPlaceholderText('Search for an Artist')).toBeInTheDocument();
    });
  });
});
