import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Loader2 } from 'lucide-react';
import { searchArtists, fetchArtistSetlists } from '../api/setlistify';
import type { SpotifyFullArtist, Setlist } from '../api/types.gen';

interface FormattedSetlistOption {
  text: string;
  value: string;
}

interface SearchContainerProps {
  setSelectedArtist: (artist: SpotifyFullArtist) => void;
  setPlaylistUrl: (url: string) => void;
  token: string;
  setConcertId: (id: string) => void;
  setArtistMbid: (mbid: string) => void;
}

function formatSetlists(artistSetlists: Setlist[]): FormattedSetlistOption[] {
  if (!artistSetlists || !Array.isArray(artistSetlists)) return [];
  return artistSetlists.reduce<FormattedSetlistOption[]>((acc, setlist) => {
    const sets = setlist?.sets?.set;
    const setsArray = Array.isArray(sets) ? sets : [];
    if (setsArray.length > 0) {
      const dateSplit = (setlist?.eventDate || '').split('-');
      const totalSongs = setsArray.reduce(
        (count, s) => count + (Array.isArray(s?.song) ? s.song.length : 0),
        0
      );
      if (totalSongs > 0) {
        const venueCity = setlist?.venue?.city?.name || 'Unknown City';
        const venueCountry = setlist?.venue?.city?.country?.name || '';
        const location = venueCountry ? `${venueCity}, ${venueCountry}` : venueCity;

        let formattedDate = setlist?.eventDate || '';
        if (dateSplit.length === 3) {
          const [day, month, year] = dateSplit.map(Number);
          const dateObj = new Date(year, month - 1, day);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          }
        }

        acc.push({
          text: `${formattedDate} - ${location} - ${totalSongs} Songs`,
          value: setlist.id,
        });
      }
    }
    return acc;
  }, []);
}

const SearchContainer = ({
  setSelectedArtist,
  setPlaylistUrl,
  token,
  setConcertId,
  setArtistMbid,
}: SearchContainerProps) => {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtistName, setSelectedArtistName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Query artists
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['artistSearch', searchQuery, token],
    queryFn: () => searchArtists({ query: searchQuery, limit: 5, token }),
    enabled: Boolean(searchQuery && token),
    staleTime: 1000 * 60 * 5,
  });

  // Query setlists for selected artist
  const { data: setlistsData, isLoading: isLoadingSetlists } = useQuery({
    queryKey: ['artistSetlists', selectedArtistName],
    queryFn: () => fetchArtistSetlists({ artistName: selectedArtistName, artistMbid: '' }),
    enabled: Boolean(selectedArtistName),
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (setlistsData?.artistMbid) {
      setArtistMbid(setlistsData.artistMbid);
    }
  }, [setlistsData, setArtistMbid]);

  const setlists = React.useMemo(() => {
    return formatSetlists(setlistsData?.artistSetlists ?? []);
  }, [setlistsData]);

  const artists = searchResults?.artists ?? [];

  const handleSelectArtist = (artist: SpotifyFullArtist) => {
    setSelectedArtist(artist);
    setInputValue(artist.name);
    setSelectedArtistName(artist.name);
    setPlaylistUrl('');
    setConcertId('');
    setArtistMbid('');
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
    setSelectedArtistName('');
    setPlaylistUrl('');
    setConcertId('');
    setArtistMbid('');
    setIsDropdownOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-4">
      <div className="relative">
        <label htmlFor="artist-search" className="sr-only">
          Search for an Artist
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          id="artist-search"
          type="text"
          role="combobox"
          aria-expanded={isDropdownOpen && artists.length > 0}
          aria-autocomplete="list"
          aria-controls="artist-search-results"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => {
            if (artists.length > 0) {
              setIsDropdownOpen(true);
            }
          }}
          onBlur={() => {
            // Short timeout to allow click on dropdown item to register
            setTimeout(() => setIsDropdownOpen(false), 200);
          }}
          placeholder="Search for an Artist"
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-10 text-sm shadow-sm transition hover:border-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label="Clear artist search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {isDropdownOpen && artists.length > 0 && (
          <ul
            id="artist-search-results"
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
          >
            {artists.map((artist) => (
              <li
                key={artist.id}
                role="option"
                aria-selected={artist.name === selectedArtistName}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents input blur before click registers
                  handleSelectArtist(artist);
                }}
                className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-gray-800 transition hover:bg-emerald-50 hover:text-emerald-900"
              >
                {artist.images?.[0]?.url ? (
                  <img
                    src={artist.images[0].url}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gray-200" />
                )}
                <span className="font-medium">{artist.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLoadingSetlists && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Fetching concerts from Setlist.fm...</span>
        </div>
      )}

      {setlists.length > 0 && (
        <div>
          <label htmlFor="concert-select" className="sr-only">
            Pick a concert to Setlistify
          </label>
          <select
            id="concert-select"
            defaultValue=""
            onChange={(e) => setConcertId(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="" disabled>
              Pick a concert to Setlistify
            </option>
            {setlists.map((s) => (
              <option key={s.value} value={s.value}>
                {s.text}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default SearchContainer;
