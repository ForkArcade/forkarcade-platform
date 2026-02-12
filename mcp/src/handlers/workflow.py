import json
import os
import re
import shlex
import subprocess
from datetime import date
from pathlib import Path

from templates import TEMPLATES, ORG
from sprites import generate_sprites_js

_HERE = Path(__file__).resolve().parent
PLATFORM_ROOT = _HERE.parent.parent.parent
GAMES_DIR = PLATFORM_ROOT.parent / "games"
PROMPTS_DIR = PLATFORM_ROOT / "prompts"
PLATFORM_API = os.environ.get("FORKARCADE_API", "http://localhost:8787")


def run(cmd_args, cwd=None):
    """Run a command. cmd_args must be a list (no shell=True)."""
    result = subprocess.run(cmd_args, shell=False, capture_output=True, text=True, timeout=30, cwd=cwd)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"Command failed: {cmd_args}")
    return result.stdout.strip()


def run_shell(cmd, cwd=None):
    """Run a shell pipeline (only for trusted, hardcoded commands without user input)."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30, cwd=cwd)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"Command failed: {cmd}")
    return result.stdout.strip()


def _validate_game_path(path_str):
    """Validate that path resolves within GAMES_DIR. Returns resolved Path or raises."""
    game_path = Path(path_str).resolve()
    try:
        game_path.relative_to(GAMES_DIR.resolve())
    except ValueError:
        raise ValueError(f"Path must be within games directory: {GAMES_DIR}")
    return game_path


def list_templates(args):
    items = [{"key": k, "name": t["name"], "description": t["description"], "repo": t["repo"]}
             for k, t in TEMPLATES.items()]
    return json.dumps(items, indent=2)


def init_game(args):
    slug = args["slug"]
    template = args["template"]
    title = args["title"]
    description = args.get("description", "")

    tmpl = TEMPLATES.get(template)
    if not tmpl:
        return json.dumps({"error": f"Unknown template: {template}. Available: {', '.join(TEMPLATES.keys())}"})
    if not re.match(r"^[a-z0-9-]+$", slug):
        return json.dumps({"error": "Slug must be lowercase alphanumeric with hyphens"})

    try:
        GAMES_DIR.mkdir(parents=True, exist_ok=True)
        run(["gh", "repo", "create", f"{ORG}/{slug}", "--template", tmpl['repo'], "--public", "--clone"], cwd=GAMES_DIR)

        if description:
            run(["gh", "repo", "edit", f"{ORG}/{slug}", "--description", description])

        run(["gh", "repo", "edit", f"{ORG}/{slug}", "--add-topic", "forkarcade-game", "--add-topic", template])

        game_path = GAMES_DIR / slug
        game_config = {"template": template, "slug": slug, "title": title, "currentVersion": 0, "versions": []}
        (game_path / ".forkarcade.json").write_text(json.dumps(game_config, indent=2) + "\n")

        mcp_config = {
            "mcpServers": {
                "forkarcade": {
                    "type": "stdio",
                    "command": str(PLATFORM_ROOT / "mcp" / ".venv" / "bin" / "python3"),
                    "args": [str(PLATFORM_ROOT / "mcp" / "src" / "main.py")],
                    "env": {},
                }
            }
        }
        (game_path / ".mcp.json").write_text(json.dumps(mcp_config, indent=2) + "\n")

        (game_path / "_sprites.json").write_text("{}\n")
        (game_path / "sprites.js").write_text(generate_sprites_js({}))

        return json.dumps({
            "ok": True,
            "message": f'Game "{title}" created from template {tmpl["name"]}',
            "repo": f"{ORG}/{slug}",
            "local_path": str(game_path),
            "next_steps": [
                f"cd {slug}",
                "Edit game.js to implement your game",
                "Use get_game_prompt tool to get design guidance",
                "Use get_asset_guide tool to see what sprites to create",
                "Use create_sprite tool to build pixel art assets",
                "Use validate_game before publishing",
                "Use publish_game when ready",
            ],
        })
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_sdk_docs(args):
    return f"""# ForkArcade SDK Documentation

## How it works
The SDK communicates with the ForkArcade platform via postMessage.
Games run in an iframe on the platform. The SDK sends messages to the parent window (platform),
which handles authentication and API calls.

## Include in your game
```html
<script src="{PLATFORM_API}/sdk/forkarcade-sdk.js"></script>
```

## API

### ForkArcade.onReady(callback)
Called when the SDK connects to the platform.
```js
ForkArcade.onReady(function(ctx) {{
  console.log('Game slug:', ctx.slug);
  startGame();
}});
```

### ForkArcade.submitScore(score) → Promise
Submits a numeric score to the leaderboard. Call after game over or level complete.
```js
await ForkArcade.submitScore(1250);
```

### ForkArcade.getPlayer() → Promise
Returns current player info. Returns error if not logged in.
```js
const player = await ForkArcade.getPlayer();
// {{ login: 'username', sub: 12345 }}
```

