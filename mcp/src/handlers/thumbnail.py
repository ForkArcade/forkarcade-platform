import json
from pathlib import Path

_HERE = Path(__file__).resolve().parent
PLATFORM_ROOT = _HERE.parent.parent.parent
GAMES_DIR = PLATFORM_ROOT.parent / "games"

ALLOWED_CHARS = set(" \u2591\u2592\u2593")  # space, ░, ▒, ▓
THUMBNAIL_WIDTH = 36
THUMBNAIL_HEIGHT = 16


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
    rows = args["rows"]

    if not isinstance(rows, list) or len(rows) != THUMBNAIL_HEIGHT:
        return json.dumps({
            "error": f"Expected {THUMBNAIL_HEIGHT} rows, got {len(rows) if isinstance(rows, list) else 0}"
        })

    for i, row in enumerate(rows):
        if not isinstance(row, str):
            return json.dumps({"error": f"Row {i} must be a string"})
        if len(row) != THUMBNAIL_WIDTH:
            return json.dumps({
                "error": f"Row {i} has {len(row)} chars, expected {THUMBNAIL_WIDTH}"
            })
        for ch in row:
            if ch not in ALLOWED_CHARS:
                return json.dumps({
                    "error": f"Invalid character in row {i}: '{ch}' (U+{ord(ch):04X}). "
                    f"Allowed: space, ░ (U+2591), ▒ (U+2592), ▓ (U+2593)"
                })

    content = "\n".join(rows) + "\n"
    (game_path / "_thumbnail.txt").write_text(content, encoding="utf-8")

    return json.dumps({
        "ok": True,
        "message": f"Thumbnail saved ({THUMBNAIL_WIDTH}x{THUMBNAIL_HEIGHT})",
        "preview": "\n".join(rows),
    })
