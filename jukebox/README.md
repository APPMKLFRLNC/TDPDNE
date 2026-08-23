# Party Jukebox

Guests add songs to a shared Apple Music playlist. This app watches that
playlist, tries to match each new request against the DJ's local music
library, and keeps a hot-folder playlist file in sync so the DJ's own
software (rekordbox, Serato, Traktor, VirtualDJ, …) can pick it up. An
iPad (or any browser) shows a kiosk screen with a QR code to join the
playlist and a live view of the queue.

## How it actually works (read this first)

Two real limitations shape this design — worth understanding before you
set it up:

1. **No push notifications from Apple Music.** There's no way to be told
   the instant someone adds a song. The app *polls* the playlist's track
   list every `POLL_INTERVAL_SECONDS` and diffs it against what it's seen
   before.
2. **No remote control of DJ software.** Serato/rekordbox/Traktor/VirtualDJ
   don't accept pushes from third-party apps. The realistic hand-off is:
   the app writes an **M3U8 playlist file** into a folder your DJ software
   watches or can import, but only for songs that already exist as files in
   the DJ's own local library — a streaming-only Apple Music track has no
   local file path to add to a crate. Anything not found locally shows up
   in the kiosk queue tagged "Search manually" so the DJ can grab it by ear
   from their own crates/streaming tab.

So the realistic flow is: guest adds a song to the shared playlist → app
detects it and tries to match it to a file already in the DJ's library →
if matched, it's added to the hot-folder M3U8 (DJ reloads/re-imports that
playlist in their software); if not matched, the DJ sees it in the queue
and searches for it manually.

## Setup

### 1. Apple Music / MusicKit credentials

You need an Apple Developer account with MusicKit enabled:

1. Create a MusicKit identifier and a private key (`.p8`) at
   https://developer.apple.com/account/resources/identifiers/list/musicId
2. Note your **Team ID** and the key's **Key ID**, and save the `.p8` file
   somewhere on the machine running this app (e.g. `./secrets/AuthKey.p8`).

### 2. The shared playlist

In the Apple Music app, create a playlist, turn on **Collaborate**, and
share the invite link. That link is your `JOIN_URL` — it's what the QR
code on the kiosk screen points guests to.

You still need the playlist's *library ID* for the API (different from the
share link). Once the app is running and configured:

1. Open the kiosk page and tap **Connect Apple Music** — this authorizes
   the app to read your library on your behalf (a one-time MusicKit JS
   sign-in, done on the iPad).
2. Call `GET /api/apple-music/library-playlists` to list your library
   playlists with their IDs, and copy the right one into
   `APPLE_MUSIC_PLAYLIST_ID`.
3. Restart the app.

### 3. Local config

```
cp .env.example .env
```

Fill in:

- `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`, `APPLE_MUSIC_PLAYLIST_ID`
- `JOIN_URL` — the playlist's collaborate share link
- `LIBRARY_PATH` — folder of the DJ's local audio files (scanned for tag
  matching; supports mp3/m4a/flac/wav/aiff)
- `HOTFOLDER_PATH` — folder your DJ software watches/imports playlists from
- `POLL_INTERVAL_SECONDS` — how often to check the playlist (default 15s)

### 4. Run it

```
npm install
npm run dev      # ts-node style, auto-reload
# or
npm run build && npm start
```

Open `http://<this-machine>:3000` on the iPad (Safari, "Add to Home
Screen" for a full-screen kiosk feel).

### Preview without any Apple credentials

Set `DEMO_MODE=true` in `.env` and run the app — it seeds fake incoming
requests every few seconds so you can see the kiosk UI, matching, and
hot-folder sync working end-to-end before you have real credentials.

## Pointing your DJ software at the hot-folder

The app writes `HOTFOLDER_PATH/jukebox-queue.m3u8`, standard M3U8, rebuilt
every time a matched track is added. How each app picks it up differs:

- **VirtualDJ** — add `HOTFOLDER_PATH` as a watched folder; it auto-refreshes.
- **rekordbox** — File → Import Playlist, re-import to pick up changes (or
  point an auto-import/watch-folder feature at it, if your version has one).
- **Serato DJ** — import the `.m3u8` into a crate; re-import to refresh.
- **Traktor** — Import Playlist from the Browser panel.

None of these auto-refresh live the way a native crate does — reload
periodically or between sets.

## Project layout

```
src/
  config.ts              env config
  appleMusicToken.ts      signs the MusicKit developer JWT
  appleMusicClient.ts      Apple Music API calls (library playlist tracks)
  libraryScanner.ts        scans/tags the DJ's local audio files
  matcher.ts                fuzzy-matches a request to a local file
  playlistWriter.ts         writes the hot-folder M3U8
  poller.ts                 polls the playlist, drives matching + sync
  store.ts                  JSON-file persisted queue/state
  demo.ts                   fake data generator for DEMO_MODE
  server.ts                 Express API + static kiosk hosting
  index.ts                  entrypoint
public/                    the iPad-facing kiosk page
```
