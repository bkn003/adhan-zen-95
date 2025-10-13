#!/usr/bin/env bash
set -e

# Copies the Adhan sound into Android res/raw as required by Capacitor Local Notifications

SRC_FILE="public/adhan-native.mp3"
DEST_DIR="android/app/src/main/res/raw"
DEST_FILE="$DEST_DIR/azan1.mp3"

if [ ! -f "$SRC_FILE" ]; then
  echo "Missing $SRC_FILE. Ensure the file exists."
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SRC_FILE" "$DEST_FILE"

echo "Copied $SRC_FILE to $DEST_FILE"
