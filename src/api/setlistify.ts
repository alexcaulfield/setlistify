import { fetchUrl } from '../utils/dev_env';
import type {
  AuthUrlResponse,
  GetUserRequest,
  GetUserResponse,
  ArtistSearchRequest,
  ArtistSearchResponse,
  ArtistSetlistsRequest,
  ArtistSetlistsResponse,
  BuildPlaylistRequest,
  BuildPlaylistResponse,
} from './types.gen';

export async function fetchAuthUrl(): Promise<AuthUrlResponse> {
  const res = await fetch(`${fetchUrl()}/authUrl`);
  if (!res.ok) {
    throw new Error(`Failed to fetch auth URL: ${res.statusText}`);
  }
  return res.json();
}

export async function exchangeCodeForUser(req: GetUserRequest): Promise<GetUserResponse> {
  const res = await fetch(`${fetchUrl()}/getUser`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`Failed to exchange code: ${res.statusText}`);
  }
  return res.json();
}

export async function searchArtists(req: ArtistSearchRequest): Promise<ArtistSearchResponse> {
  const res = await fetch(`${fetchUrl()}/artistSearch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`Failed to search artists: ${res.statusText}`);
  }
  return res.json();
}

/**
 * 🧑‍💻 [Manual Contribution Opportunity]
 * Implement fetchArtistSetlists by POSTing req to `${fetchUrl()}/artistSetlists`.
 */
export async function fetchArtistSetlists(
  req: ArtistSetlistsRequest
): Promise<ArtistSetlistsResponse> {
  const res = await fetch(`${fetchUrl()}/artistSetlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch artist setlists: ${res.statusText}`);
  }
  return res.json();
}

/**
 * 🧑‍💻 [Manual Contribution Opportunity]
 * Implement buildPlaylist by POSTing req to `${fetchUrl()}/buildPlaylist`.
 */
export async function buildPlaylist(
  req: BuildPlaylistRequest
): Promise<BuildPlaylistResponse> {
  const res = await fetch(`${fetchUrl()}/buildPlaylist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`Failed to build playlist: ${res.statusText}`);
  }
  return res.json();
}
