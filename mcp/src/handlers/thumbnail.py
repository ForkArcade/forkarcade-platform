import json
import math
import random
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw
from context import validate_game_path
from sprites import migrate_sprite_data

W, H = 72, 32

# Built-in 3x5 pixel font (each glyph is a list of 5 row strings, 3 chars wide)
PIXEL_FONT = {
    "A": [".1.", "1.1", "111", "1.1", "1.1"],
    "B": ["11.", "1.1", "11.", "1.1", "11."],
    "C": ["111", "1..", "1..", "1..", "111"],
    "D": ["11.", "1.1", "1.1", "1.1", "11."],
    "E": ["111", "1..", "111", "1..", "111"],
    "F": ["111", "1..", "111", "1..", "1.."],
    "G": ["111", "1..", "1.1", "1.1", "111"],
    "H": ["1.1", "1.1", "111", "1.1", "1.1"],
    "I": ["111", ".1.", ".1.", ".1.", "111"],
    "J": ["111", "..1", "..1", "1.1", "111"],
    "K": ["1.1", "1.1", "11.", "1.1", "1.1"],
    "L": ["1..", "1..", "1..", "1..", "111"],
    "M": ["1.1", "111", "111", "1.1", "1.1"],
    "N": ["1.1", "111", "111", "111", "1.1"],
    "O": ["111", "1.1", "1.1", "1.1", "111"],
    "P": ["111", "1.1", "111", "1..", "1.."],
    "Q": ["111", "1.1", "1.1", "111", "..1"],
    "R": ["11.", "1.1", "11.", "1.1", "1.1"],
    "S": ["111", "1..", "111", "..1", "111"],
    "T": ["111", ".1.", ".1.", ".1.", ".1."],
    "U": ["1.1", "1.1", "1.1", "1.1", "111"],
    "V": ["1.1", "1.1", "1.1", "1.1", ".1."],
    "W": ["1.1", "1.1", "111", "111", "1.1"],
    "X": ["1.1", "1.1", ".1.", "1.1", "1.1"],
    "Y": ["1.1", "1.1", ".1.", ".1.", ".1."],
    "Z": ["111", "..1", ".1.", "1..", "111"],
    "0": ["111", "1.1", "1.1", "1.1", "111"],
    "1": [".1.", "11.", ".1.", ".1.", "111"],
    "2": ["111", "..1", "111", "1..", "111"],
    "3": ["111", "..1", "111", "..1", "111"],
    "4": ["1.1", "1.1", "111", "..1", "..1"],
    "5": ["111", "1..", "111", "..1", "111"],
    "6": ["111", "1..", "111", "1.1", "111"],
    "7": ["111", "..1", "..1", "..1", "..1"],
    "8": ["111", "1.1", "111", "1.1", "111"],
    "9": ["111", "1.1", "111", "..1", "111"],
    " ": ["...", "...", "...", "...", "..."],
    "-": ["...", "...", "111", "...", "..."],
    ".": ["...", "...", "...", "...", ".1."],
    ":": ["...", ".1.", "...", ".1.", "..."],
    "!": [".1.", ".1.", ".1.", "...", ".1."],
    "?": ["111", "..1", ".1.", "...", ".1."],
    "'": [".1.", ".1.", "...", "...", "..."],
}

_sprites_cache = {}
_sprites_cache_ts = {}
_SPRITES_CACHE_TTL = 60  # 1 minute


def _load_sprites(game_path):
    """Load sprites from _sprites.json in the game directory."""
    key = str(game_path)
    now = time.time()
    if key in _sprites_cache and (now - _sprites_cache_ts.get(key, 0)) < _SPRITES_CACHE_TTL:
        return _sprites_cache[key]
    sprites_path = game_path / "_sprites.json"
    if not sprites_path.exists():
        return {}
    data = migrate_sprite_data(json.loads(sprites_path.read_text()))
    _sprites_cache[key] = data
    _sprites_cache_ts[key] = now
    return data

