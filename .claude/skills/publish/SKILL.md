---
name: publish
description: Waliduje i publikuje grę na platformie ForkArcade — push do GitHub, GitHub Pages, rejestracja w katalogu gier.
disable-model-invocation: true
---

Publikujesz grę na platformę ForkArcade. Postępuj krok po kroku:

1. Użyj narzędzia `validate_game` z path do bieżącego katalogu gry
2. Jeśli są problemy — napraw je i waliduj ponownie
3. Pokaż użytkownikowi podsumowanie: slug, tytuł, opis
4. Zapytaj o potwierdzenie publikacji
5. Użyj narzędzia `publish_game` z odpowiednimi parametrami
6. Pokaż wynik: link do repo, link do gry na platformie
