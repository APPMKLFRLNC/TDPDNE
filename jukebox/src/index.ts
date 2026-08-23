import { loadConfig, isAppleMusicConfigured } from './config.js';
import { Store } from './store.js';
import { scanLibrary } from './libraryScanner.js';
import { startPoller } from './poller.js';
import { createServer } from './server.js';
import { seedDemoData } from './demo.js';

async function main() {
  const config = loadConfig();
  const store = new Store(config.statePath);
  await store.load();

  if (config.libraryPath) {
    console.log(`Scanning local library at ${config.libraryPath}...`);
  } else {
    console.warn('No LIBRARY_PATH configured; requests will never auto-match to local files.');
  }
  const library = config.libraryPath ? await scanLibrary(config.libraryPath) : [];
  console.log(`Indexed ${library.length} local track(s).`);

  if (config.demoMode) {
    console.log('DEMO_MODE is on: seeding fake requests instead of polling Apple Music.');
    seedDemoData(config, store, library);
  } else if (isAppleMusicConfigured(config)) {
    startPoller(config, store, library);
  } else {
    console.warn(
      'Apple Music is not fully configured (APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_PATH / APPLE_MUSIC_PLAYLIST_ID). ' +
        'Set DEMO_MODE=true in .env to preview the kiosk UI without it.',
    );
  }

  const app = createServer(config, store);
  app.listen(config.port, () => {
    console.log(`Jukebox kiosk running at http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
