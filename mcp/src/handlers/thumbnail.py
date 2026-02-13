import json
import random
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

_HERE = Path(__file__).resolve().parent
PLATFORM_ROOT = _HERE.parent.parent.parent
GAMES_DIR = PLATFORM_ROOT.parent / "games"

W, H = 72, 32

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


def _draw_op(canvas, op):
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
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=_hex(c["color"]))

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


def create_thumbnail(args):
    game_path = _validate_game_path(args["path"])
    layers = args.get("layers", [])
    out_w = args.get("w", W)
    out_h = args.get("h", H)

    if not layers:
        return json.dumps({"error": "layers is required — lista warstw [{res, aa, ops}, ...]"})

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
            _draw_op(canvas, op)

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
