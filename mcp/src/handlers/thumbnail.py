import json
from pathlib import Path

from PIL import Image

_HERE = Path(__file__).resolve().parent
PLATFORM_ROOT = _HERE.parent.parent.parent
GAMES_DIR = PLATFORM_ROOT.parent / "games"

THUMBNAIL_WIDTH = 72
THUMBNAIL_HEIGHT = 32


def _validate_game_path(path_str):
    """Validate that path resolves within GAMES_DIR."""
    game_path = Path(path_str).resolve()
    try:
        game_path.relative_to(GAMES_DIR.resolve())
    except ValueError:
        raise ValueError(f"Path must be within games directory: {GAMES_DIR}")
    return game_path


def create_thumbnail(args):
    game_path = _validate_game_path(args["path"])
    palette = args["palette"]
    pixels = args["pixels"]

    if not isinstance(palette, dict) or len(palette) == 0:
        return json.dumps({"error": "palette must be a non-empty object mapping chars to hex colors"})

    if not isinstance(pixels, list) or len(pixels) != THUMBNAIL_HEIGHT:
        return json.dumps({
            "error": f"Expected {THUMBNAIL_HEIGHT} rows, got {len(pixels) if isinstance(pixels, list) else 0}"
        })

    for i, row in enumerate(pixels):
        if not isinstance(row, str):
            return json.dumps({"error": f"Row {i} must be a string"})
        if len(row) != THUMBNAIL_WIDTH:
            return json.dumps({
                "error": f"Row {i} has {len(row)} chars, expected {THUMBNAIL_WIDTH}"
            })

    # Parse palette
    color_map = {}
    for char, hex_color in palette.items():
        if len(char) != 1:
            return json.dumps({"error": f"Palette key must be a single character, got '{char}'"})
        hex_color = hex_color.lstrip("#")
        if len(hex_color) == 3:
            hex_color = "".join(c * 2 for c in hex_color)
        try:
            r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
            color_map[char] = (r, g, b)
        except (ValueError, IndexError):
            return json.dumps({"error": f"Invalid hex color for '{char}': #{hex_color}"})

    # Build image
    img = Image.new("RGB", (THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT), (0, 0, 0))
    for y, row in enumerate(pixels):
        for x, ch in enumerate(row):
            if ch in color_map:
                img.putpixel((x, y), color_map[ch])

    out_path = game_path / "_thumbnail.png"
    img.save(out_path)

    return json.dumps({
        "ok": True,
        "message": f"Thumbnail saved ({THUMBNAIL_WIDTH}x{THUMBNAIL_HEIGHT}, {len(palette)} colors)",
        "path": str(out_path),
    })
