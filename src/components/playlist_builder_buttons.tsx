import React, {useState} from 'react';
import {Container, Dropdown, DropdownProps, Button} from "semantic-ui-react";

const playlistOptions = [
  {value: 'Setlist', text: 'Setlist'},
  {value: 'Producer', text: 'Producer'},
  {value: 'Songwriter', text: 'Songwriter'},
];

interface PlaylistBuilderButtonsProps {
  artistSelected: boolean
}

const PlaylistBuilderButtons = ({artistSelected}: PlaylistBuilderButtonsProps) => {
  const [playlistType, setPlaylistType] = useState('');

  const handlePlaylistTypeSelect = (
    e: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ) => {
    if (data?.value) {
      setPlaylistType(data.value.toString());
    }
  };

  const canCreatePlaylist = artistSelected && !!playlistType
  return (
    <Container>
      <div style={{
        display: 'inline-flex',
        marginTop: '2vh'
      }}>
        <Dropdown
          placeholder='Type of Playlist'
          selection
          options={playlistOptions}
          onChange={handlePlaylistTypeSelect}
          value={playlistType}
        />
        <Container>
          <Button disabled={!canCreatePlaylist}>Create Playlist</Button>
        </Container>
      </div>
    </Container>
  )
};

export default PlaylistBuilderButtons;