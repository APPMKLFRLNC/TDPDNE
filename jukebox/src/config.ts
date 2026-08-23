import 'dotenv/config';

export interface Config {
  port: number;
  appleTeamId?: string;
  appleKeyId?: string;
  applePrivateKeyPath?: string;
  appleMusicPlaylistId?: string;
  joinUrl?: string;
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
    appleMusicPlaylistId: process.env.APPLE_MUSIC_PLAYLIST_ID || undefined,
    joinUrl: process.env.JOIN_URL || undefined,
    libraryPath: process.env.LIBRARY_PATH || undefined,
    hotfolderPath: process.env.HOTFOLDER_PATH || undefined,
    hotfolderFilename: process.env.HOTFOLDER_FILENAME || 'jukebox-queue.m3u8',
    pollIntervalSeconds: Number(process.env.POLL_INTERVAL_SECONDS ?? 15),
    demoMode: process.env.DEMO_MODE === 'true',
    statePath: process.env.STATE_PATH || './data/state.json',
  };
}

export function isAppleMusicConfigured(config: Config): boolean {
  return !!(
    config.appleTeamId &&
    config.appleKeyId &&
    config.applePrivateKeyPath &&
    config.appleMusicPlaylistId
  );
}
