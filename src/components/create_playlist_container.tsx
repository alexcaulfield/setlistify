import React, {useState} from 'react';
import {Container} from "semantic-ui-react";
import SearchContainer from "./search_container";
import ArtistCard from "./artist_card";
import PlaylistBuilderButtons from "./playlist_builder_buttons";

interface CreatePlaylistContainerProps {
  user: object
}

const CreatePlaylistContainer = (props: CreatePlaylistContainerProps) => {
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

  return (
    <Container>
      <SearchContainer setSelectedArtist={setSelectedArtist}/>
      <PlaylistBuilderButtons artistSelected={!!selectedArtist.name}/>
      {selectedArtist.name && (
        <ArtistCard
          artistImg={selectedArtist.images[0]}
          artistName={selectedArtist.name}
          artistFollowers={selectedArtist.followers}
          artistGenre={selectedArtist.genres[0]}
        />
      )}
    </Container>
  )
};

export default CreatePlaylistContainer;