import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';
import type { Config } from './config.js';

const SIX_MONTHS_MINUS_BUFFER_SECONDS = 60 * 60 * 24 * 150;

let cached: { token: string; expiresAt: number } | null = null;

/**
 * Apple's developer token is a JWT signed with the MusicKit private key (.p8).
 * It's not user-specific -- it just proves the app is allowed to call the
 * Apple Music API. The per-user "Music User Token" (from MusicKit JS
 * authorize()) is what actually grants access to someone's library playlist.
 */
export function getDeveloperToken(config: Config): string {
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }
  if (!config.appleTeamId || !config.appleKeyId || !config.applePrivateKeyPath) {
    throw new Error('Apple Music credentials are not configured (APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_PATH).');
  }

  const privateKey = readFileSync(config.applePrivateKeyPath, 'utf-8');
  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    issuer: config.appleTeamId,
    keyid: config.appleKeyId,
    expiresIn: SIX_MONTHS_MINUS_BUFFER_SECONDS,
  });

  cached = { token, expiresAt: Date.now() + SIX_MONTHS_MINUS_BUFFER_SECONDS * 1000 };
  return token;
}
