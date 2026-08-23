import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  durationSeconds?: number;
  addedAt: string;
  matched: boolean;
  localPath?: string;
}

export interface State {
  musicUserToken: string | null;
  knownTrackIds: string[];
  queue: QueueItem[];
}

function emptyState(): State {
  return { musicUserToken: null, knownTrackIds: [], queue: [] };
}

export class Store {
  private state: State = emptyState();

  constructor(private filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      this.state = { ...emptyState(), ...JSON.parse(raw) };
    } catch {
      this.state = emptyState();
    }
  }

  get(): State {
    return this.state;
  }

  setUserToken(token: string): void {
    this.state.musicUserToken = token;
  }

  hasSeenTrack(id: string): boolean {
    return this.state.knownTrackIds.includes(id);
  }

  addQueueItem(item: QueueItem): void {
    this.state.knownTrackIds.push(item.id);
    this.state.queue.push(item);
  }

  async save(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }
}
