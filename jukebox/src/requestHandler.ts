import type { Config } from './config.js';
import { Store, type QueueItem } from './store.js';
import type { LibraryTrack } from './libraryScanner.js';
import { findBestMatch } from './matcher.js';
import { syncHotfolder } from './hotfolderSync.js';

export interface IncomingTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds?: number;
}

export interface HandleResult {
  added: boolean;
  item?: QueueItem;
}

/**
 * Adds a new request to the queue -- matching it against the DJ's local library and
 * re-syncing the hot-folder playlist. Shared by the kiosk search-and-add endpoint and the
 * (optional) Apple Music playlist poller, so both paths dedupe and behave identically.
 */
export async function handleNewRequest(
  config: Config,
  store: Store,
  library: LibraryTrack[],
  track: IncomingTrack,
): Promise<HandleResult> {
  if (store.hasSeenTrack(track.id)) {
    return { added: false };
  }

  const match = findBestMatch(track.title, track.artist, library);
  const item: QueueItem = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    durationSeconds: track.durationSeconds,
    addedAt: new Date().toISOString(),
    matched: !!match,
    localPath: match?.track.filePath,
  };

  store.addQueueItem(item);
  await store.save();
  await syncHotfolder(config, store);

  return { added: true, item };
}
