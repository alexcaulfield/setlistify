import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import NavBar, { getSmallestImageUrl } from './header_card';
import type { SpotifyPrivateUser } from '../api/types.gen';

describe('getSmallestImageUrl', () => {
  test('returns undefined for empty or undefined images', () => {
    expect(getSmallestImageUrl(undefined)).toBeUndefined();
    expect(getSmallestImageUrl([])).toBeUndefined();
  });

  test('returns the url when there is only one image', () => {
    const images = [{ url: 'https://example.com/pic.jpg', width: 300, height: 300 }];
    expect(getSmallestImageUrl(images)).toBe('https://example.com/pic.jpg');
  });

  test('returns the smallest image when images have dimensions in descending order', () => {
    const images = [
      { url: 'https://example.com/large.jpg', width: 300, height: 300 },
      { url: 'https://example.com/small.jpg', width: 64, height: 64 },
    ];
    expect(getSmallestImageUrl(images)).toBe('https://example.com/small.jpg');
  });

  test('returns the smallest image when images have dimensions in ascending order', () => {
    const images = [
      { url: 'https://example.com/small.jpg', width: 64, height: 64 },
      { url: 'https://example.com/large.jpg', width: 300, height: 300 },
    ];
    expect(getSmallestImageUrl(images)).toBe('https://example.com/small.jpg');
  });

  test('returns the smallest image by height if width is missing', () => {
    const images = [
      { url: 'https://example.com/large.jpg', width: 0, height: 300 },
      { url: 'https://example.com/small.jpg', width: 0, height: 64 },
    ];
    expect(getSmallestImageUrl(images)).toBe('https://example.com/small.jpg');
  });

  test('returns the last image when no dimensions are provided (Spotify order)', () => {
    const images = [
      { url: 'https://example.com/large.jpg', width: 0, height: 0 },
      { url: 'https://example.com/small.jpg', width: 0, height: 0 },
    ];
    expect(getSmallestImageUrl(images)).toBe('https://example.com/small.jpg');
  });
});

describe('NavBar', () => {
  const mockUser: SpotifyPrivateUser = {
    id: 'user123',
    display_name: 'Alex C',
    email: 'alex@example.com',
    country: 'US',
    product: 'premium',
    birthdate: '1990-01-01',
    uri: 'spotify:user:user123',
    href: 'https://api.spotify.com/v1/users/user123',
    followers: { href: '', total: 42 },
    external_urls: { spotify: '' },
    images: [
      { url: 'https://example.com/large.jpg', width: 300, height: 300 },
      { url: 'https://example.com/small.jpg', width: 64, height: 64 },
    ],
  };

  test('renders music icon when no user or name is given', () => {
    render(<NavBar name="" />);
    expect(screen.getByLabelText('Setlistify music icon')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /profile/i })).not.toBeInTheDocument();
  });

  test('renders heading with name when name is passed', () => {
    render(<NavBar name="Alex C" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Alex C' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /profile/i })).not.toBeInTheDocument();
  });

  test('renders small user image in top right when user with images is provided', () => {
    render(<NavBar name="Alex C" user={mockUser} />);
    const img = screen.getByRole('img', { name: "Alex C's profile" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/small.jpg');
    expect(img).toHaveClass('rounded-full');
  });

  test('renders user image when userImage prop is explicitly passed', () => {
    render(<NavBar name="Alex C" userImage="https://example.com/explicit.jpg" />);
    const img = screen.getByRole('img', { name: "Alex C's profile" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/explicit.jpg');
  });

  test('does not render an image when user has no images', () => {
    const userWithoutImages: SpotifyPrivateUser = {
      ...mockUser,
      images: [],
    };
    render(<NavBar name="Alex C" user={userWithoutImages} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Alex C' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /profile/i })).not.toBeInTheDocument();
  });
});
