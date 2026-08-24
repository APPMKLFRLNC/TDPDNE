import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from './config.js';
import { hasDeveloperCredentials, isPlaylistSyncConfigured } from './config.js';
import { getDeveloperToken } from './appleMusicToken.js';
import { fetchLibraryPlaylists, searchCatalog, addTrackToLibraryPlaylist } from './appleMusicClient.js';
import type { Store } from './store.js';
import type { LibraryTrack } from './libraryScanner.js';
import { handleNewRequest } from './requestHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

export function createServer(config: Config, store: Store, library: LibraryTrack[]) {
  const app = express();
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get('/api/config', (_req, res) => {
    res.json({
      searchEnabled: config.demoMode || hasDeveloperCredentials(config),
      playlistSyncConfigured: isPlaylistSyncConfigured(config),
      demoMode: config.demoMode,
      connected: !!store.get().musicUserToken,
    });
  });

  // Primary path: guests search the Apple Music catalog right on the kiosk.
  app.get('/api/search', async (req, res) => {
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!term) {
      res.json({ results: [] });
      return;
    }
    if (config.demoMode) {
      res.json({
        results: [
          { id: 'demo-search-1', title: term, artist: 'Demo Artist', durationSeconds: 200 },
        ],
      });
      return;
    }
    try {
      const developerToken = getDeveloperToken(config);
      const results = await searchCatalog(developerToken, config.appleMusicStorefront, term);
      res.json({ results });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Primary path: add a searched-for song straight to the queue.
  app.post('/api/request', async (req, res) => {
    const { id, title, artist, durationSeconds } = req.body ?? {};
    if (typeof id !== 'string' || typeof title !== 'string' || typeof artist !== 'string') {
      res.status(400).json({ error: 'id, title and artist are required' });
      return;
    }

    const result = await handleNewRequest(config, store, library, {
      id,
      title,
      artist,
      durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : undefined,
    });

    // Optional: also mirror into the DJ's real Apple Music playlist, best-effort.
    const { musicUserToken } = store.get();
    if (result.added && musicUserToken && isPlaylistSyncConfigured(config)) {
      try {
        const developerToken = getDeveloperToken(config);
        await addTrackToLibraryPlaylist(developerToken, musicUserToken, config.appleMusicPlaylistId as string, id);
      } catch (err) {
        console.warn('[request] failed to mirror track into Apple Music playlist:', (err as Error).message);
      }
    }

    res.json(result);
  });

  // Optional secondary path: connecting lets the app also mirror requests into a real
  // playlist and/or pick up tracks added directly from the Apple Music app.
  app.get('/api/apple-music/developer-token', (_req, res) => {
    try {
      res.json({ token: getDeveloperToken(config) });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/apple-music/authorize', async (req, res) => {
    const musicUserToken = req.body?.musicUserToken;
    if (typeof musicUserToken !== 'string' || !musicUserToken) {
      res.status(400).json({ error: 'musicUserToken is required' });
      return;
    }
    store.setUserToken(musicUserToken);
    await store.save();
    res.json({ ok: true });
  });

  // Helper for finding APPLE_MUSIC_PLAYLIST_ID: connect once, then hit this endpoint.
  app.get('/api/apple-music/library-playlists', async (_req, res) => {
    const { musicUserToken } = store.get();
    if (!musicUserToken) {
      res.status(400).json({ error: 'Not connected to Apple Music yet' });
      return;
    }
    try {
      const developerToken = getDeveloperToken(config);
      const playlists = await fetchLibraryPlaylists(developerToken, musicUserToken);
      res.json({ playlists });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  app.get('/api/state', (_req, res) => {
    const state = store.get();
    res.json({
      connected: !!state.musicUserToken,
      queue: [...state.queue].reverse(),
    });
  });

  return app;
}
