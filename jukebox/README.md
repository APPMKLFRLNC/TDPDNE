# Party Jukebox

Guests search Apple Music and add requests right on the iPad — no phone, no
QR code, no account of their own needed. This app matches each request
against the DJ's local music library and keeps a hot-folder playlist file in
sync so the DJ's own software (rekordbox, Serato, Traktor, VirtualDJ, …) can
pick it up.

## How it actually works (read this first)

One real limitation shapes this design — worth understanding before you
set it up:

**No remote control of DJ software.** Serato/rekordbox/Traktor/VirtualDJ
don't accept pushes from third-party apps. The realistic hand-off is: the
app writes an **M3U8 playlist file** into a folder your DJ software watches
or can import, but only for songs that already exist as files in the DJ's
own local library — a streaming-only Apple Music track has no local file
path to add to a crate. Anything not found locally shows up in the kiosk
queue tagged "Search manually" so the DJ can grab it from their own
crates/streaming tab.

So the flow is: guest searches on the iPad → taps a result → app tries to
match it to a file already in the DJ's library → if matched, it's added to
the hot-folder M3U8 (DJ reloads/re-imports that playlist in their
software); if not matched, the DJ sees it in the queue and finds it
manually.

## Setup

### 1. Apple Music developer credentials (required)

The kiosk's search box needs an Apple Developer account with MusicKit
enabled — no per-guest sign-in required, this is app-level only:

1. Create a MusicKit identifier and a private key (`.p8`) at
   https://developer.apple.com/account/resources/identifiers/list/musicId
2. Note your **Team ID** and the key's **Key ID**, and save the `.p8` file
   somewhere on the machine running this app (e.g. `./secrets/AuthKey.p8`).

### 2. Local config

```
cp .env.example .env
```

Fill in:

- `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH` — required, powers search
- `APPLE_MUSIC_STOREFRONT` — 2-letter storefront code (default `us`)
- `LIBRARY_PATH` — folder of the DJ's local audio files (scanned for tag
  matching; supports mp3/m4a/flac/wav/aiff)
- `HOTFOLDER_PATH` — folder your DJ software watches/imports playlists from
- `POLL_INTERVAL_SECONDS` — only relevant if you use the optional playlist
  sync below

### 3. Run it

```
npm install
npm run dev      # auto-reload
# or
npm run build && npm start
```

Open `http://<this-machine>:3000` on the iPad (Safari, "Add to Home
Screen" for a full-screen kiosk feel). Guests type into the search box,
tap a result, and it lands in the queue instantly.

### Preview without any Apple credentials

Set `DEMO_MODE=true` in `.env` and run the app — it seeds fake incoming
requests every few seconds so you can see the kiosk UI, matching, and
hot-folder sync working end-to-end before you have real credentials.

## Optional: also save requests into a real Apple Music playlist

Not required for the app to work — the kiosk search-and-add above is the
whole flow on its own. But if you'd like a persistent record of everything
requested (viewable in the Apple Music app later), or want to also accept
songs someone adds straight from the Apple Music app:

1. Set `APPLE_MUSIC_PLAYLIST_ID` — find it by tapping **Connect Apple
   Music** on the kiosk (a one-time MusicKit sign-in) and then calling
   `GET /api/apple-music/library-playlists` to list your library playlists
   with their IDs.
2. Restart the app. From then on, kiosk requests are also mirrored into
   that playlist (best-effort — a failure here never blocks the request
   from landing in the queue), and the app polls that playlist every
   `POLL_INTERVAL_SECONDS` for anything added outside the kiosk.

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
  config.ts                 env config
  appleMusicToken.ts         signs the MusicKit developer JWT
  appleMusicClient.ts         Apple Music API calls (catalog search, library playlist, mirroring)
  libraryScanner.ts           scans/tags the DJ's local audio files
  matcher.ts                   fuzzy-matches a request to a local file
  playlistWriter.ts            writes the hot-folder M3U8
  hotfolderSync.ts              rebuilds the hot-folder from the current queue
  requestHandler.ts             shared "add a new request" logic (dedupe, match, sync)
  poller.ts                     optional: polls a real playlist for externally-added tracks
  store.ts                      JSON-file persisted queue/state
  demo.ts                       fake data generator for DEMO_MODE
  server.ts                     Express API + static kiosk hosting
  index.ts                      entrypoint
public/                       the iPad-facing kiosk page (search + live queue)
```
