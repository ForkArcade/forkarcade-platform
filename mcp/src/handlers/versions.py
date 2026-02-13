import json
from context import validate_game_path


def get_versions(args):
    game_path = validate_game_path(args["path"])
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
