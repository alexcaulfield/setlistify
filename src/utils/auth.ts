import type { SpotifyPrivateUser } from '../api/types.gen';

export const TOKEN_STORAGE_KEY = 'setlistify_token';
export const USER_STORAGE_KEY = 'setlistify_user';

/**
 * Checks whether a JWT token is expired based on its 'exp' claim.
 * Non-JWT strings (such as mock tokens in tests) are treated as not expired.
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000 <= Date.now();
    }
    return false;
  } catch {
    return false;
  }
}

export function getStoredToken(): string {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (token && isTokenExpired(token)) {
      clearStoredAuth();
      return '';
    }
    return token;
  } catch {
    return '';
  }
}

export function getStoredUser(): SpotifyPrivateUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SpotifyPrivateUser;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save token to localStorage:', err);
  }
}

export function setStoredUser(user: SpotifyPrivateUser | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save user to localStorage:', err);
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear auth from localStorage:', err);
  }
}
