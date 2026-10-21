import os
from flask import Flask, redirect, url_for, session, request, jsonify, Response, json
from dotenv import load_dotenv
import spotipy
import spotipy.util as util
from spotipy import oauth2
from repertorio import Repertorio
from collections import OrderedDict
import requests
import boto3
from decouple import config
from flask_cors import CORS, cross_origin
from flask_session import Session
import jwt
import base64
import uuid

# Helper functions
# Safely gets from nested dict
# https://stackoverflow.com/questions/25833613/python-safe-method-to-get-value-of-nested-dictionary
def safe_get(dct, *keys):
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

ARTIST_MBID_CACHE = {}

IS_OFFLINE = os.environ.get('IS_OFFLINE')

# Setting secret keys based on environment
SPOTIFY_CLIENT_ID     = config('SPOTIFY_CLIENT_ID')     if IS_OFFLINE else os.environ['SPOTIFY_CLIENT_ID']
SPOTIFY_CLIENT_SECRET = config('SPOTIFY_CLIENT_SECRET') if IS_OFFLINE else os.environ['SPOTIFY_CLIENT_SECRET']
APP_SECRET_KEY        = config('APP_SECRET_KEY')        if IS_OFFLINE else os.environ['APP_SECRET_KEY']
SETLIST_FM_API_KEY    = config('SETLIST_FM_API_KEY')    if IS_OFFLINE else os.environ['SETLIST_FM_API_KEY']

# Setting URLs based on environment
SETLISTIFY_CLIENT_BASE = 'http://127.0.0.1:3000' if IS_OFFLINE else 'https://setlistify.app'
REDIRECT_URI           = f"{SETLISTIFY_CLIENT_BASE}/callback"

SPOTIFY_API_BASE = 'https://accounts.spotify.com'

SCOPE = 'playlist-modify-public'

# Set this to True for testing but you probably want it set to False in production.
SHOW_DIALOG = True # if IS_OFFLINE else False

app = Flask(__name__)
app.debug = True
app.config['SECRET_KEY'] = APP_SECRET_KEY
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)
CORS(app, supports_credentials=True)
setlistApi = Repertorio(SETLIST_FM_API_KEY)

# Begin API Endpoints

# Get Spotify Auth URL
# params: none
# returns: string authUrl
@app.route("/authUrl")
@cross_origin(['www.setlistify.app'])
def verify():
    cache_path=f'.cache/.spotipyoauthcache{uuid.uuid4()}'
    auth_manager = spotipy.oauth2.SpotifyOAuth(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI, scope=SCOPE, cache_path=cache_path)
    authUrl = auth_manager.get_authorize_url()
    return jsonify({
        'authUrl': authUrl,
        'cachePath':cache_path
    })

# authorization-code-flow Step 2.
# Have your application request refresh and access tokens;
# Spotify returns access and refresh tokens
# params: string code
# returns: dict results (representing user object from Spotify API)
@app.route("/getUser", methods=['POST'])
@cross_origin(['www.setlistify.app'])
def get_user():
    session.clear()
    code = request.json.get('code')
    cache_path = request.json.get('cache_path')
    print(cache_path)

    auth_manager = spotipy.oauth2.SpotifyOAuth(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI, scope=SCOPE, cache_path=cache_path)
    access_token = auth_manager.get_access_token(code)
    encoded_access_token = jwt.encode(access_token, APP_SECRET_KEY, algorithm='HS256')

    spotify = spotipy.Spotify(auth=access_token.get('access_token'))
    data = spotify.current_user()

    return jsonify({
        'user': data,
        'token': encoded_access_token
    })

# get results for search query from Spotify API
# params: string artist query, int limit
# returns: array of artist results
@app.route('/artistSearch', methods=['POST'])
@cross_origin(['www.setlistify.app'])
def get_artist_results():
    token        = request.json.get('token')
    token_object = jwt.decode(token, APP_SECRET_KEY, algorithms=['HS256'])
    access_token = token_object.get('access_token')

    query        = request.json.get('query')
    query_limit  = request.json.get('limit')

    spotify = spotipy.Spotify(auth=access_token)

    results = spotify.search(q='artist:' + query, type='artist', limit=query_limit)
    return jsonify({'artists': results['artists']['items']})

