import os
from flask import Flask, redirect, url_for, session, request
from dotenv import load_dotenv
import spotipy
import spotipy.util as util
from spotipy import oauth2
from repertorio import Repertorio
from collections import OrderedDict
import requests

APP_ROOT = os.path.join(os.path.dirname(__file__), '..')   # refers to application_top
dotenv_path = os.path.join(APP_ROOT, '.env')
load_dotenv(dotenv_path)

SPOTIFY_CLIENT_ID = '0b0c290b74184b09b377bd38671e88a6'
SPOTIFY_CLIENT_SECRET = '3d3b6dcb6423475982994a186421af1b'
APP_SECRET_KEY = '\x0f\xbdEZ%\xf5\xd9\x18\xb2\xef\x86\xca\xbe\xbf\x07\x85jMP\xd1]\x88u\x08'

SPOTIFY_API_BASE = 'https://accounts.spotify.com'

SCOPE = 'playlist-modify-public'
CACHE = '.spotipyoauthcache'

IS_OFFLINE = os.environ.get('IS_OFFLINE')
# Set this to True for testing but you probably want it set to False in production.
SHOW_DIALOG = True if IS_OFFLINE else False

app = Flask(__name__)
app.secret_key = APP_SECRET_KEY
SETLISTIFY_API_BASE = 'http://localhost:5000' if IS_OFFLINE else 'https://aahxozyk09.execute-api.us-east-1.amazonaws.com/dev/'
SETLISTIFY_CLIENT_BASE = 'http://localhost:3000' if IS_OFFLINE else ''
REDIRECT_URI = f"{SETLISTIFY_CLIENT_BASE}/callback"
sp_oauth = oauth2.SpotifyOAuth( SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET,REDIRECT_URI,scope=SCOPE,cache_path=CACHE )

@app.route("/authUrl")
def verify():
    authUrl = f'{SPOTIFY_API_BASE}/authorize?client_id={SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri={REDIRECT_URI}&scope={SCOPE}&show_dialog={SHOW_DIALOG}'
    return {'authUrl': authUrl}

# authorization-code-flow Step 2.
# Have your application request refresh and access tokens;
# Spotify returns access and refresh tokens
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