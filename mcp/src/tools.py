TOOLS = [
    {
        "name": "list_templates",
        "description": "Lista dostępnych template'ów gier ForkArcade z opisami",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "init_game",
        "description": "Tworzy nową grę — forkuje template repo do org ForkArcade i klonuje lokalnie",
        "inputSchema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string", "description": 'Unikalna nazwa gry (lowercase, hyphens), np. "dark-dungeon"'},
                "template": {"type": "string", "description": "Klucz szablonu (topic z GitHub, np. strategy-rpg, roguelike)"},
                "title": {"type": "string", "description": "Wyświetlana nazwa gry"},
                "description": {"type": "string", "description": "Krótki opis gry"},
            },
            "required": ["slug", "template", "title"],
        },
    },
    {
        "name": "get_sdk_docs",
        "description": "Zwraca dokumentację ForkArcade SDK — jak gra komunikuje się z platformą",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_game_prompt",
        "description": "Zwraca prompt engineeringowy dla danego typu gry — wiedza o mechanikach, wzorcach kodu, strukturze",
        "inputSchema": {
            "type": "object",
            "properties": {
                "template": {"type": "string", "description": "Klucz szablonu (topic z GitHub, np. strategy-rpg, roguelike)"},
            },
            "required": ["template"],
        },
    },
    {
        "name": "validate_game",
        "description": "Sprawdza czy gra jest poprawnie skonfigurowana — SDK podpięty, index.html istnieje, submitScore wywołany",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ścieżka do katalogu gry"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "publish_game",
        "description": "Publikuje grę — push do GitHub, włącza GitHub Pages, rejestruje w platformie ForkArcade",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ścieżka do katalogu gry"},
                "slug": {"type": "string", "description": "Slug gry (nazwa repo)"},
                "title": {"type": "string", "description": "Tytuł gry"},
                "description": {"type": "string", "description": "Opis gry"},
            },
            "required": ["path", "slug", "title"],
        },
    },
    {
        "name": "get_asset_guide",
        "description": "Zwraca przewodnik po assetach dla danego typu gry — jakie sprite'y stworzyć, paleta kolorów, styl",
        "inputSchema": {
            "type": "object",
            "properties": {
                "template": {"type": "string", "description": "Klucz szablonu (topic z GitHub, np. strategy-rpg, roguelike)"},
            },
            "required": ["template"],
        },
    },
    {
        "name": "create_sprite",
        "description": "Tworzy pixel art sprite — waliduje, zapisuje do _sprites.json, generuje sprites.js",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ścieżka do katalogu gry"},
                "category": {"type": "string", "description": "Kategoria: tiles, enemies, items, player, effects, terrain, units, ui"},
                "name": {"type": "string", "description": 'Nazwa sprite\'a, np. "rat", "wallLit", "warrior"'},
                "palette": {"type": "object", "description": 'Mapa znaków na kolory hex: { "1": "#a86", "2": "#d9a" }'},
                "pixels": {"type": "array", "items": {"type": "string"}, "description": 'Grid pikseli — każdy wiersz to string, "." = transparent'},
            },
            "required": ["path", "category", "name", "palette", "pixels"],
        },
    },
    {
        "name": "validate_assets",
        "description": "Sprawdza czy gra ma wszystkie wymagane sprite'y dla swojego typu",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ścieżka do katalogu gry"},
                "template": {"type": "string", "description": "Klucz szablonu (opcjonalny — wykryje automatycznie)"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "preview_assets",
        "description": "Generuje _preview.html z podglądem wszystkich sprite'ów w różnych skalach",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ścieżka do katalogu gry"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "get_versions",
        "description": "Zwraca historię wersji gry z .forkarcade.json",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ścieżka do katalogu gry"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "update_sdk",
        "description": "Aktualizuje forkarcade-sdk.js w grze do najnowszej wersji z platformy",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ścieżka do katalogu gry"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "create_thumbnail",
        "description": """Tworzy miniaturkę gry (72x32 PNG). Wielowarstwowe malowanie — od ogółu do szczegółu. Auto-commit + push.

== STYL ARTYSTYCZNY ==
Dobierz styl do klimatu gry. Jeśli żaden nie pasuje idealnie — wylosuj jednego:
- Paul Robertson — action, chaos, gęste detale, surreal. Żywe kolory, dużo ruchu w kadrze. Dla: arcade, beat'em up, szalone gry.
- eBoy — izometria, czyste linie, kolorowe, urban. Precyzyjne krawędzie, nasycona paleta. Dla: city builder, strategia, puzzle.
- Henk Nieborg — klasyczny game art, bogate tła, głębia planów. Mistrz gradientów i textur. Dla: platformówki, adventure, retro.
- Gustavo Viselner — kinowe kompozycje, silna narracja w kadrze, filmowe ujęcia. Dla: RPG, story-driven, klimatyczne.
- Uno Moralez — mroczny noir, niepokojący, nostalgiczny horror. Ograniczona paleta, mocne cienie. Dla: horror, dark fantasy, mystery.
- Kirokaze — atmosferyczne krajobrazy, piękne oświetlenie, ciepło w chłodzie. Dla: exploration, fantasy, atmospheric.
- Cyangmou — izometryczne krajobrazy, detale terenu, naturalistyczne. Dla: strategia, RPG overworld, survival.

== ZASADY PIXEL ARTU ==
1. PALETA: max 8-10 kolorów. Buduj rampy tonalne (3-4 odcienie na barwę, spójne stepy jasności).
   Nie losuj kolorów — projektuj rampę: cień → baza → highlight. Np. mur: #0e0a28 → #2c2078 → #4838a0.
2. SYLWETKA FIRST: kształt musi czytać się natychmiast, nawet bez kolorów. Testuj: czy sam outline mówi "zamek"/"las"/"statek"?
3. DITHERING na gradienty: checkerboard (SkSk), ordered (SSkSSk), noise — NIE smooth upscale na pixel arcie. Mieszaj znaki palety w rows.
4. KONTRAST: ciemne cienie + jasne akcenty. Złote okna (#ffc030) na fioletowym murze (#2c2078). Jeden jasny punkt przyciąga oko.
5. WARM/COOL: ciepłe światła (gold, amber, orange) w chłodnych scenach (navy, purple, teal). To tworzy życie.
6. PERSPEKTYWA ATMOSFERYCZNA: daleko = jaśniej, bledniej, mniej detali. Blisko = ciemniej, nasycone, ostre. Użyj ostatnich warstw z lanczos + low opacity.
7. KAŻDY PIKSEL MA ZNACZENIE: przy 36×16 nie ma miejsca na spam. Jeden piksel = jedna decyzja.

== FORMAT WARSTWY ==
{res:[w,h], aa:"bilinear", opacity:1.0, ops:[...]}
- res: rozdzielczość renderowania (domyślnie [72,32]). Mniej pikseli = upscale = miękkość.
- aa: "nearest" (ostre piksele), "bilinear" (miękkie), "bicubic" (gładkie), "lanczos" (najgładsze)
- opacity: 0.0-1.0
- ops: lista operacji rysowania

OPERACJE (w ops):
- {"fill": "#color"}
- {"rect": {"x":, "y":, "w":, "h":, "color":}}
- {"gradient": {"from":, "to":, "direction":"vertical|horizontal", x, y, w, h}}
- {"circle": {"cx":, "cy":, "r":, "color":}}
- {"polygon": {"points":[[x,y],...], "color":, "outline":, "width":}} — dowolna liczba punktów, fill i/lub outline
- {"triangle": {"points":[[x,y],[x,y],[x,y]], "color":}} — skrót na 3-punktowy polygon z fill
- {"line": {"x1":, "y1":, "x2":, "y2":, "color":, "width":}}
- {"scatter": {"color":, "count":, "seed":, x, y, w, h}}
- {"dither": {"color":, "density":, "seed":, x, y, w, h}}
- {"pixels": {"palette":{"char":"#hex"}, "rows":["..."], x, y}}
'.' = przezroczysty. Kolory z alpha: "#rrggbbaa".

== WORKFLOW (5 warstw, od ogółu do szczegółu) ==

1. NIEBO / TŁO (res [9,4] lub [12,6], aa lanczos)
   Użyj gradient lub fill — NIE pixels. To jest tło za wszystkim, ma być gładkie.
   Np. gradient nocnego nieba: {"gradient": {"from":"#020010", "to":"#181050"}}
   Zachód słońca: {"gradient": {"from":"#0a0428", "to":"#c84820"}}

2. PIXEL ART SCENA (res [36,16], aa nearest) — GŁÓWNY obraz
   Użyj pixels z ręcznym dithering. Tu jest sylwetka, budynki, teren, postacie.
   '.' = przezroczysty (niebo z L1 prześwituje). Każdy piksel = świadoma decyzja.
   Można mieszać z rect (budynki), triangle (dachy, góry) na tej samej warstwie.

3. DETALE / AKCENTY (res [72,32], aa nearest)
   scatter — gwiazdy (count:15-25, białe), śnieg, iskry, deszcz. Proceduralnie, z seed.
   circle — księżyc, słońce, orby. Layered: duży ciemny + mały jasny = 3D.
   pixels — okna (ciepłe! #ffc030), oczy, drobne detale. Punkty które przyciągają oko.
   line — promienie światła, horyzont, strugi deszczu.

4. GLOW / POŚWIATA (res [18,8] lub [12,6], aa lanczos, opacity 0.15-0.25)
   circle — miękki halo wokół księżyca/lamp. Na niskim res + lanczos = naturalny glow.
   gradient — poświata na horyzoncie, ciepłe światło z okien.
   Prymitywy > pixels na tej warstwie (gładkie kształty, nie pikselowe).

5. ATMOSFERA (res [9,4], aa lanczos, opacity 0.08-0.15)
   dither — mgła, dym, haze. density 0.3-0.5, ograniczone do dolnej połowy.
   fill lub gradient — delikatny kolor nałożony na dół = głębia.
   To jest ostatnia warstwa — podkręca perspektywę atmosferyczną.""",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ścieżka do katalogu gry"},
                "layers": {
                    "type": "array",
                    "description": "Warstwy od tła do przodu. Każda: {res:[w,h], aa:string, opacity:float, ops:[...]}",
                    "items": {"type": "object"},
                },
            },
            "required": ["path", "layers"],
        },
    },
]
