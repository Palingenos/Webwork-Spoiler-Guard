#!/usr/bin/env python3
"""Make Chrome Web Store screenshots (exactly 1280x800) from window captures.

The browser window is about 2:1 once the chrome is cropped off, but the store
wants 1.6:1. Cropping to fill would cut ~300px off each side, which takes out
the sidebar on one side and the peek button on the other, so these are scaled
to fit and the leftover is filled with the page's own white background.
"""
import sys
from PIL import Image

W, H = 1280, 800

def chrome_height(im):
    """First row of the WeBWorK navy header, i.e. where browser chrome ends."""
    px = im.load()
    for y in range(im.height):
        r, g, b = px[60, y][:3]
        if b > 80 and b > r + 30 and g < 90:
            return y
    return 0

def popup_top(im):
    """Top of the extension popup, if one is open. It overlaps the browser
    chrome, so cropping the chrome blindly would decapitate it. Matched by a
    long contiguous run of the panel colour, so a dark toolbar icon or the
    window border doesn't count."""
    px = im.load()
    for y in range(im.height // 2):
        run = best = 0
        for x in range(im.width // 2, im.width):
            r, g, b = px[x, y][:3]
            if abs(r - 16) < 12 and abs(g - 23) < 12 and abs(b - 41) < 14:
                run += 1
                best = max(best, run)
            else:
                run = 0
        if best >= 400:
            return y
    return None


def popup_bounds(im, y):
    """Left/right edge of the popup panel on a row known to be inside it."""
    px = im.load()
    xs = [x for x in range(im.width)
          if abs(px[x, y][0] - 16) < 12 and abs(px[x, y][1] - 23) < 12
          and abs(px[x, y][2] - 41) < 14]
    return (min(xs), max(xs)) if xs else None


def flatten_chrome(im, top, bottom, popup):
    """Blank the browser chrome strip we had to keep for the popup's sake, so
    bookmark folder names don't ride along into the screenshot."""
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    spans = [(0, im.width)]
    if popup:
        l, r = popup
        spans = [(0, l), (r + 1, im.width)]
    for x0, x1 in spans:
        if x1 > x0:
            d.rectangle([x0, top, x1 - 1, bottom], fill=(60, 60, 60))


def crop_top(im):
    chrome = chrome_height(im)
    popup = popup_top(im)
    return min(chrome, popup - 4) if popup is not None else chrome


for path in sys.argv[1:]:
    im = Image.open(path).convert('RGB')
    top = crop_top(im)
    chrome = chrome_height(im)
    if top < chrome:   # popup forced us to keep some browser chrome
        pt = popup_top(im)
        flatten_chrome(im, top, chrome - 1, popup_bounds(im, pt + 30))
    im = im.crop((0, top, im.width, im.height))

    scale = min(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)

    canvas = Image.new('RGB', (W, H), (255, 255, 255))
    canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))

    out = f'shots/{path.split("/")[-1]}'
    canvas.save(out)
    print(f'{out}  {canvas.size}  (bands {(H - im.height) // 2}px)')
