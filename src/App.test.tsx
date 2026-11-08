import React from 'react';
import { render } from '@testing-library/react';
import { test, expect, vi, beforeEach } from 'vitest';
import App from './App';

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
