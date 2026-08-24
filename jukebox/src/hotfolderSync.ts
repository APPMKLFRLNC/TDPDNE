import type { Config } from './config.js';
import type { Store } from './store.js';
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