### ForkArcade.updateNarrative(data)
Reports narrative state to the platform. Fire-and-forget (no Promise).
```js
ForkArcade.updateNarrative({{
  variables: {{ karma: 3, has_key: true }},
  currentNode: 'dark-cellar',
  graph: {{
    nodes: [
      {{ id: 'intro', label: 'Start', type: 'scene' }},
      {{ id: 'choice-1', label: 'Help NPC?', type: 'choice' }},
    ],
    edges: [
      {{ from: 'intro', to: 'choice-1' }},
    ]
  }},
  event: 'Entered dark cellar'
}});
```
Node types: `scene`, `choice`, `condition`.
"""


def get_game_prompt(args):
    template = args.get("template", "")
    prompt_path = PROMPTS_DIR / f"{template}.md"
    if not prompt_path.exists():
        return json.dumps({"error": f"No prompt found for template: {template}"})
    return prompt_path.read_text()


def validate_game(args):
    game_path = _validate_game_path(args["path"])
    issues = []
    warnings = []

    index_html = game_path / "index.html"
    if not index_html.exists():
        issues.append("Missing index.html")
    else:
        html = index_html.read_text()
        if "forkarcade-sdk" not in html:
            issues.append('SDK not included in index.html — add <script src=".../forkarcade-sdk.js"></script>')
        if "<canvas" not in html:
            issues.append("No <canvas> element found in index.html")
        if "sprites.js" not in html:
            warnings.append('sprites.js not included in index.html — sprite rendering will not work. Add <script src="sprites.js"></script> before game.js')

    game_js = game_path / "game.js"
    if not game_js.exists():
        issues.append("Missing game.js")
    else:
        js = game_js.read_text()
        if "submitScore" not in js:
            issues.append("game.js does not call ForkArcade.submitScore() — scores won't be recorded")
        if "onReady" not in js:
            issues.append("game.js does not call ForkArcade.onReady() — game may not initialize properly")

    if not (game_path / "style.css").exists():
        warnings.append("Missing style.css (optional but recommended)")
    if not (game_path / "sprites.js").exists():
        warnings.append("No sprites.js — game will use text fallback for rendering (optional)")

    return json.dumps({"valid": len(issues) == 0, "issues": issues, "warnings": warnings, "path": str(game_path)}, indent=2)


def publish_game(args):
    game_path = _validate_game_path(args["path"])
    slug = args["slug"]
    title = args["title"]
    description = args.get("description", "")
    results = []

    if not re.match(r"^[a-z0-9-]+$", slug):
        return json.dumps({"error": "Slug must be lowercase alphanumeric with hyphens"})

    try:
        try:
            run_shell('git add -A && git commit -m "Publish game"', cwd=game_path)
        except Exception:
            pass
        run(["git", "push", "-u", "origin", "main"], cwd=game_path)
        results.append("Pushed to GitHub")

        if description:
            run(["gh", "repo", "edit", f"{ORG}/{slug}", "--description", description])

        try:
            run(["gh", "repo", "edit", f"{ORG}/{slug}", "--add-topic", "forkarcade-game"])
        except Exception:
            pass

        try:
            run(["gh", "api", f"repos/{ORG}/{slug}/pages", "-X", "POST",
                 "-f", "build_type=legacy", "-f", "source[branch]=main", "-f", "source[path]=/"])
            results.append("GitHub Pages enabled")
        except Exception as e:
            msg = str(e)
            results.append("GitHub Pages already enabled" if "already exists" in msg else f"Pages warning: {msg}")

        pages_url = f"https://{ORG.lower()}.github.io/{slug}/"

        try:
            config_path = game_path / ".forkarcade.json"
            if config_path.exists():
                config = json.loads(config_path.read_text())
                next_version = (config.get("currentVersion") or 0) + 1
                version_dir = game_path / "versions" / f"v{next_version}"
                version_dir.mkdir(parents=True, exist_ok=True)
                for f in ["index.html", "game.js", "style.css", "sprites.js"]:
                    src = game_path / f
                    if src.exists():
                        (version_dir / f).write_text(src.read_text())
                config["currentVersion"] = next_version
                if "versions" not in config:
                    config["versions"] = []
                config["versions"].append({
                    "version": next_version,
                    "date": date.today().isoformat(),
                    "issue": None,
                    "description": "Initial release" if next_version == 1 else f"Published v{next_version}",
                })
                config_path.write_text(json.dumps(config, indent=2) + "\n")
                run_shell('git add versions/ .forkarcade.json && git commit -m "Version v{}" && git push'.format(next_version), cwd=game_path)
                results.append(f"Version v{next_version} snapshot created")
        except Exception as e:
            results.append(f"Version snapshot warning: {e}")

        return json.dumps({
            "ok": True, "results": results,
            "repo": f"https://github.com/{ORG}/{slug}",
            "game_url": pages_url,
            "platform_url": f"http://localhost:5173/play/{slug}",
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "results": results})
