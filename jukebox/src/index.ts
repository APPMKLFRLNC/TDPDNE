import { loadConfig, hasDeveloperCredentials, isPlaylistSyncConfigured } from './config.js';
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
    console.log('DEMO_MODE is on: seeding fake requests instead of using real Apple Music search.');
    seedDemoData(config, store, library);
  } else if (!hasDeveloperCredentials(config)) {
    console.warn(
      'Apple Music is not configured (APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_PATH). ' +
        'The kiosk search box needs these. Set DEMO_MODE=true in .env to preview the UI without them.',
    );
  }

  if (isPlaylistSyncConfigured(config)) {
    startPoller(config, store, library);
  }

  const app = createServer(config, store, library);
  app.listen(config.port, () => {
    console.log(`Jukebox kiosk running at http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
