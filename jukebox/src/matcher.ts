import type { LibraryTrack } from './libraryScanner.js';

const MATCH_THRESHOLD = 0.72;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\((feat|ft)\.?[^)]*\)/g, '')
    .replace(/\[(feat|ft)\.?[^\]]*\]/g, '')
    .replace(/\(.*?(remaster|remix|live|edit).*?\)/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[rows - 1][cols - 1];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length, 1);
}

export interface MatchResult {
  track: LibraryTrack;
  score: number;
}

/** Finds the closest local file for a requested title/artist, or null if nothing is close enough. */
export function findBestMatch(title: string, artist: string, library: LibraryTrack[]): MatchResult | null {
  const nTitle = normalize(title);
  const nArtist = normalize(artist);

  let best: MatchResult | null = null;
  for (const track of library) {
    const titleScore = similarity(nTitle, normalize(track.title));
    const artistScore = similarity(nArtist, normalize(track.artist));
    const score = titleScore * 0.7 + artistScore * 0.3;
    if (!best || score > best.score) {
      best = { track, score };
    }
  }

  return best && best.score >= MATCH_THRESHOLD ? best : null;
}
