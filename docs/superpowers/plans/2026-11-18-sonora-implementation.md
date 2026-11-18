# Sonora Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sonora, a personal music streaming app featuring YouTube Music catalog search/browse, high-fidelity stream resolution with honest bitrate badging, Apple Music-inspired UI polish, Spotify-style intelligence/autoplay, and local lossless audio support.

**Architecture:** Monorepo with React Native + Expo client in `apps/mobile`, Python FastAPI backend in `apps/server`, shared types in `packages/shared`, SQLite storage with WAL mode, `ytmusicapi` for catalog/radio, and `yt-dlp` for stream resolution.

**Tech Stack:** React Native, Expo, TypeScript, Zustand, Python 3.15, FastAPI, ytmusicapi, yt-dlp, SQLAlchemy, SQLite, Mutagen.

**Spec:** [sonora_implementation_plan.md](file:///C:/Users/techn/.gemini/antigravity/brain/0280ac8f-8b53-4976-bd01-284dd278b793/sonora_implementation_plan.md)

## Global Constraints
- Python 3.15.2 with virtual environment in `apps/server/.venv`
- Node.js 22.14.0 with npm workspaces for `apps/mobile` and `packages/shared`
- Search latency under 500ms with in-memory caching
- Audio quality prioritization: AAC 256kbps -> Opus 160kbps -> AAC 128kbps -> Next best
- Stream expiration handling with automatic pre-buffer and retry
- SQLite with WAL journal mode enabled

---

### Task 1: Monorepo Scaffolding & Shared Types
- Scaffold `apps/mobile`, `apps/server`, `packages/shared`, `data`, and `docs`
- Implement TypeScript definitions for `Track`, `Album`, `Artist`, `Playlist`, `StreamInfo`, `AudioCodec`, and `PlayEvent` in `packages/shared`
- Initialize root `package.json` with npm workspaces

### Task 2: Backend Core, ytmusicapi Service & yt-dlp Stream Resolver
- Set up FastAPI app with CORS, structured logging, and configuration
- Implement `ytmusic_service.py` wrapping search, browse, artist/album lookup, and watch-playlist
- Implement `stream_resolver.py` wrapping `yt-dlp` with format ranking and in-memory TTL caching
- Build REST endpoints: `/api/search`, `/api/tracks/{id}`, `/api/streams/{id}`, `/api/browse/home`
- Write and run unit tests for stream resolution and search mapping

### Task 3: Mobile App Shell, Zustand Player Store & Mini-Player
- Initialize Expo app with TypeScript in `apps/mobile`
- Implement Zustand stores: `usePlayerStore`, `useLibraryStore`, `useSettingsStore`
- Implement search screen with real-time API integration
- Implement Apple Music floating mini-player with play/pause and progress scrub
- Verify end-to-end audio streaming from backend to client
