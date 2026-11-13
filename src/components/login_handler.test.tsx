import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginHandler from './login_handler';
import * as api from '../api/setlistify';

vi.mock('../api/setlistify', () => ({
  exchangeCodeForUser: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('LoginHandler', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  test('calls setToken, setUser, handleLogin and navigates to /createPlaylist on success', async () => {
    const handleLogin = vi.fn();
    const setUser = vi.fn();
    const setToken = vi.fn();

    // Set code in window.location.search
    delete (window as any).location;
    (window as any).location = new URL('http://127.0.0.1:3000/callback?code=test-code');

    vi.mocked(api.exchangeCodeForUser).mockResolvedValueOnce({
      token: 'jwt-token-123',
      user: {
        display_name: 'Alex',
        id: 'alex123',
        images: [],
        followers: { total: 0, href: null },
        external_urls: { spotify: '' },
        href: '',
        uri: '',
      } as any,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LoginHandler
          handleLogin={handleLogin}
          setUser={setUser}
          setToken={setToken}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(setUser).toHaveBeenCalled();
      expect(setToken).toHaveBeenCalledWith('jwt-token-123');
      expect(handleLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/createPlaylist', replace: true });
    });
  });
});
