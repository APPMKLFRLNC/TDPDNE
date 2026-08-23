import type { Config } from './config.js';
import { Store, type QueueItem } from './store.js';
import type { LibraryTrack } from './libraryScanner.js';
import { findBestMatch } from './matcher.js';
import { syncHotfolder } from './poller.js';

const SAMPLE_REQUESTS = [
  { title: 'Blinding Lights', artist: 'The Weeknd' },
  { title: 'One More Time', artist: 'Daft Punk' },
  { title: 'Levitating', artist: 'Dua Lipa' },
  { title: 'Good 4 U', artist: 'Olivia Rodrigo' },
  { title: 'Flowers', artist: 'Miley Cyrus' },
  { title: 'As It Was', artist: 'Harry Styles' },
];

/** Simulates guests adding songs, so the kiosk UI can be previewed without real Apple Music credentials. */
export function seedDemoData(config: Config, store: Store, library: LibraryTrack[]): NodeJS.Timeout {
  let i = 0;

  const addOne = async () => {
    const sample = SAMPLE_REQUESTS[i % SAMPLE_REQUESTS.length];
    i++;
    const match = findBestMatch(sample.title, sample.artist, library);
    const item: QueueItem = {
      id: `demo-${Date.now()}-${i}`,
      title: sample.title,
      artist: sample.artist,
      addedAt: new Date().toISOString(),
      matched: !!match,
      localPath: match?.track.filePath,
    };
    store.addQueueItem(item);
    await store.save();
    await syncHotfolder(config, store);
  };

  store.setUserToken('demo-token');
  void addOne();
  return setInterval(addOne, 8000);
}
