import os
import traceback
from flask import Flask, session, request, jsonify
from flask_cors import CORS, cross_origin
from flask_session import Session
import jwt
import spotipy
from spotipy.cache_handler import MemoryCacheHandler
from repertorio import Repertorio

from config import (
    APP_SECRET_KEY,
    IS_OFFLINE,
    REDIRECT_URI,
    SCOPE,
    SETLIST_FM_API_KEY,
    SHOW_DIALOG,
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
)
from setlist_helpers import (
    extract_songs_from_setlist,
    pick_setlist_by_id,
    safe_get,
    setlist_has_songs,
)
from spotify_helpers import (
    createPlaylist,
    get_producer_data,
    get_songwriter_data,
    get_spotify_uri,
    insertSongsIntoPlaylist,
)

app = Flask(__name__)
app.debug = True
app.config['SECRET_KEY'] = APP_SECRET_KEY

session_dir = '/tmp/flask_session' if not IS_OFFLINE else './flask_session'
os.makedirs(session_dir, exist_ok=True)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = session_dir
Session(app)
CORS(app, supports_credentials=True)
setlistApi = Repertorio(SETLIST_FM_API_KEY)

@app.errorhandler(Exception)
def handle_exception(e):
    traceback.print_exc()
    return jsonify({"error": str(e), "type": type(e).__name__}), 500

# Begin API Endpoints

# Get Spotify Auth URL
# params: none
# returns: string authUrl
@app.route("/authUrl")
@cross_origin(origins=['https://www.setlistify.app', 'https://setlistify.app', 'http://localhost:3000'])
def verify():
    auth_manager = spotipy.oauth2.SpotifyOAuth(
        SPOTIFY_CLIENT_ID,
        SPOTIFY_CLIENT_SECRET,
        REDIRECT_URI,
        scope=SCOPE,
        show_dialog=SHOW_DIALOG,
        cache_handler=MemoryCacheHandler(),
    )
    authUrl = auth_manager.get_authorize_url()
    return jsonify({
        'authUrl': authUrl,
        'cachePath': ''
    })

# authorization-code-flow Step 2.
# Have your application request refresh and access tokens;
# Spotify returns access and refresh tokens
# params: string code
# returns: dict results (representing user object from Spotify API)
@app.route("/getUser", methods=['POST'])
@cross_origin(origins=['https://www.setlistify.app', 'https://setlistify.app', 'http://localhost:3000'])
def get_user():
    session.clear()
    code = request.json.get('code')

    auth_manager = spotipy.oauth2.SpotifyOAuth(
        SPOTIFY_CLIENT_ID,
        SPOTIFY_CLIENT_SECRET,
        REDIRECT_URI,
        scope=SCOPE,
        cache_handler=MemoryCacheHandler(),
    )
    access_token = auth_manager.get_access_token(code, as_dict=True, check_cache=False)
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
@cross_origin(origins=['https://www.setlistify.app', 'https://setlistify.app', 'http://localhost:3000'])
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
@cross_origin(origins=['https://www.setlistify.app', 'https://setlistify.app', 'http://localhost:3000'])
def get_artist_setlists():
    artistName = request.json.get('artistName')
    artistMbid = request.json.get('artistMbid')

    # 1. If artist MBID is provided, fetch directly for that explicit artist
    if artistMbid:
        try:
            artistSetlistsData = setlistApi.artist_setlists(pk=artistMbid)
            setlists = artistSetlistsData.get('setlist', []) if isinstance(artistSetlistsData, dict) else []
            return jsonify({'artistSetlists': setlists, 'artistMbid': artistMbid})
        except Exception as e:
            app.logger.info(f"Setlists not found or error for MBID {artistMbid}: {e}")

    # 2. If artistName is provided, find the matching artist entity on setlist.fm that has setlists
    if artistName:
        normalized_name = artistName.strip().lower()
        try:
            # Sort by relevance to surface notable matching artists first
            artistSearchData = setlistApi.artists(artistName=artistName, sort='relevance')
            artists = artistSearchData.get('artist', []) if isinstance(artistSearchData, dict) else []
            if artists:
                # Group exact name matches first
                exact_matches = [
                    a for a in artists
                    if a.get('name', '').strip().lower() == normalized_name
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
                            return jsonify({'artistSetlists': candidate_setlists, 'artistMbid': mbid})
                        elif candidate_setlists and not best_setlists:
                            best_setlists = candidate_setlists
                            best_mbid = mbid
                    except Exception as err:
                        # 404 is standard for setlist.fm when an artist has 0 setlists
                        app.logger.debug(f"Setlists check for MBID {mbid}: {err}")
                        continue

                if best_setlists:
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
                if normalized_name in (safe_get(s, 'artist', 'name') or '').strip().lower()
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
@cross_origin(origins=['https://www.setlistify.app', 'https://setlistify.app', 'http://localhost:3000'])
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

if __name__ == '__main__':
    app.run(port=5000, debug=True)
