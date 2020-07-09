import React, {useState} from 'react';
import {Container, ButtonProps, Button, Icon} from "semantic-ui-react";
import SearchContainer from "./search_container";
import ArtistCard from "./artist_card";
import PlaylistBuilderButtons from "./playlist_builder_buttons";
import {fetchUrl} from "../utils/dev_env";

interface CreatePlaylistContainerProps {
  token: string,
}

const CreatePlaylistContainer = ({token}: CreatePlaylistContainerProps) => {
  const [selectedArtist, setSelectedArtist] = useState({
    external_urls: {},
    followers: {
      total: 0
    },
    genres: [],
    href: '',
    id: '',
    images: [],
    name: '',
    popularity: 0,
    type: '',
    uri: ''
  });
  const [playlistUrl, setPlaylistUrl] = useState('');

  const handleCreatePlaylist = (playlistType) => (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    data: ButtonProps
  )  => {
    const body = JSON.stringify({
      'artistName': selectedArtist.name,
      'artistId': selectedArtist.id,
      'playlistType': playlistType,
      'token': token,
    });
    fetch(`${fetchUrl()}/buildPlaylist`, {
      method: 'post',
      credentials: 'include',
      headers: {'Content-Type':'application/json'},
      body: body
    })
      .then(res => res.json())
      .then((data) => {
        if (data?.playlistUri) {
          setPlaylistUrl(data.playlistUri);
        }
      })
  };

  return (
    <Container>
      <SearchContainer setSelectedArtist={setSelectedArtist} setPlaylistUrl={setPlaylistUrl} token={token}/>
      <PlaylistBuilderButtons artistSelected={!!selectedArtist.name} onCreatePlaylist={handleCreatePlaylist}/>
      {selectedArtist.name && (
        <>
          <ArtistCard
            artistImg={selectedArtist.images[0]}
            artistName={selectedArtist.name}
            artistFollowers={selectedArtist.followers}
            artistGenre={selectedArtist.genres[0]}
          />
          {!!playlistUrl && (
            <div style={{
              marginTop: '2vh'
            }}>
              <a href={playlistUrl} target="_blank" rel="noopener noreferrer">
                <Button>
                  <Icon name='spotify' />
                  Check out your playlist
                </Button>
              </a>
            </div>
          )}
        </>
      )}
    </Container>
  )
};

export default CreatePlaylistContainer;