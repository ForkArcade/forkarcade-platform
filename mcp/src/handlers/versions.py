import json
from pathlib import Path


def get_versions(args):
    game_path = Path(args["path"]).resolve()
    config_path = game_path / ".forkarcade.json"

    if not config_path.exists():
        return json.dumps({"error": "No .forkarcade.json found"})

    try:
        config = json.loads(config_path.read_text())
        return json.dumps({
            "slug": config.get("slug"),
            "title": config.get("title"),
            "template": config.get("template"),
            "currentVersion": config.get("currentVersion", 0),
            "versions": config.get("versions", []),
        }, indent=2)
    except Exception:
        return json.dumps({"error": "Cannot parse .forkarcade.json"})
