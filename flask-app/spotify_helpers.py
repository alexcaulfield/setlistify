import requests
import spotipy
from setlist_helpers import safe_get

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

# TODO: This endpoint doesn't work yet
def get_songwriter_data(songwriterId, accessToken):
    parameters = {"id": songwriterId}
    headers = {"Authorization": "Bearer {}".format(accessToken)}
    response = requests.get("https://api.spotify.com/v1/songwriter/", headers=headers, params=parameters)
    data = response.json()
    print(type(data))
    print(data)
    return []

# TODO: This endpoint doesn't work yet
def get_producer_data(producerId, accessToken):
    parameters = {"id": producerId}
    headers = {"Authorization": "Bearer {}".format(accessToken)}
    response = requests.get("https://api.spotify.com/v1/producer/", headers=headers, params=parameters)
    data = response.json()
    print(type(data))
    print(data)
    return []

