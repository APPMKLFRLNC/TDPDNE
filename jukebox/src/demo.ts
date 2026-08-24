import type { Config } from './config.js';
import type { Store } from './store.js';
import type { LibraryTrack } from './libraryScanner.js';
import { handleNewRequest } from './requestHandler.js';

const SAMPLE_REQUESTS = [
  { title: 'Blinding Lights', artist: 'The Weeknd' },
  { title: 'One More Time', artist: 'Daft Punk' },
  { title: 'Levitating', artist: 'Dua Lipa' },
  { title: 'Good 4 U', artist: 'Olivia Rodrigo' },
  { title: 'Flowers', artist: 'Miley Cyrus' },
  { title: 'As It Was', artist: 'Harry Styles' },
];

/** Simulates guests searching and tapping "Add", so the kiosk UI can be previewed without real Apple Music credentials. */
export function seedDemoData(config: Config, store: Store, library: LibraryTrack[]): NodeJS.Timeout {
  let i = 0;

  const addOne = async () => {
    const sample = SAMPLE_REQUESTS[i % SAMPLE_REQUESTS.length];
    i++;
    await handleNewRequest(config, store, library, {
      id: `demo-${Date.now()}-${i}`,
      title: sample.title,
      artist: sample.artist,
    });
  };

  void addOne();
  return setInterval(addOne, 8000);
}