RESAMPLE = {
    "nearest": Image.NEAREST,
    "bilinear": Image.BILINEAR,
    "bicubic": Image.BICUBIC,
    "lanczos": Image.LANCZOS,
}


def _hex(color):
    h = color.lstrip("#")
    if len(h) == 3:
        h = h[0]*2 + h[1]*2 + h[2]*2
    if len(h) == 4:
        h = h[0]*2 + h[1]*2 + h[2]*2 + h[3]*2
    if len(h) == 8:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16))
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def _put_scaled(canvas, draw, x, y, scale, color):
    """Draw a single pixel or scaled rectangle."""
    if scale <= 1:
        if 0 <= x < canvas.width and 0 <= y < canvas.height:
            canvas.putpixel((x, y), color)
    else:
        draw.rectangle([x, y, x + scale - 1, y + scale - 1], fill=color)


def _draw_glyphs(canvas, draw, text, x0, y0, color, scale):
    """Render text using the built-in 3x5 pixel font."""
    char_w = 4 * scale
    cx = x0
    for ch in text:
        glyph = PIXEL_FONT.get(ch, PIXEL_FONT.get(" "))
        if not glyph:
            cx += char_w
            continue
        for gy, row in enumerate(glyph):
            for gx, pixel in enumerate(row):
                if pixel == "1":
                    _put_scaled(canvas, draw, cx + gx * scale, y0 + gy * scale, scale, color)
        cx += char_w


# --- Operation handlers ---

def _op_fill(canvas, draw, op, game_path, warnings):
    draw.rectangle([0, 0, canvas.width - 1, canvas.height - 1], fill=_hex(op["fill"]))

def _op_rect(canvas, draw, op, game_path, warnings):
    r = op["rect"]
    x, y = r.get("x", 0), r.get("y", 0)
    w, h = r["w"], r["h"]
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=_hex(r["color"]))

def _op_gradient(canvas, draw, op, game_path, warnings):
    g = op["gradient"]
    x0, y0 = g.get("x", 0), g.get("y", 0)
    gw = g.get("w", canvas.width)
    gh = g.get("h", canvas.height)
    c1, c2 = _hex(g["from"]), _hex(g["to"])
    vertical = g.get("direction", "vertical") == "vertical"
    steps = gh if vertical else gw
    for i in range(steps):
        frac = i / max(steps - 1, 1)
        c = tuple(int(c1[j] + (c2[j] - c1[j]) * frac) for j in range(4))
        if vertical:
            draw.line([(x0, y0 + i), (x0 + gw - 1, y0 + i)], fill=c)
        else:
            draw.line([(x0 + i, y0), (x0 + i, y0 + gh - 1)], fill=c)

def _op_circle(canvas, draw, op, game_path, warnings):
    c = op["circle"]
    cx, cy, r = c["cx"], c["cy"], c["r"]
    fill = _hex(c["color"]) if "color" in c else None
    outline = _hex(c["outline"]) if "outline" in c else None
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=outline, width=c.get("width", 1))

def _op_polygon(canvas, draw, op, game_path, warnings):
    p = op["polygon"]
    pts = [tuple(pt) for pt in p["points"]]
    fill = _hex(p["color"]) if "color" in p else None
    outline = _hex(p["outline"]) if "outline" in p else None
    draw.polygon(pts, fill=fill, outline=outline, width=p.get("width", 1))

def _op_triangle(canvas, draw, op, game_path, warnings):
    t = op["triangle"]
    draw.polygon([tuple(p) for p in t["points"]], fill=_hex(t["color"]))

def _op_line(canvas, draw, op, game_path, warnings):
    ln = op["line"]
    draw.line([(ln["x1"], ln["y1"]), (ln["x2"], ln["y2"])], fill=_hex(ln["color"]), width=ln.get("width", 1))