# search setlist.fm artists
# params: string artistName
# returns: array of setlist.fm artist candidates with mbid and disambiguation
@app.route('/setlistArtists', methods=['POST'])
@cross_origin(['www.setlistify.app'])
def get_setlist_artists():
    artistName = request.json.get('artistName')
    if not artistName:
        return jsonify({'artists': []})
    try:
        artistsData = setlistApi.artists(artistName=artistName, sort='relevance')
        return jsonify({'artists': artistsData.get('artist', [])})
    except Exception as e:
        app.logger.error(f"Error searching artists on setlist.fm: {e}")
        return jsonify({'artists': [], 'error': str(e)}), 500

# get artist setlists
# params: string artistName (optional), string artistMbid (optional)
# returns: array of setlists
@app.route('/artistSetlists', methods=['POST'])
@cross_origin(['www.setlistify.app'])
def get_artist_setlists():
    artistName = request.json.get('artistName')
    artistMbid = request.json.get('artistMbid')

    # 1. If artist MBID is provided, fetch directly for that explicit artist
    if artistMbid:
        try:
            artistSetlistsData = setlistApi.artist_setlists(pk=artistMbid)
            setlists = artistSetlistsData.get('setlist', []) if isinstance(artistSetlistsData, dict) else []
            if artistName:
                ARTIST_MBID_CACHE[artistName.strip().lower()] = artistMbid
            return jsonify({'artistSetlists': setlists, 'artistMbid': artistMbid})
        except Exception as e:
            app.logger.info(f"Setlists not found or error for MBID {artistMbid}: {e}")

    # 2. If artistName is provided, find the matching artist entity on setlist.fm that has setlists
    if artistName:
        cache_key = artistName.strip().lower()
        if cache_key in ARTIST_MBID_CACHE:
            cached_mbid = ARTIST_MBID_CACHE[cache_key]
            try:
                artistSetlistsData = setlistApi.artist_setlists(pk=cached_mbid)
                setlists = artistSetlistsData.get('setlist', []) if isinstance(artistSetlistsData, dict) else []
                if setlists:
                    return jsonify({'artistSetlists': setlists, 'artistMbid': cached_mbid})
            except Exception as e:
                app.logger.debug(f"Cached MBID {cached_mbid} fetch failed, falling back to search: {e}")
                ARTIST_MBID_CACHE.pop(cache_key, None)

        try:
            # Sort by relevance to surface notable matching artists first
            artistSearchData = setlistApi.artists(artistName=artistName, sort='relevance')
            artists = artistSearchData.get('artist', []) if isinstance(artistSearchData, dict) else []
            if artists:
                # Group exact name matches first
                exact_matches = [
                    a for a in artists
                    if a.get('name', '').strip().lower() == cache_key
                ]
                # Prioritize exact matches, but cap check to at most 3 candidates to avoid rate limits
                candidates = (exact_matches if exact_matches else artists)[:3]

                best_setlists = []
                best_mbid = None

                for candidate in candidates:
                    mbid = candidate.get('mbid')
                    if not mbid:
                        continue
                    try:
                        data = setlistApi.artist_setlists(pk=mbid)
                        candidate_setlists = data.get('setlist', []) if isinstance(data, dict) else []
                        has_songs = any(setlist_has_songs(s) for s in candidate_setlists)
                        if has_songs:
                            ARTIST_MBID_CACHE[cache_key] = mbid
                            return jsonify({'artistSetlists': candidate_setlists, 'artistMbid': mbid})
                        elif candidate_setlists and not best_setlists:
                            best_setlists = candidate_setlists
                            best_mbid = mbid
                    except Exception as err:
                        # 404 is standard for setlist.fm when an artist has 0 setlists
                        app.logger.debug(f"Setlists check for MBID {mbid}: {err}")
                        continue

                if best_setlists:
                    if best_mbid:
                        ARTIST_MBID_CACHE[cache_key] = best_mbid
                    return jsonify({'artistSetlists': best_setlists, 'artistMbid': best_mbid})
        except Exception as e:
            app.logger.warning(f"Error searching artists on setlist.fm: {e}")

        # Fallback to search endpoint by artistName directly
        try:
            artistSetlistsData = setlistApi.setlists(artistName=artistName)
            raw_setlists = artistSetlistsData.get('setlist', []) if isinstance(artistSetlistsData, dict) else []
            # Filter out setlists from unrelated artists (e.g. venues in Lawrence, KS with Dave East)
            filtered = [
                s for s in raw_setlists
                if cache_key in (safe_get(s, 'artist', 'name') or '').strip().lower()
            ]
            return jsonify({'artistSetlists': filtered if filtered else raw_setlists})
        except Exception as e:
            app.logger.error(f"Error fetching setlists by name '{artistName}': {e}")
            return jsonify({'artistSetlists': []})

    return jsonify({'artistSetlists': []})

