import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { test, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { router } from './components/app_routing';

beforeEach(() => {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/authUrl')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            authUrl: 'https://accounts.spotify.com/authorize',
            cachePath: '',
          }),
      } as Response);
    }
    if (typeof url === 'string' && url.includes('/getUser')) {
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

test('renders app component without crashing', () => {
  const { container } = render(<App />);
  expect(container.firstChild).toBeInTheDocument();
});

test('handles callback and navigates to createPlaylist', async () => {
  render(<App />);
  await router.navigate({ to: '/callback', search: { code: 'valid-code' } });

  // Wait for the createPlaylist page to render
  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/createPlaylist');
    expect(screen.getByPlaceholderText('Search for an Artist')).toBeInTheDocument();
  });
});
