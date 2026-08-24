const API_ROOT = 'https://api.music.apple.com';

export interface RemoteTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds?: number;
}

export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
  durationSeconds?: number;
  artworkUrl?: string;
}

interface LibraryTrackResource {
  id: string;
  attributes?: {
    name?: string;
    artistName?: string;
    durationInMillis?: number;
  };
}

interface LibraryTracksResponse {
  data: LibraryTrackResource[];
  next?: string;
}

async function userLibraryFetch(url: string, developerToken: string, musicUserToken: string): Promise<LibraryTracksResponse> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': musicUserToken,
    },
  });
  if (!res.ok) {
    throw new Error(`Apple Music API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<LibraryTracksResponse>;
}

/**
 * Searches the public Apple Music catalog. Only needs the app-level developer token --
 * this is what powers the kiosk's own search box, no per-guest sign-in required.
 */
export async function searchCatalog(developerToken: string, storefront: string, term: string, limit = 12): Promise<CatalogSong[]> {
  const url = `${API_ROOT}/v1/catalog/${storefront}/search?term=${encodeURIComponent(term)}&types=songs&limit=${limit}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${developerToken}` } });
  if (!res.ok) {
    throw new Error(`Apple Music API error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    results?: {
      songs?: {
        data?: Array<{
          id: string;
          attributes?: {
            name?: string;
            artistName?: string;
            durationInMillis?: number;
            artwork?: { url?: string };
          };
        }>;
      };
    };
  };

  const songs = json.results?.songs?.data ?? [];
  return songs.map((s) => ({
    id: s.id,
    title: s.attributes?.name ?? 'Unknown Title',
    artist: s.attributes?.artistName ?? 'Unknown Artist',
    durationSeconds: s.attributes?.durationInMillis ? Math.round(s.attributes.durationInMillis / 1000) : undefined,
    artworkUrl: s.attributes?.artwork?.url?.replace('{w}', '200').replace('{h}', '200'),
  }));
}

/** Fetches every track currently in a user's library playlist (follows pagination). */
export async function fetchLibraryPlaylistTracks(
  developerToken: string,
  musicUserToken: string,
  playlistId: string,
): Promise<RemoteTrack[]> {
  const tracks: LibraryTrackResource[] = [];
  let url: string | undefined = `${API_ROOT}/v1/me/library/playlists/${playlistId}/tracks`;

  while (url) {
    const json: LibraryTracksResponse = await userLibraryFetch(url, developerToken, musicUserToken);
    tracks.push(...json.data);
    url = json.next ? `${API_ROOT}${json.next}` : undefined;
  }

  return tracks.map((t) => ({
    id: t.id,
    title: t.attributes?.name ?? 'Unknown Title',
    artist: t.attributes?.artistName ?? 'Unknown Artist',
    durationSeconds: t.attributes?.durationInMillis ? Math.round(t.attributes.durationInMillis / 1000) : undefined,
  }));
}

/** Lists the connected user's library playlists, to help find APPLE_MUSIC_PLAYLIST_ID. */
export async function fetchLibraryPlaylists(
  developerToken: string,
  musicUserToken: string,
): Promise<Array<{ id: string; name: string }>> {
  const json = await userLibraryFetch(`${API_ROOT}/v1/me/library/playlists`, developerToken, musicUserToken);
  return json.data.map((p) => ({ id: p.id, name: p.attributes?.name ?? '(untitled)' }));
}

/** Best-effort mirror of a kiosk request into the DJ's real Apple Music playlist. Optional. */
export async function addTrackToLibraryPlaylist(
  developerToken: string,
  musicUserToken: string,
  playlistId: string,
  catalogSongId: string,
): Promise<void> {
  const res = await fetch(`${API_ROOT}/v1/me/library/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': musicUserToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: [{ id: catalogSongId, type: 'songs' }] }),
  });
  if (!res.ok) {
    throw new Error(`Apple Music API error ${res.status}: ${await res.text()}`);
  }
}
