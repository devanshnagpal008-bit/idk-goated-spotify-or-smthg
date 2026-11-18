# 🎵 Sonora — Personal Music Streaming System

Sonora is a private, single-user personal music streaming app combining:
1. **Catalog:** YouTube Music's entire catalog (songs, albums, artists, remixes, covers, music videos) via `ytmusicapi` & `yt-dlp`.
2. **Audio Polish:** Apple Music-inspired aesthetics (translucent blur, dynamic album-art gradients, SF typography, time-synced karaoke lyrics, 10-band EQ presets, loudness normalization, 0–12s crossfade).
3. **Intelligence:** Spotify-style endless autoplay with personal taste re-ranking, Daily Mixes 1–6, and an AI natural-language prompt-to-playlist generator.
4. **Local Lossless Support:** Embedded local music scanner (`mutagen`) that indexes and streams your FLAC, ALAC, WAV, and MP3 files with HTTP 206 partial-range streaming and a prominent **"Lossless"** badge.

---

## 🏛️ Architecture & Monorepo Structure

```
sonora/
├── apps/
│   ├── mobile/                  # React Native + Expo (SDK 58) + TypeScript
│   │   ├── src/
│   │   │   ├── components/      # MiniPlayer, NowPlayingSheet, QueueDrawer, AudioSettingsModal, LyricsView, etc.
│   │   │   ├── screens/         # HomeScreen, SearchScreen, LibraryScreen
│   │   │   ├── services/        # audioService (dual-sound crossfade, normalization), colorExtractor
│   │   │   └── store/           # Zustand player & library store
│   │   ├── App.tsx
│   │   └── package.json
│   └── server/                  # Python 3.15 FastAPI backend
│       ├── app/
│       │   ├── api/             # search, stream, playlists, library, local, home, lyrics, downloads, sync
│       │   ├── core/            # config, sqlite async db, security token middleware
│       │   ├── models/          # SQLAlchemy async models
│       │   └── services/        # resolver, local scanner, taste engine, AI generator, lyrics, downloads
│       ├── tests/               # 19 automated tests covering all milestones
│       └── requirements.txt
├── packages/
│   └── shared/                  # Common TypeScript interfaces & API contracts
├── data/                        # SQLite DB, local music storage, downloads cache, cookies.txt
├── scripts/                     # Automated verification scripts & yt-dlp updaters
└── docs/screenshots/            # Captured visual proof across all milestones
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python:** 3.10 to 3.15
- **Node.js:** v18+ (tested on Node v22)
- **Git**

---

### 2. Backend Setup (`apps/server`)

#### Step 1: Create Virtual Environment & Install Dependencies
Open a terminal in `apps/server`:

```powershell
# Windows PowerShell:
Set-Location apps\server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

```bash
# macOS / Linux / WSL:
cd apps/server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> **Note on Windows Application Control (AppLocker / WDAC):**
> Sonora's dependencies are configured for pure-Python execution (SQLAlchemy runs with pure-Python dispatch and Uvicorn runs with pure-Python `h11`), avoiding blocked native `.pyd` dynamic links.

#### Step 2: Configure Environment (`.env`)
Create an `.env` file in `apps/server/` (or copy from `.env.example`):

```env
APP_NAME=Sonora
DEBUG=True
HOST=0.0.0.0
PORT=8000
SECRET_KEY=sonora_super_secret_local_token_12345
DATABASE_URL=sqlite+aiosqlite:///../../data/sonora.db
DATA_DIR=../../data
COOKIES_FILE=../../data/cookies.txt
LOCAL_MUSIC_DIR=../../data/local_music
DOWNLOADS_DIR=../../data/downloads
PREFER_HIGH_QUALITY=True
CORS_ORIGINS=["*"]
```

#### Step 3: Run the Backend
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The server will start at `http://127.0.0.1:8000` (or `http://<YOUR_LAN_IP>:8000`).
Interactive Swagger documentation is available at: `http://127.0.0.1:8000/docs`.

---

### 3. YouTube Premium Cookies (For AAC 256kbps & Account Sync)

By default, YouTube serves audio up to ~160 kbps Opus (`itag 251`) or 128 kbps AAC (`itag 140`).
With a YouTube Premium subscription, you can unlock **256 kbps AAC (`itag 141`)**:

1. Install a browser extension such as *Get cookies.txt LOCALLY* (Chrome/Firefox).
2. Log into your YouTube Music account in the browser.
3. Export cookies for `youtube.com` in Netscape format.
4. Save the file directly as `data/cookies.txt` in the Sonora root.
5. The resolver automatically detects this file, authenticates `yt-dlp` requests, and prioritizes `itag 141`.

---

### 4. Running the Mobile App (`apps/mobile`)

Open another terminal in `apps/mobile`:

```bash
cd apps/mobile
npm install --legacy-peer-deps
```

#### Run on Web (Quick Preview in Browser):
```bash
npx expo start --web --port 8081
```
Open `http://localhost:8081` in Chrome or Edge.

#### Run on Android / iOS Phone (Expo Go):
1. Install **Expo Go** from Google Play Store or iOS App Store.
2. In `apps/mobile/src/store/playerStore.ts`, ensure `API_BASE` is set to your computer's local Wi-Fi IP:
   ```typescript
   export const API_BASE = 'http://192.168.1.X:8000';
   ```
