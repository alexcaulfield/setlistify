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

test('renders user avatar in NavBar when user has images', async () => {
  vi.mocked(globalThis.fetch).mockImplementation((url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    if (urlString.includes('/getUser')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            token: 'test-token',
            user: {
              display_name: 'cauf',
              id: 'cauf',
              images: [
                { url: 'https://example.com/large.jpg', width: 300, height: 300 },
                { url: 'https://example.com/small.jpg', width: 64, height: 64 },
              ],
            },
          }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
  });

  render(<App />);
  await router.navigate({ to: '/callback', search: { code: 'code-with-image' } });

  await waitFor(() => {
    const avatar = screen.getByRole('img', { name: "cauf's profile" });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/small.jpg');
  });
});
