import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NavBar from './nav-bar';
import type { SpotifyPrivateUser } from '../api/types.gen';

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

  it('renders music icon on the left, and user display name with avatar on the right when user with images is provided', () => {
    render(<NavBar user={mockUser} />);
    expect(screen.getByLabelText('Setlistify music icon')).toBeInTheDocument();
    expect(screen.getByText('Alex C')).toBeInTheDocument();
    const avatar = screen.getByRole('img', { name: "Alex C's profile" });
    expect(avatar).toHaveAttribute('src', 'https://example.com/small.jpg');
    expect(avatar).toHaveClass('rounded-full');
  });

  it('renders music icon and no user profile details when unauthenticated', () => {
    render(<NavBar name="" />);
    expect(screen.getByLabelText('Setlistify music icon')).toBeInTheDocument();
    expect(screen.queryByText('Alex C')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /profile/i })).not.toBeInTheDocument();
  });

  it('renders music icon and display name without avatar when user has no images', () => {
    render(<NavBar user={{ ...mockUser, images: [] }} />);
    expect(screen.getByLabelText('Setlistify music icon')).toBeInTheDocument();
    expect(screen.getByText('Alex C')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /profile/i })).not.toBeInTheDocument();
  });

  it('renders account menu trigger and calls onLogout when Log out is clicked', () => {
    const onLogout = vi.fn();
    render(<NavBar user={mockUser} onLogout={onLogout} />);

    const trigger = screen.getByRole('button', { name: /account menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Alex C');

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    logoutButton.click();
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
