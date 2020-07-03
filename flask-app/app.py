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

# Allows to get secret keys from AWS
client = boto3.client('ssm')
def get_secret(key):
	resp = client.get_parameter(
		Name=key,
		WithDecryption=True
	)
	return resp['Parameter']['Value']

IS_OFFLINE = os.environ.get('IS_OFFLINE')

# Setting secret keys based on environment
SPOTIFY_CLIENT_ID     = config('SPOTIFY_CLIENT_ID')     if IS_OFFLINE else get_secret('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = config('SPOTIFY_CLIENT_SECRET') if IS_OFFLINE else get_secret('SPOTIFY_CLIENT_SECRET')
APP_SECRET_KEY        = config('APP_SECRET_KEY')        if IS_OFFLINE else get_secret('APP_SECRET_KEY')
SETLIST_FM_API_KEY    = config('SETLIST_FM_API_KEY')    if IS_OFFLINE else get_secret('SETLIST_FM_API_KEY')

SPOTIFY_API_BASE = 'https://accounts.spotify.com'

SCOPE = 'playlist-modify-public'
CACHE = '.spotipyoauthcache'

# Set this to True for testing but you probably want it set to False in production.
SHOW_DIALOG = True if IS_OFFLINE else False

app = Flask(__name__)
app.secret_key = APP_SECRET_KEY
# Setting URLs based on environment
SETLISTIFY_API_BASE    = 'http://localhost:5000' if IS_OFFLINE else 'https://aahxozyk09.execute-api.us-east-1.amazonaws.com/dev/'
SETLISTIFY_CLIENT_BASE = 'http://localhost:3000' if IS_OFFLINE else ''
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
@app.route("/getUser", methods=('GET', 'POST'))
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
@app.route('/artistSearch', methods=('GET', 'POST'))
def get_artist_results():
    data = request.get_json()
    query = data.get('query')
    query_limit = data.get('limit')

    access_token = session['toke']
    sp = spotipy.Spotify(auth=access_token)
    results = sp.search(q='artist:' + query, type='artist', limit=query_limit)
    return {'artists': results['artists']['items']}