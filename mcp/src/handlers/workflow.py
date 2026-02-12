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
ENGINE_DIR = PLATFORM_ROOT / "sdk" / "engine"
ENGINE_FILES = ["fa-engine.js", "fa-renderer.js", "fa-input.js", "fa-audio.js", "fa-narrative.js"]
BASE_FILES = ["index.html", "style.css", "sprites.js", "forkarcade-sdk.js"]


def _get_game_files(game_path):
    """Get game files list from .forkarcade.json (inherited from template repo)."""
    config_path = game_path / ".forkarcade.json"
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text())
            return config.get("gameFiles", [])
        except Exception:
            pass
    return []


def _get_snapshot_files(game_path):
    """Build snapshot file list: base + engine + game files from template."""
    return BASE_FILES + ENGINE_FILES + _get_game_files(game_path)


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


def _get_engine_version():
    """Read engine version from fa-engine.js."""
    engine_path = ENGINE_DIR / "fa-engine.js"
    if not engine_path.exists():
        return 0
    content = engine_path.read_text()
    match = re.search(r'ENGINE_VERSION\s*=\s*(\d+)', content)
    return int(match.group(1)) if match else 0


def _get_sdk_info():
    """Read canonical SDK file and extract version."""
    sdk_path = PLATFORM_ROOT / "sdk" / "forkarcade-sdk.js"
    content = sdk_path.read_text()
    first_line = content.split('\n')[0]
    match = re.search(r'v(\d+)', first_line)
    version = int(match.group(1)) if match else 0
    return {"version": version, "content": content}


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
        sdk_info = _get_sdk_info()
        (game_path / "forkarcade-sdk.js").write_text(sdk_info["content"])

        for ef in ENGINE_FILES:
            src = ENGINE_DIR / ef
            if src.exists():
                (game_path / ef).write_text(src.read_text())

        engine_version = _get_engine_version()
        config_path = game_path / ".forkarcade.json"
        game_config = {}
        if config_path.exists():
            try:
                game_config = json.loads(config_path.read_text())
            except Exception:
                pass
        game_config.update({"slug": slug, "title": title, "currentVersion": 0, "versions": [], "sdkVersion": sdk_info["version"], "engineVersion": engine_version})
        game_config.setdefault("template", template)
        config_path.write_text(json.dumps(game_config, indent=2) + "\n")

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
    return """# ForkArcade SDK Documentation

## How it works
The SDK communicates with the ForkArcade platform via postMessage.
Games run in an iframe on the platform. The SDK sends messages to the parent window (platform),
which handles authentication and API calls.

## Include in your game
The file `forkarcade-sdk.js` is copied into your game directory by `init_game`.
To update it later, use the `update_sdk` tool.
```html
<script src="forkarcade-sdk.js"></script>
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

    # SDK check
    sdk_local = game_path / "forkarcade-sdk.js"
    if not sdk_local.exists():
        issues.append("Missing forkarcade-sdk.js — use update_sdk tool to add it")
    else:
        local_first = sdk_local.read_text().split('\n')[0]
        local_match = re.search(r'v(\d+)', local_first)
        local_ver = int(local_match.group(1)) if local_match else 0
        canonical = _get_sdk_info()
        if local_ver < canonical["version"]:
            warnings.append(f'SDK outdated: local v{local_ver}, latest v{canonical["version"]}. Use update_sdk tool.')

    # Engine files check
    for ef in ENGINE_FILES:
        if not (game_path / ef).exists():
            issues.append(f"Missing engine file: {ef} — use update_engine tool")
    engine_ver = _get_engine_version()
    local_engine = game_path / "fa-engine.js"
    if local_engine.exists():
        match = re.search(r'ENGINE_VERSION\s*=\s*(\d+)', local_engine.read_text())
        local_ev = int(match.group(1)) if match else 0
        if local_ev < engine_ver:
            warnings.append(f'Engine outdated: local v{local_ev}, latest v{engine_ver}. Use update_engine tool.')

    # Game files check (from template)
    game_files = _get_game_files(game_path)
    if not game_files:
        issues.append("Cannot determine game files — missing or invalid .forkarcade.json / template")
    for gf in game_files:
        if not (game_path / gf).exists():
            issues.append(f"Missing game file: {gf}")

    # index.html check
    index_html = game_path / "index.html"
    if not index_html.exists():
        issues.append("Missing index.html")
    else:
        html = index_html.read_text()
        if "forkarcade-sdk" not in html:
            issues.append('SDK not included in index.html')
        if "<canvas" not in html:
            issues.append("No <canvas> element found in index.html")

        required_scripts = ENGINE_FILES + game_files
        for f in required_scripts:
            if f not in html:
                issues.append(f'{f} not included in index.html')

        # Load order: engine before game files
        if "fa-engine.js" in html and game_files:
            engine_pos = html.index("fa-engine.js")
            first_game = game_files[0]
            if first_game in html:
                game_pos = html.index(first_game)
                if game_pos < engine_pos:
                    issues.append(f"Load order error: {first_game} must load after fa-engine.js")

    # onReady and submitScore check
    js_files_content = ""
    for gf in game_files:
        gf_path = game_path / gf
        if gf_path.exists():
            js_files_content += gf_path.read_text()
    if "onReady" not in js_files_content:
        issues.append("ForkArcade.onReady() not found in game files")
    if "submitScore" not in js_files_content:
        issues.append("ForkArcade.submitScore() not found in game files")

    if not (game_path / "style.css").exists():
        warnings.append("Missing style.css (optional)")
    if not (game_path / "sprites.js").exists():
        warnings.append("No sprites.js — game will use text fallback for rendering")

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
                for f in _get_snapshot_files(game_path):
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


def update_sdk(args):
    game_path = _validate_game_path(args["path"])
    sdk_info = _get_sdk_info()

    sdk_local = game_path / "forkarcade-sdk.js"
    old_version = 0
    if sdk_local.exists():
        first_line = sdk_local.read_text().split('\n')[0]
        match = re.search(r'v(\d+)', first_line)
        old_version = int(match.group(1)) if match else 0

    if old_version >= sdk_info["version"]:
        return json.dumps({"ok": True, "message": f"SDK already at latest version (v{sdk_info['version']})"})

    sdk_local.write_text(sdk_info["content"])

    config_path = game_path / ".forkarcade.json"
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text())
            config["sdkVersion"] = sdk_info["version"]
            config_path.write_text(json.dumps(config, indent=2) + "\n")
        except Exception:
            pass

    return json.dumps({
        "ok": True,
        "message": f"SDK updated from v{old_version} to v{sdk_info['version']}",
        "version": sdk_info["version"],
    })


def update_engine(args):
    game_path = _validate_game_path(args["path"])
    engine_ver = _get_engine_version()

    local_engine = game_path / "fa-engine.js"
    old_version = 0
    if local_engine.exists():
        match = re.search(r'ENGINE_VERSION\s*=\s*(\d+)', local_engine.read_text())
        old_version = int(match.group(1)) if match else 0

    if old_version >= engine_ver:
        return json.dumps({"ok": True, "message": f"Engine already at latest version (v{engine_ver})"})

    updated = []
    for ef in ENGINE_FILES:
        src = ENGINE_DIR / ef
        if src.exists():
            (game_path / ef).write_text(src.read_text())
            updated.append(ef)

    config_path = game_path / ".forkarcade.json"
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text())
            config["engineVersion"] = engine_ver
            config_path.write_text(json.dumps(config, indent=2) + "\n")
        except Exception:
            pass

    return json.dumps({
        "ok": True,
        "message": f"Engine updated from v{old_version} to v{engine_ver}",
        "version": engine_ver,
        "updated": updated,
    })
