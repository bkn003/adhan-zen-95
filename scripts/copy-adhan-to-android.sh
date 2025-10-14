#!/usr/bin/env bash
set -e

# Copies the Adhan sound into Android res/raw as required by Capacitor Local Notifications

SRC_FILE="public/adhan-native.mp3"
DEST_DIR="android/app/src/main/res/raw"
DEST_FILE="$DEST_DIR/azan1.mp3"

if [ ! -f "$SRC_FILE" ]; then
  echo "Missing $SRC_FILE. Downloading Adhan audio from IslamCan..."
  if command -v curl >/dev/null 2>&1; then
    curl -L -o "$SRC_FILE" "https://www.islamcan.com/audio/adhan/azan1.mp3"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$SRC_FILE" "https://www.islamcan.com/audio/adhan/azan1.mp3"
  else
    echo "Neither curl nor wget is available. Please download the file manually to $SRC_FILE"
    exit 1
  fi
fi

mkdir -p "$DEST_DIR"
cp "$SRC_FILE" "$DEST_FILE"

echo "Copied $SRC_FILE to $DEST_FILE"
