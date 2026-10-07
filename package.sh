#!/bin/sh
# Builds the zip to upload to the Chrome Web Store.
set -e

cd "$(dirname "$0")"
version=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' manifest.json | head -1)
out="dist/webwork-spoiler-guard-$version.zip"

mkdir -p dist
rm -f "$out"

# Only what the extension actually needs. No dotfiles, no dev notes.
zip -r -X "$out" manifest.json src icons LICENSE PRIVACY.md \
  -x '*.DS_Store' '*/.*'

echo
echo "$out"
unzip -l "$out"