# Build a playlist
# params: string playlist type, string artist name, string playlistId (setlist ID), optional string artistMbid
# returns: playlist URI
@app.route('/buildPlaylist', methods=['POST'])
@cross_origin(['www.setlistify.app'])
def build_playlist():
    token        = request.json.get('token')
    token_object = jwt.decode(token, APP_SECRET_KEY, algorithms=['HS256'])
    access_token = token_object.get('access_token')

    artistName   = request.json.get('artistName')
    artistId     = request.json.get('artistId')
    playlistType = request.json.get('playlistType')
    playlistId   = request.json.get('playlistId')
    artistMbid   = request.json.get('artistMbid')

    spotify = spotipy.Spotify(auth=access_token)
    user = spotify.current_user()

    songs = []
    if playlistType == 'Setlist':
        # Fetch the explicit setlist directly by its unique setlist ID
        try:
            setlistObject = setlistApi.setlist(pk=playlistId)
            songs = extract_songs_from_setlist(setlistObject)
            eventDate = setlistObject.get('eventDate', '')
            playlistName = "{}'s Setlist from {}".format(artistName, eventDate)
        except Exception as e:
            app.logger.warning(f"Failed to fetch setlist directly by ID {playlistId}: {e}")
            # Fallback using artistMbid or artistName search
            if artistMbid:
                artistSetlists = setlistApi.artist_setlists(pk=artistMbid)
            else:
                artistSetlists = setlistApi.setlists(artistName=artistName)
            setlistData = pick_setlist_by_id(artistSetlists.get('setlist', []), playlistId)
            raw_songs = setlistData.get('songs') or []
            songs = [s.get('name') if isinstance(s, dict) else s for s in raw_songs]
            playlistName = "{}'s Setlist from {}".format(artistName, setlistData.get('date', ''))
    elif playlistType == 'Producer':
        print('producer')
        get_producer_data(artistId, access_token)
    elif playlistType == 'Songwriter':
        print('songwriter')
        get_songwriter_data(artistId, access_token)

    userId = user.get('id')
    playlistId = createPlaylist(userId, spotify, artistName, playlistName)
    link = insertSongsIntoPlaylist(userId, list(songs), artistName, spotify, playlistId)
    if link:
        uri = get_spotify_uri(playlistId)
        return jsonify({'playlistUri': uri})
    return jsonify({})

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

# return the item from the object from the given setlist
def pick_setlist_by_id(setlists, id):
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

def createPlaylist(userId, sp, artistName, playlistName):
    # create playlist on their account
    description = 'A playlist made with the setlistify.app'
    result = sp.user_playlist_create(userId, playlistName, public=True, description=description)
    playlistId = result.get('id')

    # return playlist id
    return playlistId

def getTrackId(track):
    trackItems = safe_get(track, 'tracks', 'items')
    if trackItems:
        return 'spotify:track:' + trackItems[0].get('id')
    return ''

def insertSongsIntoPlaylist(userId, songNames, artistName, sp, playlistId):
    # sp.user_playlist_add_tracks(username, playlist_id, track_ids)
    tracks = []
    for trackName in songNames:
        if trackName:
            tracks.append(sp.search(q='track:' + trackName + ' artist:' + artistName, limit=1, type='track'))
    trackIds = map(getTrackId, tracks)

    result = sp.user_playlist_add_tracks(userId, playlistId, filter(lambda track: track, trackIds))
    # check if we've successfully added tracks to the playlist
    if result:
        playlistData = sp.playlist(playlistId)
        playlistUrl = safe_get(playlistData, 'external_urls', 'spotify')
        return playlistUrl
    return ''

def get_spotify_uri(playlistId):
    return f"spotify:playlist:{playlistId}"


# This endpoint doesn't work yet
def get_songwriter_data(songwriterId, accessToken):
    parameters = {"id": songwriterId}
    headers = {"Authorization": "Bearer {}".format(accessToken)}
    response = requests.get("https://api.spotify.com/v1/songwriter/", headers=headers, params=parameters)
    data = response.json()
    print(type(data))
    print(data)
    return []

# This endpoint doesn't work yet
def get_producer_data(producerId, accessToken):
    parameters = {"id": producerId}
    headers = {"Authorization": "Bearer {}".format(accessToken)}
    response = requests.get("https://api.spotify.com/v1/producer/", headers=headers, params=parameters)
    data = response.json()
    print(type(data))
    print(data)
    return []

if __name__ == '__main__':
    app.run(port=5000, debug=True)
