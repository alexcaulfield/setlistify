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

# Setting URLs based on environment
SETLISTIFY_CLIENT_BASE = 'http://localhost:3000' if IS_OFFLINE else 'https://setlistify.app'
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
        'token': encoded_access_token.decode()
    })

# get results for search query from Spotify API
# params: string artist query, int limit
# returns: array of artist results
@app.route('/artistSearch', methods=['POST'])
@cross_origin(['www.setlistify.app'])
def get_artist_results():
    token        = request.json.get('token')
    token_object = jwt.decode(token, APP_SECRET_KEY, algorithm='HS256')
    access_token = token_object.get('access_token')

    query        = request.json.get('query')
    query_limit  = request.json.get('limit')

    spotify = spotipy.Spotify(auth=access_token)

    results = spotify.search(q='artist:' + query, type='artist', limit=query_limit)
    return jsonify({'artists': results['artists']['items']})

# get artist setlists
# params: artist name
# returns: array of setlists
@app.route('/artistSetlists', methods=['POST'])
@cross_origin(['www.setlistify.app'])
def get_artist_setlists():
    artistName = request.json.get('artistName')
    artistSetlistsData = setlistApi.setlists(artistName=artistName)
    setlists = artistSetlistsData.get('setlist')
    return jsonify({'artistSetlists': setlists})

# Build a playlist
# params: string playlist type, string artist name
# returns: playlist URI
@app.route('/buildPlaylist', methods=['POST'])
@cross_origin(['www.setlistify.app'])
def build_playlist():
    token        = request.json.get('token')
    token_object = jwt.decode(token, APP_SECRET_KEY, algorithm='HS256')
    access_token = token_object.get('access_token')

    artistName   = request.json.get('artistName')
    artistId     = request.json.get('artistId')
    playlistType = request.json.get('playlistType')
    playlistId   = request.json.get('playlistId')

    spotify = spotipy.Spotify(auth=access_token)
    user = spotify.current_user()

    songs = []
    if playlistType == 'Setlist':
        artistSetlists = setlistApi.setlists(artistName=artistName)
        setlistData = pick_setlist_by_id(artistSetlists['setlist'], playlistId)
        songs = list(map(lambda song: song.get('name'), setlistData.get('songs')))
        playlistName = "{}'s Setlist from {}".format(artistName, setlistData.get('date'))
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

# return the item from the object from the given setlist
def pick_setlist_by_id(setlists, id):
    for setlistObject in setlists:
        if setlistObject.get('id') == id:
            setlist = safe_get(setlistObject, 'sets', 'set')
            if setlist:
                songList = setlist[0]
                setlistData = dict()
                setlistData['songs'] = songList.get('song')
                setlistData['date'] = setlistObject.get('eventDate')
                return setlistData
    return {}

def pick_most_recent_setlist(setlists):
    for setlistObject in setlists:
        setlist = safe_get(setlistObject, 'sets', 'set')
        if setlist:
            songList = setlist[0]
            return songList.get('song')
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