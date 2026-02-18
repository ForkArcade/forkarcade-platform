import json
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

from github_templates import ORG, _gh_api, list_templates as gh_list_templates, get_template, get_template_prompt, get_template_styles
from sprites import generate_sprites_js
from maps import generate_maps_js
from context import validate_game_path, PLATFORM_ROOT, GAMES_DIR

SDK_DIR = PLATFORM_ROOT / "sdk"
# Base files for version snapshots — includes generated sprite/map JS
BASE_FILES = ["index.html", "style.css", "sprites.js", "maps.js", "forkarcade-sdk.js", "fa-narrative.js"]


def _get_config(game_path):
    """Read .forkarcade.json from game directory."""
    config_path = game_path / ".forkarcade.json"
    if config_path.exists():
        try:
            return json.loads(config_path.read_text())
        except Exception as e:
            print(f"Warning: failed to parse {config_path}: {e}", file=sys.stderr)
    return {}


def _get_engine_files(game_path):
    """Get engine files list from .forkarcade.json (inherited from template repo)."""
    return _get_config(game_path).get("engineFiles", [])


def _get_game_files(game_path):
    """Get game files list from .forkarcade.json (inherited from template repo)."""
    return _get_config(game_path).get("gameFiles", [])


def _get_snapshot_files(game_path):
    """Build snapshot file list: base + engine + game files from template."""
    return BASE_FILES + _get_engine_files(game_path) + _get_game_files(game_path)


def run(cmd_args, cwd=None):
    """Run a command. cmd_args must be a list (no shell=True)."""
    result = subprocess.run(cmd_args, shell=False, capture_output=True, text=True, timeout=30, cwd=cwd)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"Command failed: {cmd_args}")
    return result.stdout.strip()



def _get_sdk_info():
    """Read canonical SDK file and extract version."""
    sdk_path = PLATFORM_ROOT / "sdk" / "forkarcade-sdk.js"
    if not sdk_path.exists():
        raise FileNotFoundError(f"SDK file not found: {sdk_path}")
    content = sdk_path.read_text()
    first_line = content.split('\n')[0]
    match = re.search(r'v(\d+)', first_line)
    version = int(match.group(1)) if match else 0
    return {"version": version, "content": content}


def list_templates(args):
    items = gh_list_templates()
    return json.dumps(items, indent=2)


def _apply_style(game_path, template_key, style_key=None):
    """Apply a style preset to the game. Returns style info dict or None."""
    styles_data = get_template_styles(template_key)
    if not styles_data:
        return None

    styles = styles_data.get("styles", {})
    if not styles:
        return None

    if not style_key:
        style_key = styles_data.get("default")
    if not style_key or style_key not in styles:
        return None

    style = styles[style_key]
    palette = style.get("palette", {})
    font = style.get("font", {})
    font_family = font.get("family", "sans-serif")
    font_fallback = font.get("fallback", "sans-serif")

    # Generate style.css with CSS custom properties
    css_vars = "\n".join(f"  --fa-{k}: {v};" for k, v in palette.items())
    css_content = (
        f"/* ForkArcade style: {style_key} */\n"
        f":root {{\n{css_vars}\n  --fa-font: '{font_family}', {font_fallback};\n}}\n"
        f"* {{ margin: 0; padding: 0; box-sizing: border-box; }}\n"
        f"body {{ background: var(--fa-bg, #000); display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; font-family: var(--fa-font); }}\n"
        f"canvas {{ background: var(--fa-canvas-bg, #001122); }}\n"
    )
    (game_path / "style.css").write_text(css_content)

    # Inject font <link> into index.html
    font_url = font.get("url")
    if font_url and font_url.startswith("https://"):
        index_path = game_path / "index.html"
        if index_path.exists():
            html = index_path.read_text()
            font_link = f'  <link rel="stylesheet" href="{font_url}">\n'
            if '<link rel="stylesheet" href="style.css">' in html:
                html = html.replace(
                    '<link rel="stylesheet" href="style.css">',
                    font_link + '  <link rel="stylesheet" href="style.css">'
                )
            elif '</head>' in html:
                html = html.replace('</head>', font_link + '</head>')
            index_path.write_text(html)

    return {
        "style": style_key,
        "fontFamily": f"{font_family}, {font_fallback}",
    }


