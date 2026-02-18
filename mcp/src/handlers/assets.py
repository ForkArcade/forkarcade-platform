import json
import re
import sys
from pathlib import Path

from github_templates import VALID_CATEGORIES, get_template, get_template_assets
from sprites import generate_sprites_js, generate_preview_html, migrate_sprite_data
from context import validate_game_path, detect_game_context, get_categories_for_template


def get_asset_guide(args):
    template = args.get("template", "")
    tmpl = get_template(template)
    guide = get_template_assets(template) if tmpl else None
    if not guide:
        return json.dumps({"error": f"No asset guide for template: {template}"})

    output = f"# Asset Guide: {tmpl['name']}\n\n"
    output += f"## Style\n{guide['style']}\n\n"
    output += "## Color Palette\n"
    for name, color in guide["palette"].items():
        output += f"- `{color}` — {name}\n"
    output += "\n## Required Sprites\n\n"
    for cat, info in guide["categories"].items():
        size = info.get("size", guide.get("gridSize", "8x8"))
        output += f"### {cat} ({size})\n{info['desc']}\n"
        output += f"Sprites: {', '.join(info['sprites'])}\n\n"
    output += '## Sprite Format\n```json\n'
    output += '{\n  "w": 8, "h": 8,\n  "palette": { "1": "#a86", "2": "#d9a" },\n'
    output += '  "origin": [0, 0],\n'
    output += '  "frames": [\n    ["..1..1..", ".11..11.", ".122221.", "11222211", "11222211", ".112211.", ".1....1.", ".1....1."],\n'
    output += '    ["..1..1..", "..1..1..", ".122221.", "11222211", "11222211", ".112211.", ".1...1..", "..1.1..."]\n'
    output += '  ]\n}\n```\n\n'
    output += "- `frames` — array of pixel grids. Single-frame sprites have one frame.\n"
    output += "- `origin` — anchor point [ox, oy] in pixels. Default [0,0] (top-left). Use [w/2, h-1] for bottom-center (isometric, tall objects).\n\n"
    output += "## Renderer Integration\n```js\n"
    output += "var sprite = typeof getSprite === 'function' && getSprite('enemies', enemy.type)\n"
    output += "if (sprite) {\n  drawSprite(ctx, sprite, sx, sy, T)  // draws frame 0\n"
    output += "  drawSprite(ctx, sprite, sx, sy, T, frameIndex)  // specific frame\n"
    output += "} else {\n  ctx.fillText(enemy.char, sx + T/2, sy + T/2)\n}\n"
    output += "// Animation: Math.floor(t / 200) % spriteFrames(sprite)\n```\n"
    output += "\nUse the `create_sprite` tool to create sprites. Call multiple times with `frame` param to add animation frames.\n"
    return output


