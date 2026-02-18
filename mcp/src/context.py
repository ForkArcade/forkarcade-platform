import json
from pathlib import Path
from github_templates import VALID_CATEGORIES, get_template_assets

_HERE = Path(__file__).resolve().parent
PLATFORM_ROOT = _HERE.parent.parent
GAMES_DIR = PLATFORM_ROOT.parent / "games"


def validate_game_path(path_str):
    """Validate that path resolves within GAMES_DIR. Returns resolved Path or raises."""
    game_path = Path(path_str).resolve()
    try:
        game_path.relative_to(GAMES_DIR.resolve())
    except ValueError:
        raise ValueError(f"Path {game_path} is not inside games directory {GAMES_DIR.resolve()}")
    return game_path


def detect_game_context(path=None):
    config_path = (Path(path) if path else Path.cwd()) / ".forkarcade.json"
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text())
            if config.get("template"):
                return config
        except (json.JSONDecodeError, IOError):
            pass
    return None


def get_categories_for_template(template):
    assets = get_template_assets(template)
    if assets and "categories" in assets:
        return list(assets["categories"].keys())
    return list(VALID_CATEGORIES)
