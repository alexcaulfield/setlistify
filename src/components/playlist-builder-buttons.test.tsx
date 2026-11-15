import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PlaylistBuilderButtons from './playlist-builder-buttons';

describe('PlaylistBuilderButtons', () => {
  it('renders enabled button and calls onCreatePlaylist when clicked', async () => {
    const user = userEvent.setup();
    const onCreatePlaylist = vi.fn();

    render(
      <PlaylistBuilderButtons
        artistSelected={true}
        onCreatePlaylist={onCreatePlaylist}
      />
    );

    const button = screen.getByRole('button', { name: /create playlist/i });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onCreatePlaylist).toHaveBeenCalledTimes(1);
  });

  it('renders disabled button with spinner when loading', async () => {
    const user = userEvent.setup();
    const onCreatePlaylist = vi.fn();

    render(
      <PlaylistBuilderButtons
        artistSelected={true}
        onCreatePlaylist={onCreatePlaylist}
        isLoading={true}
      />
    );

    const button = screen.getByRole('button', { name: /building playlist/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await user.click(button);
    expect(onCreatePlaylist).not.toHaveBeenCalled();
  });

  it('renders disabled button when artistSelected is false', () => {
    const onCreatePlaylist = vi.fn();

    render(
      <PlaylistBuilderButtons
        artistSelected={false}
        onCreatePlaylist={onCreatePlaylist}
      />
    );

    const button = screen.getByRole('button', { name: /create playlist/i });
    expect(button).toBeDisabled();
  });
});
