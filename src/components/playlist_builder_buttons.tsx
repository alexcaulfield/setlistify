import React, { useState } from 'react';

const playlistOptions = [
  { value: 'Setlist', text: 'Setlist' },
];

interface PlaylistBuilderButtonsProps {
  artistSelected: boolean;
  onCreatePlaylist: (playlistType: string) => () => void;
}

const PlaylistBuilderButtons = ({
  artistSelected,
  onCreatePlaylist,
}: PlaylistBuilderButtonsProps) => {
  const [playlistType, setPlaylistType] = useState('Setlist');

  const canCreatePlaylist = artistSelected && Boolean(playlistType);

  return (
    <div className="mx-auto mt-6 flex max-w-md flex-col items-center justify-center gap-4 sm:flex-row">
      <div className="w-full sm:w-auto">
        <label htmlFor="playlist-type-select" className="sr-only">
          Type of Playlist
        </label>
        <select
          id="playlist-type-select"
          value={playlistType}
          onChange={(e) => setPlaylistType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-44"
        >
          {playlistOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.text}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={!canCreatePlaylist}
        onClick={onCreatePlaylist(playlistType)}
        className="w-full rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 sm:w-auto"
      >
        Create Playlist
      </button>
    </div>
  );
};

export default PlaylistBuilderButtons;
