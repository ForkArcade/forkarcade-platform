import json
from pathlib import Path
from github_templates import VALID_CATEGORIES, get_template_assets


def detect_game_context():
    config_path = Path.cwd() / ".forkarcade.json"
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text())
            if config.get("template"):
                return config
        except Exception:
            pass
    return None


def get_categories_for_template(template):
    assets = get_template_assets(template)
    if assets and "categories" in assets:
        return list(assets["categories"].keys())
    return list(VALID_CATEGORIES)
