import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import type { Config } from './config.js';
import { isAppleMusicConfigured } from './config.js';
import { getDeveloperToken } from './appleMusicToken.js';
import { fetchLibraryPlaylists } from './appleMusicClient.js';
import type { Store } from './store.js';
import { syncHotfolder } from './poller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

export function createServer(config: Config, store: Store) {
  const app = express();
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get('/api/config', (_req, res) => {
    res.json({
      configured: isAppleMusicConfigured(config),
      demoMode: config.demoMode,
      connected: !!store.get().musicUserToken,
      joinUrl: config.joinUrl ?? null,
    });
  });

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

  app.get('/api/join-qr.png', (_req, res) => {
    if (!config.joinUrl) {
      res.status(404).end();
      return;
    }
    res.type('png');
    QRCode.toFileStream(res, config.joinUrl, { width: 320, margin: 1 });
  });

  app.post('/api/sync-hotfolder', async (_req, res) => {
    await syncHotfolder(config, store);
    res.json({ ok: true });
  });

  return app;
}
