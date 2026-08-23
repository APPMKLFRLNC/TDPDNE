const API_ROOT = 'https://api.music.apple.com';

export interface RemoteTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds?: number;
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

async function appleMusicFetch(url: string, developerToken: string, musicUserToken: string): Promise<LibraryTracksResponse> {
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

/** Fetches every track currently in a user's library playlist (follows pagination). */
export async function fetchLibraryPlaylistTracks(
  developerToken: string,
  musicUserToken: string,
  playlistId: string,
): Promise<RemoteTrack[]> {
  const tracks: LibraryTrackResource[] = [];
  let url: string | undefined = `${API_ROOT}/v1/me/library/playlists/${playlistId}/tracks`;

  while (url) {
    const json: LibraryTracksResponse = await appleMusicFetch(url, developerToken, musicUserToken);
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
  const json = await appleMusicFetch(`${API_ROOT}/v1/me/library/playlists`, developerToken, musicUserToken);
  return json.data.map((p) => ({ id: p.id, name: p.attributes?.name ?? '(untitled)' }));
}
