import json
import re
from pathlib import Path

from github_templates import VALID_CATEGORIES, get_template, get_template_assets
from sprites import generate_sprites_js, generate_preview_html
from context import detect_game_context, get_categories_for_template

_HERE = Path(__file__).resolve().parent
PLATFORM_ROOT = _HERE.parent.parent.parent
GAMES_DIR = PLATFORM_ROOT.parent / "games"


def _validate_game_path(path_str):
    """Validate that path resolves within GAMES_DIR."""
    game_path = Path(path_str).resolve()
    try:
        game_path.relative_to(GAMES_DIR.resolve())
    except ValueError:
        raise ValueError(f"Path must be within games directory: {GAMES_DIR}")
    return game_path


def get_asset_guide(args):
    template = args.get("template", "")
    tmpl = get_template(template)
    guide = get_template_assets(template) if tmpl else None
    if not guide:
        return json.dumps({"error": f"No asset guide for template: {template}"})

    output = f"# Asset Guide: {tmpl['name']}\n\n"
    output += f"## Style\n{guide['style']}\n\n"
    output += f"## Sprite Size\n{guide['gridSize']}\n\n"
    output += "## Color Palette\n"
    for name, color in guide["palette"].items():
        output += f"- `{color}` — {name}\n"
    output += "\n## Required Sprites\n\n"
    for cat, info in guide["categories"].items():
        output += f"### {cat}\n{info['desc']}\n"
        output += f"Sprite'y: {', '.join(info['sprites'])}\n\n"
    output += '## Sprite Format\n```json\n'
    output += '{\n  "w": 8, "h": 8,\n  "palette": { "1": "#a86", "2": "#d9a" },\n'
    output += '  "pixels": [\n    "..1..1..",\n    ".11..11.",\n    ".122221.",\n    "11222211",\n'
    output += '    "11222211",\n    ".112211.",\n    ".1....1.",\n    ".1....1."\n  ]\n}\n```\n\n'
    output += "## Renderer Integration\n```js\n"
    output += "var sprite = typeof getSprite === 'function' && getSprite('enemies', enemy.type)\n"
    output += "if (sprite) {\n  drawSprite(ctx, sprite, sx, sy, T)\n} else {\n  ctx.fillText(enemy.char, sx + T/2, sy + T/2)\n}\n```\n"
    output += "\nUse the `create_sprite` tool to create sprites.\n"
    return output


def create_sprite(args):
    game_path = _validate_game_path(args["path"])
    category = args["category"]
    sprite_name = args["name"]
    palette = args["palette"]
    pixels = args["pixels"]
    json_path = game_path / "_sprites.json"

    game_ctx = detect_game_context()
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
        if not isinstance(val, str) or not re.match(r"^#[0-9a-fA-F]{3,6}$", val):
            return json.dumps({"error": f"Invalid color '{val}' for palette key '{key}'"})

    data = {}
    if json_path.exists():
        try:
            data = json.loads(json_path.read_text())
        except Exception:
            data = {}

    if category not in data:
        data[category] = {}
    data[category][sprite_name] = {"w": w, "h": h, "palette": palette, "pixels": pixels}

    json_path.write_text(json.dumps(data, indent=2) + "\n")
    (game_path / "sprites.js").write_text(generate_sprites_js(data))

    total = sum(len(cat) for cat in data.values())
    return json.dumps({
        "ok": True,
        "message": f"Sprite '{sprite_name}' added to category '{category}' ({w}x{h})",
        "total_sprites": total,
        "preview": "\n".join(pixels),
    })


def validate_assets(args):
    game_path = _validate_game_path(args["path"])
    json_path = game_path / "_sprites.json"
    template = args.get("template")

    if not template:
        game_ctx = detect_game_context()
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
            data = json.loads(json_path.read_text())
        except Exception:
            data = {}

    sprites_in_html = False
    index_html = game_path / "index.html"
    if index_html.exists():
        sprites_in_html = "sprites.js" in index_html.read_text()

    report = {}
    total_found = 0
    total_required = 0
    for cat, info in guide["categories"].items():
        found = list(data.get(cat, {}).keys())
        missing = [s for s in info["sprites"] if s not in found]
        report[cat] = {"found": found, "missing": missing}
        total_found += len(found)
        total_required += len(info["sprites"])

    return json.dumps({
        "template": template,
        "sprites_file": (game_path / "sprites.js").exists(),
        "sprites_json": json_path.exists(),
        "included_in_html": sprites_in_html,
        "categories": report,
        "total_found": total_found,
        "total_required": total_required,
        "complete": total_found >= total_required,
    }, indent=2)


def preview_assets(args):
    game_path = _validate_game_path(args["path"])
    json_path = game_path / "_sprites.json"

    if not json_path.exists():
        return json.dumps({"error": "No _sprites.json found. Create sprites first with create_sprite tool."})

    try:
        data = json.loads(json_path.read_text())
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
