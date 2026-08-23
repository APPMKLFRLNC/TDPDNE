import { writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface PlaylistEntry {
  filePath: string;
  title: string;
  artist: string;
  durationSeconds?: number;
}

/**
 * Writes a standard M3U8 playlist that DJ software can import or watch for changes.
 * Written atomically (tmp file + rename) so the DJ software never reads a half-written file.
 */
export async function writeM3U8(entries: PlaylistEntry[], hotfolderPath: string, filename: string): Promise<string> {
  const lines = ['#EXTM3U'];
  for (const entry of entries) {
    lines.push(`#EXTINF:${entry.durationSeconds ?? -1},${entry.artist} - ${entry.title}`);
    lines.push(entry.filePath);
  }

  await mkdir(hotfolderPath, { recursive: true });
  const finalPath = path.join(hotfolderPath, filename);
  const tmpPath = `${finalPath}.tmp`;
  await writeFile(tmpPath, lines.join('\n') + '\n', 'utf-8');
  await rename(tmpPath, finalPath);
  return finalPath;
}
