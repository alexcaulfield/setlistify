import React, {useState} from 'react';
import {Dropdown, DropdownProps, Container, DropdownOnSearchChangeData} from "semantic-ui-react";
import {fetchUrl} from "../utils/dev_env";

interface SearchContainerProps {
  setSelectedArtist: (object) => void,
  setPlaylistUrl: (string) => void
}

const SearchContainer = ({setSelectedArtist, setPlaylistUrl}: SearchContainerProps) => {
  const [searchOptions, setSearchOptions] = useState([]);
  const [value, setValue] = useState('');

  // get artist info
  const handleResultSelect = (
    e: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ): void => {
    if (data?.value) {
      const body = JSON.stringify({
        'query': data.value,
        'limit': 1, // get that artist
      });
      fetch(`${fetchUrl()}/artistSearch`, {
        method: 'post',
        credentials: 'same-origin',
        headers: {'Content-Type':'application/json'},
        body: body
      })
        .then(res => res.json())
        .then(({artists}) => {
          setSelectedArtist(artists[0]);
          setValue(artists[0].name);
          setPlaylistUrl('');
        })
    }
  };

  // get autocomplete results
  const handleSearchChange = (
    e: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownOnSearchChangeData
  ): void => {
    if (data?.searchQuery) {
      const body = JSON.stringify({
        'query': data.searchQuery,
        'limit': 5, // amount of autocomplete results to return
      });
      fetch(`${fetchUrl()}/artistSearch`, {
        method: 'post',
        credentials: 'same-origin',
        headers: {'Content-Type':'application/json'},
        body: body
      })
        .then(res => res.json())
        .then(({artists}) => {
          const results = artists.map(artistObj => {
            return {
              value: artistObj.name,
              text: artistObj.name,
            }
          });
          setSearchOptions(results);
        })
    }
  };

  return (
    <Container>
      <Dropdown
        placeholder='Search for an Artist'
        fluid
        search
        selection
        onChange={handleResultSelect}
        onSearchChange={handleSearchChange}
        options={searchOptions}
        value={value}
        clearable
      />
    </Container>
  )
};

export default SearchContainer;