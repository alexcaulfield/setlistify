import React from 'react';
import { Loader2 } from 'lucide-react';

interface PlaylistBuilderButtonsProps {
  artistSelected: boolean;
  onCreatePlaylist: () => void;
  isLoading?: boolean;
}

const PlaylistBuilderButtons = ({
  artistSelected,
  onCreatePlaylist,
  isLoading = false,
}: PlaylistBuilderButtonsProps) => {
  const canCreatePlaylist = artistSelected && !isLoading;

  return (
    <div className="mx-auto mt-6 flex max-w-md flex-col items-center justify-center gap-4 sm:flex-row">
      <button
        type="button"
        disabled={!canCreatePlaylist}
        aria-busy={isLoading}
        onClick={onCreatePlaylist}
        className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 sm:w-auto"
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        <span>{isLoading ? 'Building playlist...' : 'Create Playlist'}</span>
      </button>
    </div>
  );
};

export default PlaylistBuilderButtons;
