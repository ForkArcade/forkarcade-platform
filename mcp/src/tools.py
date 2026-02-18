TOOLS = [
    {
        "name": "list_templates",
        "description": "List available ForkArcade game templates with descriptions",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "init_game",
        "description": "Creates a new game — forks a template repo to the ForkArcade org and clones it locally",
        "inputSchema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string", "description": 'Unique game name (lowercase, hyphens), e.g. "dark-dungeon"'},
                "template": {"type": "string", "description": "Template key (GitHub topic, e.g. strategy-rpg, roguelike)"},
                "title": {"type": "string", "description": "Display name of the game"},
                "description": {"type": "string", "description": "Short game description"},
                "style": {"type": "string", "description": "Style preset key (e.g. dark-neon, retro-green). Uses template default if not specified."},
            },
            "required": ["slug", "template", "title"],
        },
    },
    {
        "name": "get_sdk_docs",
        "description": "Returns ForkArcade SDK documentation — how the game communicates with the platform",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_game_prompt",
        "description": "Returns the engineering prompt for a given game type — knowledge about mechanics, code patterns, structure",
        "inputSchema": {
            "type": "object",
            "properties": {
                "template": {"type": "string", "description": "Template key (GitHub topic, e.g. strategy-rpg, roguelike)"},
            },
            "required": ["template"],
        },
    },
    {
        "name": "validate_game",
        "description": "Checks if the game is properly configured — SDK included, index.html exists, submitScore called",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "publish_game",
        "description": "Publishes the game — push to GitHub, enable GitHub Pages, register on the ForkArcade platform",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
                "slug": {"type": "string", "description": "Game slug (repo name)"},
                "title": {"type": "string", "description": "Game title"},
                "description": {"type": "string", "description": "Game description"},
            },
            "required": ["path", "slug", "title"],
        },
    },
    {
        "name": "get_asset_guide",
        "description": "Returns the asset guide for a given game type — which sprites to create, color palette, style",
        "inputSchema": {
            "type": "object",
            "properties": {
                "template": {"type": "string", "description": "Template key (GitHub topic, e.g. strategy-rpg, roguelike)"},
            },
            "required": ["template"],
        },
    },
    {
        "name": "create_sprite",
        "description": "Creates a pixel art sprite frame — validates, saves to _sprites.json, generates sprites.js. Call multiple times with frame param to add animation frames.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
                "category": {"type": "string", "description": "Category: tiles, enemies, items, player, effects, terrain, units, ui"},
                "name": {"type": "string", "description": 'Sprite name, e.g. "rat", "wallLit", "warrior"'},
                "palette": {"type": "object", "description": 'Character-to-hex color map: { "1": "#a86", "2": "#d9a" }'},
                "pixels": {"type": "array", "items": {"type": "string"}, "description": 'Pixel grid for one frame — each row is a string, "." = transparent'},
                "frame": {"type": "integer", "description": "Frame index (0-based). If omitted, appends a new frame. Use to build animation: frame 0, 1, 2..."},
                "origin": {"type": "array", "items": {"type": "integer"}, "description": "Anchor point [ox, oy] in pixel coords. Default [0,0] (top-left). Use [w/2, h-1] for bottom-center (isometric objects, characters)."},
            },
            "required": ["path", "category", "name", "palette", "pixels"],
        },
    },
    {
        "name": "validate_assets",
        "description": "Checks if the game has all required sprites for its type",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
                "template": {"type": "string", "description": "Template key (optional — auto-detected)"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "preview_assets",
        "description": "Generates _preview.html with a preview of all sprites at different scales",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "get_versions",
        "description": "Returns the game's version history from .forkarcade.json",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "update_sdk",
        "description": "Updates forkarcade-sdk.js in the game to the latest version from the platform",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "create_thumbnail",
        "description": """Creates a game thumbnail (72x32 PNG). Multi-layer painting — from general to detail. Auto-commit + push.

== ART STYLE ==
Match the style to the game's mood. If none fits perfectly — pick one at random:
- Paul Robertson — action, chaos, dense detail, surreal. Vivid colors, lots of motion in frame. For: arcade, beat'em up, crazy games.
- eBoy — isometric, clean lines, colorful, urban. Precise edges, saturated palette. For: city builder, strategy, puzzle.
- Henk Nieborg — classic game art, rich backgrounds, depth of planes. Master of gradients and textures. For: platformer, adventure, retro.
- Gustavo Viselner — cinematic compositions, strong in-frame narrative, filmic framing. For: RPG, story-driven, atmospheric.
- Uno Moralez — dark noir, unsettling, nostalgic horror. Limited palette, strong shadows. For: horror, dark fantasy, mystery.
- Kirokaze — atmospheric landscapes, beautiful lighting, warmth in cold. For: exploration, fantasy, atmospheric.
- Cyangmou — isometric landscapes, terrain detail, naturalistic. For: strategy, RPG overworld, survival.

== PIXEL ART RULES ==
1. PALETTE: max 8-10 colors. Build tonal ramps (3-4 shades per hue, consistent brightness steps).
   Don't randomize colors — design a ramp: shadow -> base -> highlight. E.g. wall: #0e0a28 -> #2c2078 -> #4838a0.
2. SILHOUETTE FIRST: shape must read instantly, even without colors. Test: does the outline alone say "castle"/"forest"/"ship"?
3. DITHERING for gradients: checkerboard (SkSk), ordered (SSkSSk), noise — NOT smooth upscale on pixel art. Mix palette chars in rows.
4. CONTRAST: dark shadows + bright accents. Golden windows (#ffc030) on purple wall (#2c2078). One bright point draws the eye.
5. WARM/COOL: warm lights (gold, amber, orange) in cool scenes (navy, purple, teal). This creates life.
6. ATMOSPHERIC PERSPECTIVE: far = lighter, faded, less detail. Near = darker, saturated, sharp. Use later layers with lanczos + low opacity.
7. EVERY PIXEL MATTERS: at 36x16 there's no room for spam. One pixel = one decision.

== LAYER FORMAT ==
{res:[w,h], aa:"bilinear", opacity:1.0, ops:[...]}
- res: render resolution (default [72,32]). Fewer pixels = upscale = softness.
- aa: "nearest" (sharp pixels), "bilinear" (soft), "bicubic" (smooth), "lanczos" (smoothest)
- opacity: 0.0-1.0
- ops: list of drawing operations

OPERATIONS (in ops):
- {"fill": "#color"}
- {"rect": {"x":, "y":, "w":, "h":, "color":}}
- {"gradient": {"from":, "to":, "direction":"vertical|horizontal", x, y, w, h}}
- {"circle": {"cx":, "cy":, "r":, "color":, "outline":, "width":}} — fill and/or outline
- {"polygon": {"points":[[x,y],...], "color":, "outline":, "width":}} — any number of points, fill and/or outline
- {"triangle": {"points":[[x,y],[x,y],[x,y]], "color":}} — shorthand for 3-point polygon with fill
- {"line": {"x1":, "y1":, "x2":, "y2":, "color":, "width":}}
- {"scatter": {"color":, "count":, "seed":, x, y, w, h}}
- {"dither": {"color":, "density":, "seed":, x, y, w, h}}
- {"pixels": {"palette":{"char":"#hex"}, "rows":["..."], x, y}}
- {"sprite": {"category":, "name":, "x":, "y":, "scale":, "frame":}} — render sprite from game's _sprites.json. category+name lookup (e.g. "units"/"warrior"). scale=pixel size (1=1:1, 2=2x, etc.). frame=index (default 0).
- {"pixel_text": {"text":, "x":, "y":, "color":, "shadow":, "scale":}} — built-in 3x5 pixel font (A-Z, 0-9, space, punctuation). shadow=offset color. scale=pixel size.
- {"hex_grid": {"cols":, "rows":, "hex_size":, "x":, "y":, "terrain":[[row of terrain names]], "colors":{"name":"#hex"}, "outline":, "outline_width":, "default_color":}} — hex grid with terrain coloring. Odd rows offset right.
'.' = transparent. Colors with alpha: "#rrggbbaa".

== WORKFLOW (5 layers, from general to detail) ==

1. SKY / BACKGROUND (res [9,4] or [12,6], aa lanczos)
   Use gradient or fill — NOT pixels. This is the background behind everything, should be smooth.
   E.g. night sky gradient: {"gradient": {"from":"#020010", "to":"#181050"}}
   Sunset: {"gradient": {"from":"#0a0428", "to":"#c84820"}}

2. PIXEL ART SCENE (res [36,16], aa nearest) — MAIN image
   Use pixels with manual dithering. This is where silhouettes, buildings, terrain, characters go.
   '.' = transparent (sky from L1 shows through). Every pixel = conscious decision.
   Can mix with rect (buildings), triangle (roofs, mountains) on the same layer.

3. DETAILS / ACCENTS (res [72,32], aa nearest)
   scatter — stars (count:15-25, white), snow, sparks, rain. Procedural, with seed.
   circle — moon, sun, orbs. Layered: large dark + small bright = 3D.
   pixels — windows (warm! #ffc030), eyes, fine details. Points that draw the eye.
   line — light rays, horizon, rain streaks.

4. GLOW / HALO (res [18,8] or [12,6], aa lanczos, opacity 0.15-0.25)
   circle — soft halo around moon/lamps. At low res + lanczos = natural glow.
   gradient — horizon glow, warm light from windows.
   Primitives > pixels on this layer (smooth shapes, not pixelated).

5. ATMOSPHERE (res [9,4], aa lanczos, opacity 0.08-0.15)
   dither — fog, smoke, haze. density 0.3-0.5, limited to bottom half.
   fill or gradient — subtle color overlay on bottom = depth.
   This is the last layer — enhances atmospheric perspective.

== TITLE ==
Title text (pixel_text) is OPTIONAL. Not every thumbnail needs a title overlay.
Use it when the image alone doesn't clearly identify the game. Skip it when the scene is strong enough on its own — let the art speak.""",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
                "layers": {
                    "type": "array",
                    "description": "Layers from back to front. Each: {res:[w,h], aa:string, opacity:float, ops:[...]}",
                    "items": {"type": "object"},
                },
            },
            "required": ["path", "layers"],
        },
    },
    {
        "name": "list_evolve_issues",
        "description": "Lists open issues with the 'evolve' label — ready to implement. Shows all games from platform context, or current game only from game context.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string", "description": "Game slug (optional — auto-detected from game context)"},
            },
        },
    },
    {
        "name": "apply_data_patch",
        "description": "Applies a data-patch from an evolve issue — writes sprite data deterministically without LLM interpretation. Parses the JSON data block from the issue body, writes _sprites.json and regenerates sprites.js.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the game directory"},
                "issue_body": {"type": "string", "description": "Full GitHub issue body containing ```json:data-patch block"},
            },
            "required": ["path", "issue_body"],
        },
    },
    {
        "name": "delete_game",
        "description": "Deletes a game — removes GitHub repo, cleans up scores/votes from database, deletes local directory. Admin operation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string", "description": "Game slug (repo name) to delete"},
            },
            "required": ["slug"],
        },
    },
]
