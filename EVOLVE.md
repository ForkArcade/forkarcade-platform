# Evolve — Ewolucja Gier przez Graczy i AI

## Wizja

Gry na ForkArcade nie mają jednego autora. Gry **ewoluują** — gracze decydują co się zmienia, AI to implementuje. Każda gra to żywy organizm napędzany feedbackiem społeczności i autonomią AI.

Issue na GitHub to DNA zmian. ForkCoin to mechanizm selekcji. Claude Code to silnik mutacji.

## Aktorzy

### Gracz
- Gra w gry → zarabia ForkCoin
- Pisze issues (propozycje zmian) na GitHub repo gry
- Głosuje coinami na cudze issues
- Testuje nowe wersje po merge

### AI (Claude Code)
- Odbiera najwyżej głosowane issue
- Analizuje kod gry, engine, prompt
- Implementuje zmiany → otwiera PR
- PR merge → nowa wersja gry (snapshot w `/versions/vN/`)

### Platforma
- Agreguje głosy, zarządza kolejką evolve
- Triggeruje GitHub Actions workflow
- Archiwizuje wersje, wyświetla changelog
- Pilnuje fairness (limity, cooldowny)

## Flow

```
1. Gracz pisze issue na GitHub
   "Dodaj system craftingu z zebranych surowców"
   ↓
2. Issue pojawia się na platformie (GamePage → tab Issues)
   Inni gracze widzą propozycję
   ↓
3. Gracze głosują coinami
   10 coinów = 1 głos, bez limitu per issue
   Coiny są wydawane (burned) — nie wracają
   ↓
4. Evolve trigger
   Co X godzin (lub po osiągnięciu progu głosów)
   platforma wybiera issue z najwyższą liczbą głosów
   ↓
5. GitHub Actions workflow
   Label `evolve` + komentarz z kontekstem głosów
   Claude Code dostaje issue + codebase + game prompt
   ↓
6. AI implementuje → PR
   PR zawiera: zmiany w kodzie, opis, test notes
   ↓
7. Auto-merge (lub review przez twórcę)
   Version workflow tworzy snapshot /versions/vN/
   ↓
8. Nowa wersja live na platformie
   Gracze widzą changelog, mogą grać w nową wersję
   Nowy cykl się zaczyna
```

## Issues na GitHub — konwencje

### Kto może pisać issues
- Każdy z kontem GitHub (publiczne repo = publiczne issues)
- Platforma może oferować formularz który tworzy issue przez GitHub API (uproszczony UX)

### Kategorie issues (labels)

| Label | Opis | Przykład |
|-------|------|---------|
| `feature` | Nowa mechanika lub content | "Dodaj system craftingu" |
| `balance` | Zmiana balansu / trudności | "Za dużo wrogów na lvl 3" |
| `visual` | Grafika, animacje, UI | "Lepsze eksplozje" |
| `audio` | Dźwięki, muzyka | "Dodaj efekt dźwiękowy strzału" |
| `bug` | Coś nie działa | "Gracz przechodzi przez ściany" |
| `narrative` | Fabuła, dialogi, branching | "Dodaj alternatywne zakończenie" |

### Format issue (template)

```markdown
## Co chcę zmienić
[Opis zmiany — co gracz powinien zobaczyć/poczuć]

## Dlaczego
[Motywacja — co jest teraz nie tak lub czego brakuje]

## Jak to może wyglądać (opcjonalne)
[Szczegóły implementacji, jeśli gracz ma pomysł]
```

Platforma może prepopulować template przy tworzeniu issue z UI.

## Mechanizm głosowania

### Zasady
- **1 głos = 10 ForkCoin** (konfigurowalny per gra)
- Gracz może dać wiele głosów na jedno issue (stake więcej coinów = silniejszy głos)
- Coiny są **burned** przy głosowaniu — nie wracają. To nadaje im wartość.
- Głosować można tylko na otwarte issues z odpowiednim labelem
- Nie można głosować na własne issues (anti-spam)

### Wyświetlanie
- GamePage → nowy tab (ikona: `Vote` / `Megaphone`) obok Leaderboard/Narrative/Changelog
- Lista otwartych issues posortowana po liczbie głosów
- Przy każdym issue: tytuł, kategoria, liczba głosów, przycisk "Vote"
- Po zagłosowaniu: animacja coina, aktualizacja salda

### Anti-gaming
- Minimum 1 sesja w grze zanim możesz głosować (musisz grać żeby mieć opinię)
- Rate limit: max X głosów per gra per dzień
- Twórca gry może zablokować issue (close) jeśli jest spam/trolling

## Evolve Trigger — kiedy AI zaczyna pracę

### Opcja A: Próg głosów
- Issue zbiera N głosów → automatyczny trigger
- Próg rośnie z każdą wersją gry (v1: 10 głosów, v2: 15, v3: 20...)
- Zapobiega zbyt częstym zmianom w początkowej fazie

