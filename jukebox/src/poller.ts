import type { Config } from './config.js';
import type { Store } from './store.js';
import type { LibraryTrack } from './libraryScanner.js';
import { fetchLibraryPlaylistTracks } from './appleMusicClient.js';
import { getDeveloperToken } from './appleMusicToken.js';
import { handleNewRequest } from './requestHandler.js';

/**
 * Optional secondary path: if a playlist ID is configured and the DJ has connected once,
 * this also picks up anything added straight from the Apple Music app to that playlist.
 * The kiosk's own search-and-add is the primary path and doesn't depend on this at all.
 */
export function startPoller(config: Config, store: Store, library: LibraryTrack[]): NodeJS.Timeout {
  let running = false;

  async function tick(): Promise<void> {
    const { musicUserToken } = store.get();
    if (!musicUserToken || !config.appleMusicPlaylistId || running) return;
    running = true;
    try {
      const developerToken = getDeveloperToken(config);
      const tracks = await fetchLibraryPlaylistTracks(developerToken, musicUserToken, config.appleMusicPlaylistId);

      let addedCount = 0;
      for (const t of tracks) {
        const result = await handleNewRequest(config, store, library, t);
        if (result.added) addedCount++;
      }
      if (addedCount > 0) {
        console.log(`[poller] ${addedCount} new request(s) picked up from the Apple Music playlist.`);
      }
    } catch (err) {
      console.error('[poller] failed to poll Apple Music:', (err as Error).message);
    } finally {
      running = false;
    }
  }

  void tick();
  return setInterval(tick, config.pollIntervalSeconds * 1000);
}