3. Start Expo:
   ```bash
   npx expo start
   ```
4. Scan the displayed QR code with your phone camera (iOS) or Expo Go app (Android).

#### Build Local Standalone APK (Android):
```bash
npx expo run:android
# or build standalone release APK with EAS:
npx eas build -p android --profile preview
```

---

## 🎧 Audio Engine & Honest Badging

Sonora never lies about audio quality:
- **`AAC 256 kbps` (High Quality):** Resolved when cookies enable `itag 141`.
- **`Opus ~160 kbps` (Standard):** YouTube's default high-efficiency WebM audio (`itag 251`).
- **`AAC 128 kbps` (Compatible):** YouTube's fallback audio stream (`itag 140`).
- **`Lossless (FLAC/ALAC)` (Pure Audio):** Local scans streamed bit-for-bit via HTTP 206 Range requests.

### Audio Settings
Tap the **Audio Settings (Sliders)** button on the Now Playing screen:
- **Loudness Normalization:** Automatically adjusts gain to -14 LUFS using YouTube's `loudnessDb` metadata.
- **Crossfade:** Configurable from `0s` (gapless) to `12s` with smooth dual-sound gain interpolation.
- **10-Band EQ Presets:** *Flat, Bass Boost, Acoustic, Vocal Clarity, Electronic, Rock, Classical*.
- **Quality Selector:** *Always Best*, *Auto*, *Data Saver*.

---

## 🧠 Intelligence & Features

### 1. Endless Autoplay & Local Taste Profile
- Every track play, skip, 30s listen, and like updates an exponential recency-decay taste vector.
- When your playback queue reaches the end, Sonora fetches the YouTube Music Radio Watch playlist and re-ranks the candidates according to your taste score.

### 2. AI Prompt-to-Playlist
- Tap the **🪄 AI Playlist** button on the Home Screen.
- Enter any natural language prompt, e.g.:
  - *"Late night coding in cyberpunk Tokyo, 45 minutes"*
  - *"Rainy Sunday morning acoustic indie folk, 30 minutes"*
- The backend parses mood, tempo, and target duration, queries relevant catalog tracks, and creates a ready-to-play playlist in your library.

### 3. Time-Synced Karaoke Lyrics
- Tap the **Lyrics (Speech Bubble)** button on Now Playing.
- Sonora queries **LRCLIB** for millisecond-precision LRC synchronized lyrics.
- Lyrics smoothly scroll with an Apple Music-style luminous glow on the active line, and tapping any line seeks the track directly to that timestamp.
- Plain lyrics from `ytmusicapi` serve as an automatic fallback.

### 4. Local Lossless Library
- Place your audio files (`.flac`, `.alac`, `.wav`, `.mp3`, `.m4a`) into `data/local_music/`.
- Sonora scans tag metadata and embedded artwork using `mutagen`.
- Local tracks can be freely added to playlists alongside YouTube streaming tracks.

### 5. Offline Downloads
- Audio streams can be cached to `data/downloads/` for seamless offline playback with byte-range resume support.

---

## 🔄 yt-dlp Maintenance

YouTube frequently changes signature algorithms. When audio resolution fails, update `yt-dlp` with a single command:

#### Windows PowerShell:
```powershell
.\scripts\update_ytdlp.ps1
```

#### macOS / Linux / WSL:
```bash
./scripts/update_ytdlp.sh
```

Restart the Sonora backend server after updating.

---

## 🧪 Test Suite

Run the complete 19-test automated test suite:

```bash
cd apps/server
python -m pytest tests/ -v
```

All tests across M1–M5 are covered:
- Codec selection and honest label verification
- Expiration timestamp parsing from Google video URLs
- Search, stream resolution, and health endpoints
- Local file scanning and HTTP 206 partial Range streaming
- Playlist CRUD, track reordering, and duplicate operations
- Library likes, listening history, and session restoration
- Taste profile calculation and radio re-ranking
- Natural language prompt parsing and AI playlist generator
- LRC time-synced lyrics parsing and LRCLIB integration
- YouTube account cookies and sync endpoints
- Offline downloads management

---

## 🛠️ Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **HTTP 403 on stream URL** | Stream URL expired after 6 hours | The client automatically calls `/api/stream/{id}` to refresh the stream URL. |
| **Windows AppLocker error on `.pyd`** | Enterprise security policy blocks compiled DLLs in user directory | Sonora runs pure-Python SQLAlchemy and h11. Ensure no manual C-extensions are forced. |
| **Cannot connect phone to server** | Host bound to `127.0.0.1` or firewall blocking port 8000 | Run backend with `--host 0.0.0.0` and allow TCP port 8000 through Windows Firewall. Set `API_BASE` in `playerStore.ts` to your machine's LAN IP (`192.168.x.x`). |
| **No AAC 256kbps badge** | Missing YouTube Premium cookies | Export cookies via browser extension to `data/cookies.txt`. Check `/api/sync/status` in browser. |
| **npm peer dependency conflict** | React 19 vs Expo peer requirements | Always use `npm install --legacy-peer-deps` in `apps/mobile`. |

---

## 📜 License
Private, single-user personal project. Not licensed or intended for public distribution or commercial use.