### Opcja B: Cykl czasowy
- Co 48h/72h platforma sprawdza najwyżej głosowane issue
- Jeśli jest issue z > 0 głosów → trigger
- Przewidywalny rytm ewolucji

### Opcja C: Hybryda (rekomendacja)
- Cykl co 48h, ALE issue z > N głosów triggeruje natychmiast
- Pilne poprawki (bugi) mogą mieć niższy próg
- Twórca gry może ręcznie triggerować evolve

## Rola twórcy gry

Twórca (kto zrobił `init_game` + `publish_game`) ma specjalne uprawnienia:

- **Veto** — może zamknąć issue które nie pasuje do wizji gry
- **Priority** — może oznaczyć issue jako `priority` (AI bierze je najpierw, niezależnie od głosów)
- **Manual trigger** — może odpalić evolve bez czekania na głosy
- **Review PR** — może wymagać review przed merge (zamiast auto-merge)
- **Freeze** — może zamrozić grę (brak evolve) na czas określony

Twórca NIE może:
- Głosować coinami na issues własnej gry
- Mintować coinów poza normalnym graniem

## AI Context — co Claude Code dostaje

Przy evolve workflow AI otrzymuje:

```
1. Issue z GitHub (tytuł, body, labels, komentarze)
2. Kontekst głosów (ile głosów, kto głosował — anonimowo)
3. Pełen kod gry (repo)
4. _prompt.md z template'u (mechaniki, scoring, rendering)
5. CLAUDE.md z template'u (API engine'u)
6. _platform.md (złote zasady platformy)
7. Historia poprzednich wersji (changelog)
8. Obecny stan narracji (jeśli relevantne)
```

AI NIE dostaje:
- Dostępu do bazy danych platformy
- Możliwości zmiany SDK lub engine'u (tylko game files)
- Dostępu do innych gier

## Wersje i kompatybilność

Każdy evolve tworzy nową wersję:

```
/index.html          ← latest (po merge)
/versions/v1/        ← snapshot v1
/versions/v2/        ← snapshot v2 (po evolve)
/.forkarcade.json    ← versions array z opisami
```

- Stare wersje zawsze grywalne (snapshot jest kompletny)
- Leaderboard per wersja (score z v1 nie miesza się z v2)
- Gracz może wrócić do dowolnej wersji przez SegmentedControl
- Coiny zarabia się z dowolnej wersji (ale kurs może się różnić)

## UI na platformie

### GamePage — nowy tab "Evolve" (ikona: Zap / Rocket)

```
┌─────────────────────────────┐
│ ▲ 47  Dodaj system craftingu│  ← najwyżej głosowane
│       feature · #12         │
│       [Vote 10₵]            │
├─────────────────────────────┤
│ ▲ 23  Alternatywne          │
│       zakończenie            │
│       narrative · #15       │
│       [Vote 10₵]            │
├─────────────────────────────┤
│ ▲ 8   Lepsze eksplozje      │
│       visual · #18          │
│       [Vote 10₵]            │
├─────────────────────────────┤
│ ▲ 3   Bug: przechodzenie    │
│       przez ściany           │
│       bug · #20             │
│       [Vote 10₵]            │
└─────────────────────────────┘
  Próg evolve: 50 głosów
  Następny cykl: za 18h
```

### HomePage — badge "Hot" na kartach gier

- Gry z aktywnym głosowaniem (> N głosów w ostatnich 48h) dostają badge
- Zachęca do wejścia i zagłosowania

### Profil gracza — historia głosów

- "Zagłosowałeś na 12 issues w 5 grach"
- "3 Twoje propozycje zostały zaimplementowane"
- Achievement: "Kingmaker" — Twój głos przesądził o evolve

## Fazy wdrożenia

### Faza 1: Issues na platformie (read-only)
- Nowy tab "Evolve" na GamePage
- Pobieranie issues z GitHub API (label filter)
- Wyświetlanie listy — bez głosowania jeszcze
- Link do GitHub issue (otwiera w nowym oknie)

### Faza 2: Głosowanie coinami
- Integracja z walletem (COIN.md)
- Przycisk "Vote" → burn coinów → komentarz na GitHub issue z liczbą głosów
- Sortowanie po głosach
- Anti-gaming (rate limits, minimum 1 sesja)

### Faza 3: Automatyczny evolve trigger
- GitHub Actions workflow czyta głosy (z komentarzy lub API platformy)
- Automatyczny trigger po osiągnięciu progu
- Powiadomienie na platformie: "Nowa wersja w drodze!"

### Faza 4: Formularz issues z platformy
- Gracz pisze issue bez wychodzenia z platformy
- Platforma tworzy issue przez GitHub API
- Template z kategoriami (labels)
- Uproszczony UX dla nie-devów

### Faza 5: Governance zaawansowany
- Twórca: veto, priority, freeze
- Dynamiczny próg głosów
- Sezonowość (resety, eventy)
- Achievement system za udział w evolucji
