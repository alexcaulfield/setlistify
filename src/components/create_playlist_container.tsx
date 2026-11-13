import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import SearchContainer from './search_container';
import ArtistCard from './artist_card';
import PlaylistBuilderButtons from './playlist_builder_buttons';
import { buildPlaylist } from '../api/setlistify';
import type { SpotifyFullArtist } from '../api/types.gen';
import { SpotifyIcon } from './spotify_icon';

interface CreatePlaylistContainerProps {
  token: string;
}

const emptyArtist: SpotifyFullArtist = {
  name: '',
  id: '',
  uri: '',
  href: '',
  external_urls: {},
  popularity: 0,
  genres: [],
  followers: { total: 0, href: '' },
  images: [],
};

const CreatePlaylistContainer = ({ token }: CreatePlaylistContainerProps) => {
  const [selectedArtist, setSelectedArtist] = useState<SpotifyFullArtist>(emptyArtist);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [concertId, setConcertId] = useState('');
  const [artistMbid, setArtistMbid] = useState('');

  const buildMutation = useMutation({
    mutationFn: buildPlaylist,
    onSuccess: (data) => {
      if (data?.playlistUri) {
        setPlaylistUrl(data.playlistUri);
      }
    },
  });

  const handleCreatePlaylist = (playlistType: string) => () => {
    buildMutation.mutate({
      artistName: selectedArtist.name,
      artistId: selectedArtist.id,
      playlistType: playlistType,
      token: token,
      playlistId: concertId,
      artistMbid: artistMbid,
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <SearchContainer
        setSelectedArtist={setSelectedArtist}
        setPlaylistUrl={setPlaylistUrl}
        token={token}
        setConcertId={setConcertId}
        setArtistMbid={setArtistMbid}
      />

      <PlaylistBuilderButtons
        artistSelected={Boolean(selectedArtist.name && concertId)}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {buildMutation.isPending && (
        <p className="mt-4 text-center text-sm font-medium text-gray-500">
          Building your playlist...
        </p>
      )}

      {buildMutation.isError && (
        <p className="mt-4 text-center text-sm font-medium text-red-600">
          Error creating playlist. Please try again.
        </p>
      )}

      {Boolean(selectedArtist.name) && (
        <div className="mt-6 space-y-6">
          <ArtistCard
            artistImg={selectedArtist.images?.[0]}
            artistName={selectedArtist.name}
            artistFollowers={selectedArtist.followers ?? { total: 0 }}
            artistGenre={selectedArtist.genres?.[0] ?? ''}
          />

          {Boolean(playlistUrl) && (
            <div className="flex justify-center">
              <a
                href={playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-6 py-3 font-semibold text-white shadow-md transition hover:bg-[#1ed760] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DB954]"
              >
                <SpotifyIcon />
                <span>Check out your playlist</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatePlaylistContainer;
