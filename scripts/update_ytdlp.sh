#!/usr/bin/env bash
set -e

# Sonora - yt-dlp Updater Script for Linux / macOS / WSL
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$REPO_ROOT/apps/server"
VENV_PY="$SERVER_DIR/.venv/bin/python"

if [ ! -f "$VENV_PY" ]; then
    VENV_PY="$SERVER_DIR/.venv/Scripts/python.exe"
fi

if [ ! -f "$VENV_PY" ]; then
    echo "Error: Virtual environment not found in $SERVER_DIR/.venv"
    exit 1
fi

echo "==> Current yt-dlp version:"
"$VENV_PY" -m yt_dlp --version || true

echo "==> Upgrading yt-dlp via pip..."
"$VENV_PY" -m pip install --upgrade yt-dlp

echo "==> Updated yt-dlp version:"
"$VENV_PY" -m yt_dlp --version

echo -e "\n[SUCCESS] yt-dlp updated successfully! Please restart the Sonora backend if running."
