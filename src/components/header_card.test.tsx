import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NavBar, { getSmallestImageUrl } from './header_card';
import type { SpotifyPrivateUser } from '../api/types.gen';

describe('getSmallestImageUrl', () => {
  // 1. Golden Path: valid inputs return expected output (smallest by dimensions)
  it('returns the URL of the smallest image by dimensions', () => {
    const images = [
      { url: 'https://example.com/large.jpg', width: 300, height: 300 },
      { url: 'https://example.com/small.jpg', width: 64, height: 64 },
    ];
    expect(getSmallestImageUrl(images)).toBe('https://example.com/small.jpg');
  });

  // 2. Failure Path: missing or empty collection returns undefined
  it('returns undefined when image collection is empty or undefined', () => {
    expect(getSmallestImageUrl([])).toBeUndefined();
    expect(getSmallestImageUrl(undefined)).toBeUndefined();
  });

  // 3. Edge Case: single image or images with missing dimensions falls back gracefully
  it('falls back to the available image URL when dimensions are missing or single image provided', () => {
    expect(getSmallestImageUrl([{ url: 'https://example.com/single.jpg', width: 0, height: 0 }])).toBe(
      'https://example.com/single.jpg'
    );
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

  // 1. Golden Path: authenticated user with images displays name and avatar
  it('renders user display name and top-right avatar when user with images is provided', () => {
    render(<NavBar user={mockUser} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Alex C' })).toBeInTheDocument();
    const avatar = screen.getByRole('img', { name: "Alex C's profile" });
    expect(avatar).toHaveAttribute('src', 'https://example.com/small.jpg');
    expect(avatar).toHaveClass('rounded-full');
  });

  // 2. Failure / Unauthenticated Path: unauthenticated user displays default icon without avatar
  it('renders default music icon and no avatar when unauthenticated', () => {
    render(<NavBar name="" />);
    expect(screen.getByLabelText('Setlistify music icon')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /profile/i })).not.toBeInTheDocument();
  });

  // 3. Edge Case: authenticated user with empty images array renders name without avatar
  it('renders heading without avatar when user has no images', () => {
    render(<NavBar user={{ ...mockUser, images: [] }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Alex C' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /profile/i })).not.toBeInTheDocument();
  });
});
