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

Pamiętaj:
- Gra renderuje się na canvas w przeglądarce
- SDK jest już podpięty w index.html
- Wywołaj `ForkArcade.onReady()` na starcie i `ForkArcade.submitScore()` na końcu gry
- Skup się na core gameplay loop — nie overengineeruj
