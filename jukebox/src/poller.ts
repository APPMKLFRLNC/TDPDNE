import type { Config } from './config.js';
import { Store, type QueueItem } from './store.js';
import type { LibraryTrack } from './libraryScanner.js';
import { fetchLibraryPlaylistTracks } from './appleMusicClient.js';
import { getDeveloperToken } from './appleMusicToken.js';
import { findBestMatch } from './matcher.js';
import { writeM3U8 } from './playlistWriter.js';

/** Rewrites the DJ's hot-folder playlist from whatever is currently matched in the queue. */
export async function syncHotfolder(config: Config, store: Store): Promise<void> {
  if (!config.hotfolderPath) return;
  const matched = store.get().queue.filter((item) => item.matched && item.localPath);
  await writeM3U8(
    matched.map((item) => ({
      filePath: item.localPath as string,
      title: item.title,
      artist: item.artist,
      durationSeconds: item.durationSeconds,
    })),
    config.hotfolderPath,
    config.hotfolderFilename,
  );
}

/** Starts polling the shared playlist on an interval, matching new tracks and syncing the hot-folder. */
export function startPoller(config: Config, store: Store, library: LibraryTrack[]): NodeJS.Timeout {
  let running = false;

  async function tick(): Promise<void> {
    const { musicUserToken } = store.get();
    if (!musicUserToken || running) return;
    running = true;
    try {
      const developerToken = getDeveloperToken(config);
      const tracks = await fetchLibraryPlaylistTracks(developerToken, musicUserToken, config.appleMusicPlaylistId as string);
      const newTracks = tracks.filter((t) => !store.hasSeenTrack(t.id));

      if (newTracks.length > 0) {
        for (const t of newTracks) {
          const match = findBestMatch(t.title, t.artist, library);
          const item: QueueItem = {
            id: t.id,
            title: t.title,
            artist: t.artist,
            durationSeconds: t.durationSeconds,
            addedAt: new Date().toISOString(),
            matched: !!match,
            localPath: match?.track.filePath,
          };
          store.addQueueItem(item);
        }
        await store.save();
        await syncHotfolder(config, store);
        console.log(`[poller] ${newTracks.length} new request(s) added to the queue.`);
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
