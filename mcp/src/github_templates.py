"""Dynamic template discovery from GitHub API.

Template repos are identified by the 'forkarcade-template' topic.
The template key is the other topic (e.g. 'strategy-rpg', 'roguelike').
Template-specific data lives in each template repo:
  _assets.json — sprite palette and categories
  _prompt.md   — game design prompt for Claude
"""

import json
import subprocess
import time

ORG = "ForkArcade"
TEMPLATE_TOPIC = "forkarcade-template"

VALID_CATEGORIES = ["tiles", "enemies", "items", "player", "effects", "terrain", "units", "ui"]

# In-memory cache
_cache = {"templates": None, "templates_ts": 0, "assets": {}, "assets_ts": {}, "prompts": {}, "prompts_ts": {}}
_CACHE_TTL = 300  # 5 minutes


def _gh_api(path):
    """Call GitHub API via gh CLI."""
    result = subprocess.run(
        ["gh", "api", path],
        capture_output=True, text=True, timeout=15
    )
    if result.returncode != 0:
        raise RuntimeError(f"GitHub API error: {result.stderr.strip()}")
    return json.loads(result.stdout)


def _fetch_templates():
    """Fetch template repos from GitHub API."""
    now = time.time()
    if _cache["templates"] and (now - _cache["templates_ts"]) < _CACHE_TTL:
        return _cache["templates"]

    repos = _gh_api(f"/orgs/{ORG}/repos?per_page=100")
    templates = []
    for repo in repos:
        topics = repo.get("topics", [])
        if TEMPLATE_TOPIC not in topics:
            continue
        key = None
        for t in topics:
            if t != TEMPLATE_TOPIC:
                key = t
                break
        if not key:
            key = repo["name"].replace("game-template-", "")
        templates.append({
            "key": key,
            "repo": repo["full_name"],
            "name": repo.get("description") or repo["name"],
            "description": repo.get("description") or "",
        })

    _cache["templates"] = templates
    _cache["templates_ts"] = now
    return templates


def list_templates():
    """List all available templates from GitHub."""
    return _fetch_templates()


def get_template(key):
    """Get a specific template by key. Returns dict or None."""
    for t in _fetch_templates():
        if t["key"] == key:
            return t
    return None


def get_template_assets(key):
    """Fetch _assets.json from a template repo. Returns dict or None."""
    now = time.time()
    if key in _cache["assets"] and (now - _cache["assets_ts"].get(key, 0)) < _CACHE_TTL:
        return _cache["assets"][key]

    tmpl = get_template(key)
    if not tmpl:
        return None

    try:
        import base64
        data = _gh_api(f"/repos/{tmpl['repo']}/contents/_assets.json")
        content = base64.b64decode(data["content"]).decode("utf-8")
        assets = json.loads(content)
        _cache["assets"][key] = assets
        _cache["assets_ts"][key] = now
        return assets
    except Exception:
        return None


def get_template_prompt(key):
    """Fetch _prompt.md from a template repo. Returns string or None."""
    now = time.time()
    if key in _cache["prompts"] and (now - _cache["prompts_ts"].get(key, 0)) < _CACHE_TTL:
        return _cache["prompts"][key]

    tmpl = get_template(key)
    if not tmpl:
        return None

    try:
        import base64
        data = _gh_api(f"/repos/{tmpl['repo']}/contents/_prompt.md")
        content = base64.b64decode(data["content"]).decode("utf-8")
        _cache["prompts"][key] = content
        _cache["prompts_ts"][key] = now
        return content
    except Exception:
        return None
