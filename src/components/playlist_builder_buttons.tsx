import React, {useState} from 'react';
import {Container, Dropdown, DropdownProps, Button, ButtonProps} from "semantic-ui-react";

const playlistOptions = [
  {value: 'Setlist', text: 'Setlist'},
  // {value: 'Producer', text: 'Producer'},
  // {value: 'Songwriter', text: 'Songwriter'},
];

interface PlaylistBuilderButtonsProps {
  artistSelected: boolean,
  onCreatePlaylist: (string) => (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    data: ButtonProps
  ) => void
}

const PlaylistBuilderButtons = ({artistSelected, onCreatePlaylist}: PlaylistBuilderButtonsProps) => {
  const [playlistType, setPlaylistType] = useState('Setlist');

  const handlePlaylistTypeSelect = (
    e: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ) => {
    if (data?.value) {
      setPlaylistType(data.value.toString());
    }
  };

  const canCreatePlaylist = artistSelected && !!playlistType;
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
          <Button
            disabled={!canCreatePlaylist}
            onClick={onCreatePlaylist(playlistType)}
          >
            Create Playlist
          </Button>
        </Container>
      </div>
    </Container>
  )
};

export default PlaylistBuilderButtons;