def _op_scatter(canvas, draw, op, game_path, warnings):
    s = op["scatter"]
    color = _hex(s["color"])
    count = s.get("count", 20)
    x0, y0 = s.get("x", 0), s.get("y", 0)
    sw = s.get("w", canvas.width)
    sh = s.get("h", canvas.height)
    rng = random.Random(s.get("seed", 42))
    for _ in range(count):
        px, py = x0 + rng.randint(0, sw - 1), y0 + rng.randint(0, sh - 1)
        if 0 <= px < canvas.width and 0 <= py < canvas.height:
            canvas.putpixel((px, py), color)

def _op_dither(canvas, draw, op, game_path, warnings):
    d = op["dither"]
    color = _hex(d["color"])
    x0, y0 = d.get("x", 0), d.get("y", 0)
    dw, dh = d.get("w", canvas.width), d.get("h", canvas.height)
    density = d.get("density", 0.3)
    rng = random.Random(d.get("seed", 42))
    for py in range(y0, y0 + dh):
        for px in range(x0, x0 + dw):
            if rng.random() < density and 0 <= px < canvas.width and 0 <= py < canvas.height:
                canvas.putpixel((px, py), color)

def _op_pixels(canvas, draw, op, game_path, warnings):
    p = op["pixels"]
    palette = p.get("palette", {})
    rows = p.get("rows", [])
    x0, y0 = p.get("x", 0), p.get("y", 0)
    color_map = {ch: _hex(c) for ch, c in palette.items()}
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch in color_map:
                px, py = x0 + dx, y0 + dy
                if 0 <= px < canvas.width and 0 <= py < canvas.height:
                    canvas.putpixel((px, py), color_map[ch])

def _op_sprite(canvas, draw, op, game_path, warnings):
    s = op["sprite"]
    if not game_path:
        warnings.append("sprite: no game_path — skipped")
        return
    sprites = _load_sprites(game_path)
    category = s.get("category", "")
    name = s.get("name", "")
    sprite_def = sprites.get(category, {}).get(name)
    if not sprite_def:
        warnings.append(f"sprite: '{category}/{name}' not found — skipped")
        return
    x0, y0 = s.get("x", 0), s.get("y", 0)
    scale = s.get("scale", 1)
    frame = s.get("frame", 0)
    palette = sprite_def.get("palette", {})
    origin = sprite_def.get("origin", [0, 0])
    frames = sprite_def.get("frames", [])
    if not frames:
        return
    pixel_rows = frames[frame % len(frames)]
    color_map = {ch: _hex(c) for ch, c in palette.items()}
    ox, oy = origin[0] * scale, origin[1] * scale
    for dy, row in enumerate(pixel_rows):
        for dx, ch in enumerate(row):
            if ch == "." or ch not in color_map:
                continue
            _put_scaled(canvas, draw, x0 - ox + dx * scale, y0 - oy + dy * scale, scale, color_map[ch])

def _op_pixel_text(canvas, draw, op, game_path, warnings):
    t = op["pixel_text"]
    text = t.get("text", "").upper()
    x0, y0 = t.get("x", 0), t.get("y", 0)
    color = _hex(t["color"]) if "color" in t else (255, 255, 255, 255)
    shadow = _hex(t["shadow"]) if "shadow" in t else None
    scale = t.get("scale", 1)
    if shadow:
        _draw_glyphs(canvas, draw, text, x0 + scale, y0 + scale, shadow, scale)
    _draw_glyphs(canvas, draw, text, x0, y0, color, scale)

