import 'dotenv/config';

export interface Config {
  port: number;
  appleTeamId?: string;
  appleKeyId?: string;
  applePrivateKeyPath?: string;
  appleMusicStorefront: string;
  appleMusicPlaylistId?: string;
  libraryPath?: string;
  hotfolderPath?: string;
  hotfolderFilename: string;
  pollIntervalSeconds: number;
  demoMode: boolean;
  statePath: string;
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 3000),
    appleTeamId: process.env.APPLE_TEAM_ID || undefined,
    appleKeyId: process.env.APPLE_KEY_ID || undefined,
    applePrivateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH || undefined,
    appleMusicStorefront: process.env.APPLE_MUSIC_STOREFRONT || 'us',
    appleMusicPlaylistId: process.env.APPLE_MUSIC_PLAYLIST_ID || undefined,
    libraryPath: process.env.LIBRARY_PATH || undefined,
    hotfolderPath: process.env.HOTFOLDER_PATH || undefined,
    hotfolderFilename: process.env.HOTFOLDER_FILENAME || 'jukebox-queue.m3u8',
    pollIntervalSeconds: Number(process.env.POLL_INTERVAL_SECONDS ?? 15),
    demoMode: process.env.DEMO_MODE === 'true',
    statePath: process.env.STATE_PATH || './data/state.json',
  };
}

/** Needed for catalog search -- the primary, guest-facing way to request songs on the kiosk. */
export function hasDeveloperCredentials(config: Config): boolean {
  return !!(config.appleTeamId && config.appleKeyId && config.applePrivateKeyPath);
}

/**
 * Needed only for the optional secondary path: mirroring kiosk requests into a real Apple
 * Music library playlist, and/or picking up tracks someone added from the Apple Music app.
 */
export function isPlaylistSyncConfigured(config: Config): boolean {
  return hasDeveloperCredentials(config) && !!config.appleMusicPlaylistId;
}
