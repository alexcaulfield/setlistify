import os
from decouple import config

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