def create_sprite(args):
    game_path = validate_game_path(args["path"])
    category = args["category"]
    sprite_name = args["name"]
    palette = args["palette"]
    pixels = args["pixels"]
    frame_index = args.get("frame")
    origin = args.get("origin", [0, 0])
    json_path = game_path / "_sprites.json"

    game_ctx = detect_game_context(args["path"])
    allowed = get_categories_for_template(game_ctx["template"]) if game_ctx else VALID_CATEGORIES
    if category not in allowed:
        ctx_name = game_ctx["template"] if game_ctx else "all"
        return json.dumps({"error": f"Invalid category: {category}. Valid for {ctx_name}: {', '.join(allowed)}"})

    if not isinstance(pixels, list) or len(pixels) == 0:
        return json.dumps({"error": "pixels must be a non-empty array of strings"})
    h = len(pixels)
    w = len(pixels[0])
    for i in range(h):
        if not isinstance(pixels[i], str):
            return json.dumps({"error": f"Row {i} must be a string"})
        if len(pixels[i]) != w:
            return json.dumps({"error": f"Row {i} has {len(pixels[i])} chars, expected {w}"})
        for ch in pixels[i]:
            if ch != "." and ch not in palette:
                return json.dumps({"error": f"Character '{ch}' in row {i} not found in palette"})

    for key, val in palette.items():
        if not isinstance(val, str) or not re.match(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$", val):
            return json.dumps({"error": f"Invalid color '{val}' for palette key '{key}'"})

    if not isinstance(origin, list) or len(origin) != 2 or not all(isinstance(v, int) for v in origin):
        return json.dumps({"error": "origin must be [ox, oy] — two integers"})

    data = {}
    if json_path.exists():
        try:
            data = migrate_sprite_data(json.loads(json_path.read_text()))
        except Exception as e:
            print(f"Warning: failed to parse {json_path}: {e}", file=sys.stderr)
            data = {}

    if category not in data:
        data[category] = {}

    existing = data[category].get(sprite_name)
    if existing:
        if existing["w"] != w or existing["h"] != h:
            return json.dumps({"error": f"Frame size {w}x{h} doesn't match existing sprite {existing['w']}x{existing['h']}"})
        existing["palette"] = palette
        existing["origin"] = origin
        empty = ["." * w] * h
        if frame_index is not None:
            while len(existing["frames"]) <= frame_index:
                existing["frames"].append(empty)
            existing["frames"][frame_index] = pixels
        else:
            existing["frames"].append(pixels)
    else:
        idx = frame_index if frame_index is not None else 0
        empty = ["." * w] * h
        frames = [empty] * (idx + 1)
        frames[idx] = pixels
        data[category][sprite_name] = {"w": w, "h": h, "palette": palette, "origin": origin, "frames": frames}

    json_path.write_text(json.dumps(data, indent=2) + "\n")
    (game_path / "sprites.js").write_text(generate_sprites_js(data))

    sprite = data[category][sprite_name]
    frame_count = len(sprite["frames"])
    total = sum(len(cat) for cat in data.values())
    return json.dumps({
        "ok": True,
        "message": f"Sprite '{sprite_name}' frame {frame_index if frame_index is not None else frame_count - 1} in '{category}' ({w}x{h}, {frame_count} frames)",
        "total_sprites": total,
        "frame_count": frame_count,
        "preview": "\n".join(pixels),
    })


def validate_assets(args):
    game_path = validate_game_path(args["path"])
    json_path = game_path / "_sprites.json"
    template = args.get("template")

    if not template:
        game_ctx = detect_game_context(str(game_path))
        if game_ctx:
            template = game_ctx["template"]
    if not template:
        target_config = game_path / ".forkarcade.json"
        if target_config.exists():
            try:
                template = json.loads(target_config.read_text()).get("template")
            except Exception:
                pass

    guide = get_template_assets(template or "")
    if not guide:
        return json.dumps({"error": "Cannot detect template type. Pass template parameter explicitly."})

    data = {}
    if json_path.exists():
        try:
            data = migrate_sprite_data(json.loads(json_path.read_text()))
        except Exception as e:
            print(f"Warning: failed to parse {json_path}: {e}", file=sys.stderr)
            data = {}

    sprites_in_html = False
    index_html = game_path / "index.html"
    if index_html.exists():
        sprites_in_html = "sprites.js" in index_html.read_text()

    report = {}
    total_found = 0
    total_required = 0
    format_errors = []
    for cat, info in guide["categories"].items():
        found = list(data.get(cat, {}).keys())
        missing = [s for s in info["sprites"] if s not in found]
        report[cat] = {"found": found, "missing": missing}
        total_found += len(found)
        total_required += len(info["sprites"])

    for cat, sprites in data.items():
        for name, s in sprites.items():
            if not isinstance(s.get("frames"), list) or len(s["frames"]) == 0:
                format_errors.append(f"{cat}/{name}: missing or empty frames")
            elif not all(isinstance(f, list) for f in s["frames"]):
                format_errors.append(f"{cat}/{name}: frames contains non-array entries")
            if not isinstance(s.get("origin"), list) or len(s.get("origin", [])) != 2:
                format_errors.append(f"{cat}/{name}: missing or invalid origin")

    return json.dumps({
        "template": template,
        "sprites_file": (game_path / "sprites.js").exists(),
        "sprites_json": json_path.exists(),
        "included_in_html": sprites_in_html,
        "categories": report,
        "format_errors": format_errors,
        "total_found": total_found,
        "total_required": total_required,
        "complete": total_found >= total_required and len(format_errors) == 0,
    }, indent=2)


def preview_assets(args):
    game_path = validate_game_path(args["path"])
    json_path = game_path / "_sprites.json"

    if not json_path.exists():
        return json.dumps({"error": "No _sprites.json found. Create sprites first with create_sprite tool."})

    try:
        data = migrate_sprite_data(json.loads(json_path.read_text()))
    except Exception:
        return json.dumps({"error": "Cannot parse _sprites.json"})

    count = sum(len(cat) for cat in data.values())
    if count == 0:
        return json.dumps({"error": "No sprites defined yet. Use create_sprite to add sprites."})

    html = generate_preview_html(data)
    preview_path = game_path / "_preview.html"
    preview_path.write_text(html)

    return json.dumps({
        "ok": True,
        "message": f"Preview generated with {count} sprites",
        "path": str(preview_path),
        "open": f"open {preview_path}",
    })
