import json
import math
import random
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

_HERE = Path(__file__).resolve().parent
PLATFORM_ROOT = _HERE.parent.parent.parent
GAMES_DIR = PLATFORM_ROOT.parent / "games"

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


def _load_sprites(game_path):
    """Load sprites from _sprites.json in the game directory."""
    key = str(game_path)
    if key in _sprites_cache:
        return _sprites_cache[key]
    sprites_path = game_path / "_sprites.json"
    if not sprites_path.exists():
        return {}
    data = json.loads(sprites_path.read_text())
    _sprites_cache[key] = data
    return data

RESAMPLE = {
    "nearest": Image.NEAREST,
    "bilinear": Image.BILINEAR,
    "bicubic": Image.BICUBIC,
    "lanczos": Image.LANCZOS,
}


def _validate_game_path(path_str):
    game_path = Path(path_str).resolve()
    try:
        game_path.relative_to(GAMES_DIR.resolve())
    except ValueError:
        raise ValueError(f"Path must be within games directory: {GAMES_DIR}")
    return game_path


def _hex(color):
    h = color.lstrip("#")
    if len(h) == 3:
        h = h[0]*2 + h[1]*2 + h[2]*2
    if len(h) == 4:
        h = h[0]*2 + h[1]*2 + h[2]*2 + h[3]*2
    if len(h) == 8:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16))
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def _draw_op(canvas, op, game_path=None):
    draw = ImageDraw.Draw(canvas, "RGBA")

    if "fill" in op:
        draw.rectangle([0, 0, canvas.width - 1, canvas.height - 1], fill=_hex(op["fill"]))

    elif "rect" in op:
        r = op["rect"]
        x, y = r.get("x", 0), r.get("y", 0)
        w, h = r["w"], r["h"]
        draw.rectangle([x, y, x + w - 1, y + h - 1], fill=_hex(r["color"]))

    elif "gradient" in op:
        g = op["gradient"]
        x0, y0 = g.get("x", 0), g.get("y", 0)
        gw = g.get("w", canvas.width)
        gh = g.get("h", canvas.height)
        c1, c2 = _hex(g["from"]), _hex(g["to"])
        vertical = g.get("direction", "vertical") == "vertical"
        steps = gh if vertical else gw
        for i in range(steps):
            frac = i / max(steps - 1, 1)
            cr = int(c1[0] + (c2[0] - c1[0]) * frac)
            cg = int(c1[1] + (c2[1] - c1[1]) * frac)
            cb = int(c1[2] + (c2[2] - c1[2]) * frac)
            ca = int(c1[3] + (c2[3] - c1[3]) * frac)
            if vertical:
                draw.line([(x0, y0 + i), (x0 + gw - 1, y0 + i)], fill=(cr, cg, cb, ca))
            else:
                draw.line([(x0 + i, y0), (x0 + i, y0 + gh - 1)], fill=(cr, cg, cb, ca))

    elif "circle" in op:
        c = op["circle"]
        cx, cy, r = c["cx"], c["cy"], c["r"]
        fill = _hex(c["color"]) if "color" in c else None
        outline = _hex(c["outline"]) if "outline" in c else None
        width = c.get("width", 1)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=outline, width=width)

    elif "polygon" in op:
        p = op["polygon"]
        pts = [tuple(pt) for pt in p["points"]]
        fill = _hex(p["color"]) if "color" in p else None
        outline = _hex(p["outline"]) if "outline" in p else None
        width = p.get("width", 1)
        draw.polygon(pts, fill=fill, outline=outline, width=width)

    elif "triangle" in op:
        t = op["triangle"]
        draw.polygon([tuple(p) for p in t["points"]], fill=_hex(t["color"]))

    elif "line" in op:
        ln = op["line"]
        draw.line(
            [(ln["x1"], ln["y1"]), (ln["x2"], ln["y2"])],
            fill=_hex(ln["color"]),
            width=ln.get("width", 1),
        )

    elif "scatter" in op:
        s = op["scatter"]
        color = _hex(s["color"])
        count = s.get("count", 20)
        x0, y0 = s.get("x", 0), s.get("y", 0)
        sw = s.get("w", canvas.width)
        sh = s.get("h", canvas.height)
        seed = s.get("seed", 42)
        rng = random.Random(seed)
        for _ in range(count):
            px = x0 + rng.randint(0, sw - 1)
            py = y0 + rng.randint(0, sh - 1)
            if 0 <= px < canvas.width and 0 <= py < canvas.height:
                canvas.putpixel((px, py), color)

    elif "dither" in op:
        d = op["dither"]
        color = _hex(d["color"])
        x0, y0 = d.get("x", 0), d.get("y", 0)
        dw = d.get("w", canvas.width)
        dh = d.get("h", canvas.height)
        density = d.get("density", 0.3)
        seed = d.get("seed", 42)
        rng = random.Random(seed)
        for py in range(y0, y0 + dh):
            for px in range(x0, x0 + dw):
                if rng.random() < density and 0 <= px < canvas.width and 0 <= py < canvas.height:
                    canvas.putpixel((px, py), color)

    elif "pixels" in op:
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

    elif "sprite" in op:
        s = op["sprite"]
        if not game_path:
            return
        sprites = _load_sprites(game_path)
        category = s.get("category", "")
        name = s.get("name", "")
        sprite_def = sprites.get(category, {}).get(name)
        if not sprite_def:
            return
        x0, y0 = s.get("x", 0), s.get("y", 0)
        scale = s.get("scale", 1)
        palette = sprite_def.get("palette", {})
        pixel_rows = sprite_def.get("pixels", [])
        color_map = {ch: _hex(c) for ch, c in palette.items()}
        for dy, row in enumerate(pixel_rows):
            for dx, ch in enumerate(row):
                if ch == "." or ch not in color_map:
                    continue
                color = color_map[ch]
                px_x = x0 + dx * scale
                px_y = y0 + dy * scale
                if scale <= 1:
                    if 0 <= px_x < canvas.width and 0 <= px_y < canvas.height:
                        canvas.putpixel((px_x, px_y), color)
                else:
                    draw.rectangle(
                        [px_x, px_y, px_x + scale - 1, px_y + scale - 1],
                        fill=color,
                    )

    elif "pixel_text" in op:
        t = op["pixel_text"]
        text = t.get("text", "").upper()
        x0, y0 = t.get("x", 0), t.get("y", 0)
        color = _hex(t["color"]) if "color" in t else (255, 255, 255, 255)
        shadow = _hex(t["shadow"]) if "shadow" in t else None
        scale = t.get("scale", 1)
        char_w = 4 * scale  # 3 px wide + 1 px gap
        # Draw shadow first (offset +1 scale pixel)
        if shadow:
            cx = x0 + scale
            for ch in text:
                glyph = PIXEL_FONT.get(ch, PIXEL_FONT.get(" "))
                if not glyph:
                    cx += char_w
                    continue
                for gy, row in enumerate(glyph):
                    for gx, pixel in enumerate(row):
                        if pixel == "1":
                            px_x = cx + gx * scale
                            px_y = y0 + scale + gy * scale
                            if scale <= 1:
                                if 0 <= px_x < canvas.width and 0 <= px_y < canvas.height:
                                    canvas.putpixel((px_x, px_y), shadow)
                            else:
                                draw.rectangle(
                                    [px_x, px_y, px_x + scale - 1, px_y + scale - 1],
                                    fill=shadow,
                                )
                cx += char_w
        # Draw main text
        cx = x0
        for ch in text:
            glyph = PIXEL_FONT.get(ch, PIXEL_FONT.get(" "))
            if not glyph:
                cx += char_w
                continue
            for gy, row in enumerate(glyph):
                for gx, pixel in enumerate(row):
                    if pixel == "1":
                        px_x = cx + gx * scale
                        px_y = y0 + gy * scale
                        if scale <= 1:
                            if 0 <= px_x < canvas.width and 0 <= px_y < canvas.height:
                                canvas.putpixel((px_x, px_y), color)
                        else:
                            draw.rectangle(
                                [px_x, px_y, px_x + scale - 1, px_y + scale - 1],
                                fill=color,
                            )
            cx += char_w

    elif "hex_grid" in op:
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
                # Get terrain color
                fill = default_color
                if r < len(terrain) and c < len(terrain[r]):
                    t_name = terrain[r][c]
                    if t_name in colors:
                        fill = _hex(colors[t_name])
                corners = []
                for i in range(6):
                    angle = math.radians(60 * i - 30)
                    corners.append((
                        cx + (hex_size - 1) * math.cos(angle),
                        cy + (hex_size - 1) * math.sin(angle),
                    ))
                draw.polygon(corners, fill=fill, outline=outline_color, width=outline_width)


def create_thumbnail(args):
    game_path = _validate_game_path(args["path"])
    layers = args.get("layers", [])
    out_w = args.get("w", W)
    out_h = args.get("h", H)

    if not layers:
        return json.dumps({"error": "layers is required — list of layers [{res, aa, ops}, ...]"})

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
            _draw_op(canvas, op, game_path=game_path)

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
    def_path.write_text(json.dumps(args, indent=2))

    try:
        subprocess.run(["git", "add", "_thumbnail.png", "_thumbnail.json"], cwd=game_path, capture_output=True)
        subprocess.run(["git", "commit", "-m", "Update thumbnail"], cwd=game_path, capture_output=True)
        subprocess.run(["git", "push"], cwd=game_path, capture_output=True)
    except Exception:
        pass

    return json.dumps({
        "ok": True,
        "message": f"Thumbnail saved ({out_w}x{out_h}, {len(layers)} layers). Pushed to GitHub.",
        "path": str(out_path),
    })
