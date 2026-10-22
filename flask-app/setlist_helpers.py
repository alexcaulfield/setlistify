# Helper functions for setlist.fm data processing

def safe_get(dct, *keys):
    """Safely gets value from a nested dict."""
    for key in keys:
        if not isinstance(dct, dict):
            return None
        try:
            dct = dct[key]
        except (KeyError, TypeError):
            return None
    return dct

def setlist_has_songs(setlist):
    """Check if a setlist has at least one actual song."""
    sets = safe_get(setlist, 'sets', 'set')
    if not sets or not isinstance(sets, list):
        return False
    for s in sets:
        if isinstance(s, dict):
            songs = s.get('song')
            if isinstance(songs, list) and len(songs) > 0:
                return True
    return False

def extract_songs_from_setlist(setlistObject):
    """Extract all song names across all sets and encores from a setlist object."""
    if not setlistObject:
        return []
    sets = safe_get(setlistObject, 'sets', 'set') or []
    songs = []
    for s in sets:
        for song in s.get('song', []):
            if isinstance(song, dict) and song.get('name'):
                songs.append(song.get('name'))
            elif isinstance(song, str):
                songs.append(song)
    return songs

def pick_setlist_by_id(setlists, id):
    """Return the item from the object from the given setlist."""
    for setlistObject in setlists:
        if setlistObject.get('id') == id:
            sets = safe_get(setlistObject, 'sets', 'set')
            if sets:
                setlistData = dict()
                # Collect songs across all sets (main set + encores)
                all_songs = []
                for s in sets:
                    all_songs.extend(s.get('song', []))
                setlistData['songs'] = all_songs
                setlistData['date'] = setlistObject.get('eventDate')
                return setlistData
    return {}

def pick_most_recent_setlist(setlists):
    for setlistObject in setlists:
        sets = safe_get(setlistObject, 'sets', 'set')
        if sets:
            # Collect songs across all sets (main set + encores)
            all_songs = []
            for s in sets:
                all_songs.extend(s.get('song', []))
            return all_songs
    return {}

