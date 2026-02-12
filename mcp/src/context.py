import json
from pathlib import Path
from templates import TEMPLATES, VALID_CATEGORIES


def detect_game_context():
    config_path = Path.cwd() / ".forkarcade.json"
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text())
            if config.get("template") and config["template"] in TEMPLATES:
                return config
        except Exception:
            pass
    return None


def get_categories_for_template(template):
    tmpl = TEMPLATES.get(template)
    if tmpl and "assets" in tmpl:
        return list(tmpl["assets"]["categories"].keys())
    return list(VALID_CATEGORIES)
