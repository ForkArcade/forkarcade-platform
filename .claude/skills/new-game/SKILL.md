---
name: new-game
description: Tworzy nową grę na platformę ForkArcade. Pyta o typ gry, nazwę i opis, potem inicjalizuje projekt z odpowiedniego template'u.
---

Tworzysz nową grę na platformę ForkArcade. Postępuj krok po kroku:

1. Zapytaj użytkownika o wizję gry — co to za gra, jaki klimat, jakie mechaniki
2. Użyj narzędzia `list_templates` aby zobaczyć dostępne template'y
3. Zaproponuj najlepszy template na podstawie opisu użytkownika
4. Zapytaj o slug (nazwa repo, lowercase-with-hyphens) i tytuł gry
5. Użyj narzędzia `init_game` aby sforkować template i sklonować repo
6. Użyj narzędzia `get_game_prompt` aby pobrać wiedzę o mechanikach tego typu gry
7. Na podstawie wizji użytkownika i promptu — zaimplementuj grę w `game.js`
8. Użyj narzędzia `validate_game` aby sprawdzić czy wszystko jest OK
9. Zapytaj użytkownika czy chce opublikować — jeśli tak, użyj `publish_game`

Po implementacji gry (opcjonalnie):
10. Zapytaj użytkownika czy chce stworzyć pixel art sprite'y
11. Jeśli tak — użyj `get_asset_guide` aby poznać wymagane sprite'y dla tego szablonu
12. Użyj `create_sprite` wielokrotnie aby stworzyć sprite'y (8x8 pixel art)
13. Dodaj `<script src="sprites.js"></script>` w index.html przed game.js
14. Dodaj fallback pattern w renderze: `getSprite()` → `drawSprite()` → tekst/geometria

Pamiętaj:
- Gra renderuje się na canvas w przeglądarce
- SDK jest już podpięty w index.html
- Wywołaj `ForkArcade.onReady()` na starcie i `ForkArcade.submitScore()` na końcu gry
- Skup się na core gameplay loop — nie overengineeruj
- Sprite'y są opcjonalne — gra musi działać bez nich (fallback na tekst)
- Po publikacji gra ma system wersji: issues z labelem `evolve` → Claude Code → PR → nowa wersja
- `publish_game` automatycznie tworzy version v1 snapshot
