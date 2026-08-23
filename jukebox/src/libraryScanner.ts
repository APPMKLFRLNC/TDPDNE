import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from 'music-metadata';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.flac', '.wav', '.aiff', '.aif', '.alac']);

export interface LibraryTrack {
  filePath: string;
  title: string;
  artist: string;
  durationSeconds?: number;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

/** Walks a local music folder and reads tags so requests can be matched to real files. */
export async function scanLibrary(libraryPath: string): Promise<LibraryTrack[]> {
  const files = await walk(libraryPath);
  const tracks: LibraryTrack[] = [];

  for (const filePath of files) {
    try {
      const meta = await parseFile(filePath, { duration: true });
      tracks.push({
        filePath,
        title: meta.common.title ?? path.parse(filePath).name,
        artist: meta.common.artist ?? meta.common.albumartist ?? 'Unknown Artist',
        durationSeconds: meta.format.duration ? Math.round(meta.format.duration) : undefined,
      });
    } catch {
      // Unreadable/corrupt file -- skip it rather than fail the whole scan.
    }
  }

  return tracks;
}
