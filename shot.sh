#!/bin/sh
# Turn any screenshot into a Chrome Web Store screenshot: exactly 1280x800,
# full bleed, no padding bars. Scales to cover, then center-crops the overflow.
#
#   ./shot.sh ~/Desktop/whatever.png            -> shots/whatever-1280x800.png
#   ./shot.sh ~/Desktop/*.png                   -> one output per input
#
# Retina Macs capture at 2x, so a 1280x800 region lands as 2560x1600. That is
# fine, it just gets scaled back down here. Capture generously and let this crop.
set -e
cd "$(dirname "$0")"
mkdir -p shots

[ $# -gt 0 ] || { echo "usage: ./shot.sh <image> [image...]" >&2; exit 1; }

for src in "$@"; do
  [ -f "$src" ] || { echo "skip (not a file): $src" >&2; continue; }

  base=$(basename "$src"); base=${base%.*}
  out="shots/$base-1280x800.png"
  tmp=$(mktemp -t shot).png

  w=$(sips -g pixelWidth  "$src" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')

  # Scale so the image covers 1280x800, rounding up so neither side falls short.
  nw=$(awk -v w="$w" -v h="$h" 'BEGIN{s=1280/w; t=800/h; if(t>s)s=t; printf "%d", int(w*s)+1}')
  nh=$(awk -v w="$w" -v h="$h" 'BEGIN{s=1280/w; t=800/h; if(t>s)s=t; printf "%d", int(h*s)+1}')

  sips -s format png "$src" --out "$tmp" >/dev/null
  sips -z "$nh" "$nw" "$tmp" >/dev/null   # resample to cover (keeps aspect)
  sips -c 800 1280 "$tmp" >/dev/null      # center-crop the overflow
  mv "$tmp" "$out"

  echo "$out  ($w x $h  ->  $(sips -g pixelWidth -g pixelHeight "$out" | awk '/pixelWidth/{W=$2}/pixelHeight/{H=$2}END{print W" x "H}'))"
done