def init_game(args):
    slug = args["slug"]
    template = args["template"]
    title = args["title"]
    description = args.get("description", "")
    style_key = args.get("style")

    tmpl = get_template(template)
    if not tmpl:
        available = [t["key"] for t in gh_list_templates()]
        return json.dumps({"error": f"Unknown template: {template}. Available: {', '.join(available)}"})
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

        # Narrative module — platform infrastructure
        narrative_src = PLATFORM_ROOT / "sdk" / "fa-narrative.js"
        if narrative_src.exists():
            (game_path / "fa-narrative.js").write_text(narrative_src.read_text())

        # Apply style preset (if template has styles)
        style_info = _apply_style(game_path, template, style_key)

        config_path = game_path / ".forkarcade.json"
        game_config = {}
        if config_path.exists():
            try:
                game_config = json.loads(config_path.read_text())
            except Exception:
                pass
        game_config.update({"slug": slug, "title": title, "currentVersion": 0, "versions": [], "sdkVersion": sdk_info["version"]})
        if style_info:
            game_config["style"] = style_info["style"]
            game_config["fontFamily"] = style_info["fontFamily"]
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
        (game_path / "_maps.json").write_text("{}\n")
        (game_path / "maps.js").write_text(generate_maps_js({}))

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
ForkArcade.onReady(function(ctx) {
  console.log('Game slug:', ctx.slug);
  startGame();
});
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
// { login: 'username', sub: 12345 }
```

### ForkArcade.updateNarrative(data)
Reports narrative state to the platform. Fire-and-forget (no Promise).
```js
ForkArcade.updateNarrative({
  variables: { karma: 3, has_key: true },
  graphs: {
    arc: {
      currentNode: 'dark-cellar',
      nodes: [
        { id: 'intro', label: 'Start', type: 'scene' },
        { id: 'dark-cellar', label: 'Dark Cellar', type: 'scene' },
      ],
      edges: [
        { from: 'intro', to: 'dark-cellar' },
      ]
    }
  },
  event: 'Entered dark cellar'
});
```
Node types: `scene`, `choice`, `condition`. Multiple named graphs supported (`arc`, `quest_*`, etc.).
"""


def get_game_prompt(args):
    template = args.get("template", "")
    template_prompt = get_template_prompt(template)
    if not template_prompt:
        return json.dumps({"error": f"No prompt found for template: {template}"})
    platform_path = SDK_DIR / "_platform.md"
    platform_rules = platform_path.read_text() if platform_path.exists() else ""
    return platform_rules + "\n\n" + template_prompt


def validate_game(args):
    game_path = validate_game_path(args["path"])
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

    # Narrative module check (platform infrastructure)
    if not (game_path / "fa-narrative.js").exists():
        issues.append("Missing fa-narrative.js — platform narrative module")

    # Engine files check (from template)
    engine_files = _get_engine_files(game_path)
    for ef in engine_files:
        if not (game_path / ef).exists():
            issues.append(f"Missing engine file: {ef}")

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

        required_scripts = engine_files + game_files
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
    game_path = validate_game_path(args["path"])
    slug = args["slug"]
    title = args["title"]
    description = args.get("description", "")
    results = []

    if not re.match(r"^[a-z0-9-]+$", slug):
        return json.dumps({"error": "Slug must be lowercase alphanumeric with hyphens"})

    try:
        # Cache bust: add ?v=N to script/link tags in index.html
        try:
            config_path_cb = game_path / ".forkarcade.json"
            if config_path_cb.exists():
                cb_cfg = json.loads(config_path_cb.read_text())
                cb_ver = (cb_cfg.get("currentVersion") or 0) + 1
                index_path = game_path / "index.html"
                if index_path.exists():
                    html = index_path.read_text()
                    html = re.sub(r'(src="[^"]+?\.js)(\?v=\d+)?(")', rf'\1?v={cb_ver}\3', html)
                    html = re.sub(r'(href="[^"]+?\.css)(\?v=\d+)?(")', rf'\1?v={cb_ver}\3', html)
                    index_path.write_text(html)
        except Exception as e:
            results.append(f"Cache bust skipped: {e}")

        try:
            snapshot_files = _get_snapshot_files(game_path)
            files_to_add = [f for f in snapshot_files if (game_path / f).exists()]
            files_to_add += [".forkarcade.json", "_sprites.json", "_maps.json"]
            run(["git", "add", "--"] + files_to_add, cwd=game_path)
            run(["git", "commit", "-m", "Publish game"], cwd=game_path)
        except Exception as e:
            results.append(f"Git commit skipped: {e}")
        run(["git", "push", "-u", "origin", "main"], cwd=game_path)
        results.append("Pushed to GitHub")

        if description:
            run(["gh", "repo", "edit", f"{ORG}/{slug}", "--description", description])

        try:
            run(["gh", "repo", "edit", f"{ORG}/{slug}", "--add-topic", "forkarcade-game"])
        except Exception as e:
            results.append(f"Topic 'forkarcade-game' skipped: {e}")

        # Add template category as topic (e.g. roguelike, strategy-rpg)
        try:
            config_path_topic = game_path / ".forkarcade.json"
            if config_path_topic.exists():
                cfg = json.loads(config_path_topic.read_text())
                template = cfg.get("template")
                if template:
                    run(["gh", "repo", "edit", f"{ORG}/{slug}", "--add-topic", template])
        except Exception as e:
            results.append(f"Template topic skipped: {e}")

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
                        shutil.copy2(src, version_dir / f)
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
                run(["git", "add", "versions/", ".forkarcade.json"], cwd=game_path)
                run(["git", "commit", "-m", f"Version v{next_version}"], cwd=game_path)
                run(["git", "push"], cwd=game_path)
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
    game_path = validate_game_path(args["path"])
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

    # Also update narrative module (platform infrastructure)
    narrative_src = SDK_DIR / "fa-narrative.js"
    narrative_dst = game_path / "fa-narrative.js"
    narrative_updated = False
    if narrative_src.exists():
        narrative_dst.write_text(narrative_src.read_text())
        narrative_updated = True

    config_path = game_path / ".forkarcade.json"
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text())
            config["sdkVersion"] = sdk_info["version"]
            config_path.write_text(json.dumps(config, indent=2) + "\n")
        except Exception as e:
            print(f"Warning: failed to update config sdkVersion: {e}", file=sys.stderr)

    msg = f"SDK updated from v{old_version} to v{sdk_info['version']}"
    if narrative_updated:
        msg += ", fa-narrative.js updated"

    return json.dumps({
        "ok": True,
        "message": msg,
        "version": sdk_info["version"],
    })


def list_evolve_issues(args):
    slug = args.get("slug")
    try:
        if slug:
            issues = _gh_api(f"/repos/{ORG}/{slug}/issues?labels=evolve&state=open&per_page=50")
        else:
            data = _gh_api(f"/search/issues?q=org:{ORG}+label:evolve+is:open&per_page=50")
            issues = data.get("items", [])

        result = []
        for issue in issues:
            repo_name = slug or issue.get("repository_url", "").split("/")[-1]
            result.append({
                "slug": repo_name,
                "number": issue["number"],
                "title": issue["title"].replace("[EVOLVE] ", ""),
                "body": issue.get("body") or "",
                "labels": [l["name"] for l in issue.get("labels", []) if l["name"] != "evolve"],
                "url": issue["html_url"],
            })

        if not result:
            return json.dumps({"ok": True, "message": "No evolve issues ready to implement", "issues": []})

        return json.dumps({"ok": True, "count": len(result), "issues": result}, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


def apply_data_patch(args):
    game_path = validate_game_path(args["path"])
    body = args.get("issue_body", "")

    match = re.search(r'```json:data-patch\s*\n(.*?)\n```', body, re.DOTALL)
    if not match:
        return json.dumps({"error": "No json:data-patch block found in issue body"})

    try:
        patch = json.loads(match.group(1))
    except json.JSONDecodeError as e:
        return json.dumps({"error": f"Invalid JSON in data-patch block: {e}"})

    patch_type = patch.get("type")
    if patch_type not in ("sprites", "maps"):
        return json.dumps({"error": f"Unknown data-patch type: {patch_type}. Supported: sprites, maps"})

    data = patch.get("data")
    if not isinstance(data, dict):
        return json.dumps({"error": "data-patch data must be an object"})

    if patch_type == "sprites":
        sprite_count = 0
        for cat, sprites in data.items():
            if not isinstance(sprites, dict):
                return json.dumps({"error": f"Category '{cat}' must be an object"})
            for name, s in sprites.items():
                if not isinstance(s.get("frames"), list) or len(s["frames"]) == 0:
                    return json.dumps({"error": f"{cat}/{name}: missing or empty frames"})
                if not isinstance(s.get("palette"), dict):
                    return json.dumps({"error": f"{cat}/{name}: missing palette"})
                w = s.get("w")
                h = s.get("h")
                if not isinstance(w, int) or not isinstance(h, int) or w < 1 or h < 1 or w > 128 or h > 128:
                    return json.dumps({"error": f"{cat}/{name}: w and h must be integers between 1 and 128"})
                sprite_count += 1

        (game_path / "_sprites.json").write_text(json.dumps(data, indent=2) + "\n")
        (game_path / "sprites.js").write_text(generate_sprites_js(data))

        return json.dumps({
            "ok": True,
            "message": f"Data patch applied: {sprite_count} sprites written",
            "sprites": sprite_count,
        })

    if patch_type == "maps":
        map_count = 0
        for name, map_data in data.items():
            if not isinstance(map_data, dict):
                return json.dumps({"error": f"Map '{name}' must be an object"})
            if not isinstance(map_data.get("grid"), list) or len(map_data["grid"]) == 0:
                return json.dumps({"error": f"Map '{name}' missing or empty grid"})
            for i, obj in enumerate(map_data.get("objects", [])):
                if not isinstance(obj, dict):
                    return json.dumps({"error": f"Map '{name}' object {i} must be an object"})
                for field in ("x", "y", "type"):
                    if field not in obj:
                        return json.dumps({"error": f"Map '{name}' object {i} missing '{field}'"})
            map_count += 1

        (game_path / "_maps.json").write_text(json.dumps(data, indent=2) + "\n")
        (game_path / "maps.js").write_text(generate_maps_js(data))

        return json.dumps({
            "ok": True,
            "message": f"Map data patch applied: {map_count} maps written",
            "maps": map_count,
        })
