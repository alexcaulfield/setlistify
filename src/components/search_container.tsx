import React, {useState} from 'react';
import {Dropdown, DropdownProps, Container, DropdownOnSearchChangeData} from "semantic-ui-react";
import {fetchUrl} from "../utils/dev_env";

interface SearchContainerProps {
  setSelectedArtist: (object) => void,
  setPlaylistUrl: (string) => void,
  token: string,
  setConcertId: (string) => void,
  setArtistMbid: (string) => void,
}

const SearchContainer = ({setSelectedArtist, setPlaylistUrl, token, setConcertId, setArtistMbid}: SearchContainerProps) => {
  const [searchOptions, setSearchOptions] = useState([]);
  const [value, setValue] = useState('');
  const [setlists, setSetlists] = useState([]);

  const formatSetlists = ({artistSetlists}) => {
    if (!artistSetlists || !Array.isArray(artistSetlists)) return [];
    return artistSetlists.reduce((setlists, setlist) => {
      const sets = setlist?.sets?.set;
      const setsArray = Array.isArray(sets) ? sets : [];
      if (setsArray.length > 0) {
        const dateSplit = (setlist?.eventDate || '').split('-');
        // Count songs across all sets (main set + encores)
        const totalSongs = setsArray.reduce(
          (count, s) => count + (Array.isArray(s?.song) ? s.song.length : 0),
          0
        );
        if (totalSongs > 0) {
          const venueCity = setlist?.venue?.city?.name || 'Unknown City';
          const venueCountry = setlist?.venue?.city?.country?.name || '';
          const location = venueCountry ? `${venueCity}, ${venueCountry}` : venueCity;
          const formattedDate = dateSplit.length === 3 ? `${dateSplit[0]}/${dateSplit[1]}/${dateSplit[2]}` : (setlist?.eventDate || '');
          return [
            ...setlists,
            // formats for Semantic UI Dropdown
            {
              // Date, Location, Songs
              text: `${formattedDate} - ${location} - ${totalSongs} Songs`,
              value: setlist.id,
            }
          ];
        }
      }
      return setlists;
    }, []);
  };

  // get artist info
  const handleResultSelect = (
    e: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ): void => {
    if (data?.value) {
      const body = JSON.stringify({
        query: data.value,
        limit: 1, // get that artist
        token: token,
      });
      fetch(`${fetchUrl()}/artistSearch`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: body
      })
        .then(res => res.json())
        .then(({artists}) => {
          setSelectedArtist(artists[0]);
          setValue(artists[0].name);
          setPlaylistUrl('');
        })
      // Reset MBID and setlists when a new artist is selected
      setArtistMbid('');
      fetch(`${fetchUrl()}/artistSetlists`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({artistName: data.value})
      })
        .then(res => res.json())
        .then((result) => {
          // Store the resolved MBID so buildPlaylist can use it directly
          if (result.artistMbid) {
            setArtistMbid(result.artistMbid);
          }
          setSetlists(formatSetlists(result));
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
        query: data.searchQuery,
        limit: 5, // amount of autocomplete results to return
        token: token,
      });
      fetch(`${fetchUrl()}/artistSearch`, {
        method: 'POST',
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

  const handleConcertSelect = (
    e: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ): void => {
    if (data?.value) {
      setConcertId(data.value.toString())
    }
  }

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
      {setlists.length > 0 && (
        <div style={{
          marginTop: '8px',
          width: '100%'
        }}>
          <Dropdown
            selection
            placeholder='Pick a concert to Setlistify'
            options={setlists}
            onChange={handleConcertSelect}
          />
        </div>
      )}
    </Container>
  )
};

export default SearchContainer;