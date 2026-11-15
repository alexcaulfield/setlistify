import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isTokenExpired,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStoredAuth,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
} from './auth';
import type { SpotifyPrivateUser } from '../api/types.gen';

function createMockJwt(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp: expSeconds, access_token: 'abc' }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

describe('auth utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('isTokenExpired', () => {
    it('returns true for empty string', () => {
      expect(isTokenExpired('')).toBe(true);
    });

    it('returns false for mock non-JWT token', () => {
      expect(isTokenExpired('simple-token')).toBe(false);
    });

    it('returns true for expired JWT', () => {
      const pastSeconds = Math.floor(Date.now() / 1000) - 300;
      const expiredJwt = createMockJwt(pastSeconds);
      expect(isTokenExpired(expiredJwt)).toBe(true);
    });

    it('returns false for active JWT', () => {
      const futureSeconds = Math.floor(Date.now() / 1000) + 3600;
      const activeJwt = createMockJwt(futureSeconds);
      expect(isTokenExpired(activeJwt)).toBe(false);
    });
  });

  describe('getStoredToken and setStoredToken', () => {
    it('saves and retrieves valid token', () => {
      setStoredToken('test-token');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('test-token');
      expect(getStoredToken()).toBe('test-token');
    });

    it('removes token when empty string passed to setStoredToken', () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'test-token');
      setStoredToken('');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });

    it('clears and returns empty string if stored token is expired', () => {
      const pastSeconds = Math.floor(Date.now() / 1000) - 60;
      const expiredJwt = createMockJwt(pastSeconds);
      localStorage.setItem(TOKEN_STORAGE_KEY, expiredJwt);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 'user' }));

      expect(getStoredToken()).toBe('');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    });
  });

  describe('getStoredUser and setStoredUser', () => {
    const mockUser: SpotifyPrivateUser = {
      id: 'alex',
      display_name: 'Alex C',
      email: 'alex@example.com',
      country: 'US',
      product: 'premium',
      birthdate: '1990-01-01',
      uri: 'spotify:user:alex',
      href: 'https://api.spotify.com/v1/users/alex',
      followers: { href: '', total: 0 },
      external_urls: { spotify: '' },
      images: [],
    };

    it('saves and retrieves user object', () => {
      setStoredUser(mockUser);
      expect(getStoredUser()).toEqual(mockUser);
    });

    it('removes user when null passed', () => {
      setStoredUser(mockUser);
      setStoredUser(null);
      expect(getStoredUser()).toBeNull();
    });

    it('handles malformed json gracefully', () => {
      localStorage.setItem(USER_STORAGE_KEY, 'not-valid-json{');
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('clearStoredAuth', () => {
    it('removes both token and user', () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'token');
      localStorage.setItem(USER_STORAGE_KEY, '{}');
      clearStoredAuth();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    });
  });
});
