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
    scale = args.get("scale", 1)

    if not isinstance(scale, int) or scale < 1 or scale > 8:
        return json.dumps({"error": "scale must be an integer 1-8"})

    if not isinstance(palette, dict) or len(palette) == 0:
        return json.dumps({"error": "palette must be a non-empty object mapping chars to hex colors"})

    expected_w = THUMBNAIL_WIDTH * scale
    expected_h = THUMBNAIL_HEIGHT * scale

    if not isinstance(pixels, list) or len(pixels) != expected_h:
        return json.dumps({
            "error": f"Expected {expected_h} rows (scale={scale}), got {len(pixels) if isinstance(pixels, list) else 0}"
        })

    for i, row in enumerate(pixels):
        if not isinstance(row, str):
            return json.dumps({"error": f"Row {i} must be a string"})
        if len(row) != expected_w:
            return json.dumps({
                "error": f"Row {i} has {len(row)} chars, expected {expected_w} (scale={scale})"
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

    # Build image at scale resolution
    img = Image.new("RGB", (expected_w, expected_h), (0, 0, 0))
    for y, row in enumerate(pixels):
        for x, ch in enumerate(row):
            if ch in color_map:
                img.putpixel((x, y), color_map[ch])

    # Downscale with LANCZOS antialiasing
    if scale > 1:
        img = img.resize((THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT), Image.LANCZOS)

    out_path = game_path / "_thumbnail.png"
    img.save(out_path)

    return json.dumps({
        "ok": True,
        "message": f"Thumbnail saved ({THUMBNAIL_WIDTH}x{THUMBNAIL_HEIGHT}, scale={scale}, {len(palette)} colors)",
        "path": str(out_path),
    })
