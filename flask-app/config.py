import os
from decouple import config

IS_OFFLINE = os.environ.get('IS_OFFLINE', '').lower() in ('true', '1') or os.environ.get('SERVERLESS_TEST') == 'true'

# Setting secret keys based on environment
SPOTIFY_CLIENT_ID     = config('SPOTIFY_CLIENT_ID', default='')
SPOTIFY_CLIENT_SECRET = config('SPOTIFY_CLIENT_SECRET', default='')
APP_SECRET_KEY        = config('APP_SECRET_KEY', default='')
SETLIST_FM_API_KEY    = config('SETLIST_FM_API_KEY', default='')

# Base URLs and settings based on environment
SETLISTIFY_CLIENT_BASE = 'http://127.0.0.1:3000' if IS_OFFLINE else 'https://setlistify.app'
REDIRECT_URI           = f"{SETLISTIFY_CLIENT_BASE}/callback"
SPOTIFY_API_BASE       = 'https://accounts.spotify.com'
SCOPE                  = 'playlist-modify-public'
SHOW_DIALOG            = True if IS_OFFLINE else False

SPOTIFY_API_BASE = 'https://accounts.spotify.com'

SCOPE = 'playlist-modify-public'

# Set this to True for testing but you probably want it set to False in production.
SHOW_DIALOG = True # if IS_OFFLINE else False