def _op_hex_grid(canvas, draw, op, game_path, warnings):
    g = op["hex_grid"]
    cols = g.get("cols", 8)
    rows = g.get("rows", 6)
    hex_size = g.get("hex_size", 4)
    x0, y0 = g.get("x", 0), g.get("y", 0)
    terrain = g.get("terrain", [])
    colors = g.get("colors", {})
    outline_color = _hex(g["outline"]) if "outline" in g else None
    outline_width = g.get("outline_width", 1)
    default_color = _hex(g.get("default_color", "#5a8c3c"))
    hex_w = hex_size * math.sqrt(3)
    hex_h = hex_size * 2
    for r in range(rows):
        for c in range(cols):
            cx = x0 + c * hex_w + (hex_w / 2 if r % 2 == 1 else 0) + hex_w / 2
            cy = y0 + r * hex_h * 0.75 + hex_h / 2
            fill = default_color
            if r < len(terrain) and c < len(terrain[r]):
                t_name = terrain[r][c]
                if t_name in colors:
                    fill = _hex(colors[t_name])
                else:
                    warnings.append(f"hex_grid: terrain '{t_name}' not in colors — using default")
            corners = []
            for i in range(6):
                angle = math.radians(60 * i - 30)
                corners.append((cx + (hex_size - 1) * math.cos(angle), cy + (hex_size - 1) * math.sin(angle)))
            draw.polygon(corners, fill=fill, outline=outline_color, width=outline_width)


# Dispatch table — maps operation key to handler
_OP_DISPATCH = {
    "fill": _op_fill,
    "rect": _op_rect,
    "gradient": _op_gradient,
    "circle": _op_circle,
    "polygon": _op_polygon,
    "triangle": _op_triangle,
    "line": _op_line,
    "scatter": _op_scatter,
    "dither": _op_dither,
    "pixels": _op_pixels,
    "sprite": _op_sprite,
    "pixel_text": _op_pixel_text,
    "hex_grid": _op_hex_grid,
}


def _draw_op(canvas, op, game_path=None, warnings=None):
    draw = ImageDraw.Draw(canvas, "RGBA")
    for key, handler in _OP_DISPATCH.items():
        if key in op:
            handler(canvas, draw, op, game_path, warnings)
            return
    if warnings is not None:
        warnings.append(f"Unknown operation: {list(op.keys())}")


def create_thumbnail(args):
    game_path = validate_game_path(args["path"])
    layers = args.get("layers", [])
    out_w = min(args.get("w", W), 1024)
    out_h = min(args.get("h", H), 1024)

    if not layers:
        return json.dumps({"error": "layers is required — list of layers [{res, aa, ops}, ...]"})

    warnings = []
    final = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))

    for layer in layers:
        res = layer.get("res", [out_w, out_h])
        aa = layer.get("aa", "bilinear")
        opacity = layer.get("opacity", 1.0)
        ops = layer.get("ops", [])
        resample = RESAMPLE.get(aa, Image.BILINEAR)

        lw, lh = res[0], res[1]
        canvas = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))

        for op in ops:
            _draw_op(canvas, op, game_path=game_path, warnings=warnings)

        if (lw, lh) != (out_w, out_h):
            canvas = canvas.resize((out_w, out_h), resample)

        if opacity < 1.0:
            alpha = canvas.split()[3]
            alpha = alpha.point(lambda a, o=opacity: int(a * o))
            canvas.putalpha(alpha)

        final = Image.alpha_composite(final, canvas)

    out = final.convert("RGB")
    out_path = game_path / "_thumbnail.png"
    out.save(out_path)

    def_path = game_path / "_thumbnail.json"
    thumbnail_def = {"layers": args.get("layers", []), "w": out_w, "h": out_h}
    def_path.write_text(json.dumps(thumbnail_def, indent=2))

    pushed = False
    try:
        subprocess.run(["git", "add", "_thumbnail.png", "_thumbnail.json"], cwd=game_path, capture_output=True, timeout=10)
        subprocess.run(["git", "commit", "-m", "Update thumbnail"], cwd=game_path, capture_output=True, timeout=10)
        r = subprocess.run(["git", "push"], cwd=game_path, capture_output=True, timeout=30)
        pushed = r.returncode == 0
    except Exception as e:
        print(f"Warning: thumbnail git push failed: {e}", file=sys.stderr)

    git_msg = "Pushed to GitHub." if pushed else "Git push failed or skipped."
    result = {
        "ok": True,
        "message": f"Thumbnail saved ({out_w}x{out_h}, {len(layers)} layers). {git_msg}",
        "path": str(out_path),
    }
    if warnings:
        result["warnings"] = warnings
    return json.dumps(result)
