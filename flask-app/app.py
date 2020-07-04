import os
from flask import Flask, redirect, url_for, session, request
from dotenv import load_dotenv
import spotipy
import spotipy.util as util
from spotipy import oauth2
from repertorio import Repertorio
from collections import OrderedDict
import requests
import boto3
from decouple import config
from flask_cors import CORS

# Helper functions
# Safely gets from nested dict
# https://stackoverflow.com/questions/25833613/python-safe-method-to-get-value-of-nested-dictionary
def safe_get(dct, *keys):
    for key in keys:
        try:
            dct = dct[key]
        except KeyError:
            return None
    return dct

IS_OFFLINE = os.environ.get('IS_OFFLINE')

# Setting secret keys based on environment
SPOTIFY_CLIENT_ID     = config('SPOTIFY_CLIENT_ID')     if IS_OFFLINE else os.environ['SPOTIFY_CLIENT_ID']
SPOTIFY_CLIENT_SECRET = config('SPOTIFY_CLIENT_SECRET') if IS_OFFLINE else os.environ['SPOTIFY_CLIENT_SECRET']
APP_SECRET_KEY        = config('APP_SECRET_KEY')        if IS_OFFLINE else os.environ['APP_SECRET_KEY']
SETLIST_FM_API_KEY    = config('SETLIST_FM_API_KEY')    if IS_OFFLINE else os.environ['SETLIST_FM_API_KEY']

SPOTIFY_API_BASE = 'https://accounts.spotify.com'

SCOPE = 'playlist-modify-public'
CACHE = '.spotipyoauthcache'

# Set this to True for testing but you probably want it set to False in production.
SHOW_DIALOG = True if IS_OFFLINE else False

app = Flask(__name__)
app.secret_key = APP_SECRET_KEY
CORS(app)
# Setting URLs based on environment
SETLISTIFY_CLIENT_BASE = 'http://localhost:3000' if IS_OFFLINE else 'https://setlistify.app'
REDIRECT_URI           = f"{SETLISTIFY_CLIENT_BASE}/callback"
# Setting clients based on environment variables
sp_oauth               = oauth2.SpotifyOAuth( SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET,REDIRECT_URI,scope=SCOPE,cache_path=CACHE )
setlistApi             = Repertorio(SETLIST_FM_API_KEY)

# Begin API Endpoints

# Get Spotify Auth URL
# params: none
# returns: string authUrl
@app.route("/authUrl")
def verify():
    authUrl = f'{SPOTIFY_API_BASE}/authorize?client_id={SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri={REDIRECT_URI}&scope={SCOPE}&show_dialog={SHOW_DIALOG}'
    return {'authUrl': authUrl}

# authorization-code-flow Step 2.
# Have your application request refresh and access tokens;
# Spotify returns access and refresh tokens
# params: string code
# returns: dict results (representing user object from Spotify API)
@app.route("/getUser", methods=['POST'])
def get_user():
    session.clear()
    data = request.get_json()
    code = data.get('code')

    token_info = sp_oauth.get_access_token(code)
    access_token = token_info.get('access_token')

    session["toke"] = access_token
    sp = spotipy.Spotify(auth=access_token)
    results = sp.current_user()

    return results

# get results for search query from Spotify API
# params: string artist query, int limit
# returns: array of artist results
@app.route('/artistSearch', methods=['POST'])
def get_artist_results():
    data = request.get_json()
    query = data.get('query')
    query_limit = data.get('limit')

    access_token = session['toke']
    sp = spotipy.Spotify(auth=access_token)
    results = sp.search(q='artist:' + query, type='artist', limit=query_limit)
    return {'artists': results['artists']['items']}

# Build a playlist
# params: string playlist type, string artist name
# returns: playlist URI
@app.route('/buildPlaylist', methods=['POST'])
def build_playlist():
    data         = request.get_json()
    artistName   = data['artistName']
    artistId     = data['artistId']
    playlistType = data['playlistType']

    access_token = session['toke']
    sp = spotipy.Spotify(auth=access_token)
    user = sp.current_user()

    songs = []
    if playlistType == 'Setlist':
        artistSetlists = setlistApi.setlists(artistName=artistName)
        setlist = pick_most_recent_setlist(artistSetlists['setlist'])
        songs = list(map(lambda song: song.get('name'), setlist))
        playlistName = "%s's Setlist" % (artistName)
    elif playlistType == 'Producer':
        print('producer')
        get_producer_data(artistId, access_token)
    elif playlistType == 'Songwriter':
        print('songwriter')
        get_songwriter_data(artistId, access_token)

    userId = user.get('id')
    playlistId = createPlaylist(userId, access_token, sp, artistName, playlistName)
    link = insertSongsIntoPlaylist(userId, list(songs), artistName, sp, playlistId)
    if link:
        uri = get_spotify_uri(playlistId)
        return {'playlistUri': uri}
    return {}

def pick_most_recent_setlist(setlists):
    for setlistObject in setlists:
        setlist = safe_get(setlistObject, 'sets', 'set')
        if setlist:
            songList = setlist[0]
            return songList.get('song')
    return {}

def createPlaylist(userId, userToken, sp, artistName, playlistName):
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