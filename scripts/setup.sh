#!/usr/bin/env bash
# One-time setup on a new machine: downloads the Phaser AE engine and the packs this game uses, then builds the game.
# Needs Node.js 20 or later and an internet connection. Run from the repo root:  bash scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

command -v node >/dev/null || { echo "Install Node.js 20 or later first: https://nodejs.org"; exit 1; }

# The engine tools need to know this is a Phaser AE game folder.
mkdir -p .phaser
[ -f .phaser/build.json ] || cp scripts/phaser-build.json .phaser/build.json

echo "1/3 Downloading the Phaser AE engine..."
npx -y @phaser-ae/cli update || true

echo "2/3 Downloading the packs listed in game/manifest.json..."
PACKS=$(node -e "console.log(require('./game/manifest.json').packs.map(p => p.id).join(' '))")
# shellcheck disable=SC2086
npm run -s packs -- add $PACKS

echo "3/3 Building the game..."
npm run -s build

echo "Done. Try:  npm run -s serve   (the game at http://localhost:4173)"
