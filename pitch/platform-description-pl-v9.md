# ForkArcade — Platforma Gier z Open Narrative i Ewolucją Społecznościową

## Czym jest ForkArcade?

ForkArcade to otwarta platforma, na której gry powstają z szablonów, a gracze rozwijają je przez głosowanie. Każda gra działa na GitHub Pages, jest budowana przez Claude Code (agenta programistycznego od Anthropic) i żyje jako publiczne repozytorium — w pełni transparentne, forkowalne i zarządzane przez społeczność.

Twórca nie pisze kodu. Twórca wnosi wizję — koncept gry, mechaniki, łuk narracyjny. Claude Code zajmuje się resztą: od szkieletu do grywalnej gry w minuty, nie miesiące.

## Aktualny Stan Produktu

ForkArcade to działający produkt z grywalnymi grami dostępnymi publicznie.

| Metryka | Wartość |
|---------|--------|
| Opublikowane gry | **9** (wszystkie live na GitHub Pages) |
| Szablony gier | **5** (roguelike, strategy-RPG, space-combat, city-builder, space-trader) |
| Poziom TRL | **TRL 7** — prototyp działa w środowisku operacyjnym |
| Infrastruktura | Platforma (React + Express + Turso), SDK, silnik narracji, MCP pipeline |
| Hosting gier | GitHub Pages — zero kosztów hostingu, 100% uptime |

### Co działa dziś

- **Pełny pipeline tworzenia gier** — od opisu konceptu do grywalnej gry z live URL w jednej sesji
- **9 opublikowanych gier** w 5 gatunkach, każda z narracją, scoringiem i sprite'ami:
  - `castle-of-arcana`, `dark-descent` (roguelike)
  - `hex-crusade` (strategy-RPG)
  - `cosmic-drifters`, `asteroid-hunter` (space-combat)
  - `river-valley-settlement` (city-builder)
  - `void-merchants` (space-trader)
- **System ewolucji** — propozycje zmian, głosowanie, wersjonowanie (każda wersja zachowana i grywalna)
- **Edytor sprite'ów** — pixel art editor z hot-reload do gry w czasie rzeczywistym
- **Autentykacja GitHub OAuth** + leaderboard + wallet
- **14 narzędzi MCP** — zautomatyzowany pipeline: init → sprite'y → walidacja → publikacja

Przykładowa gra: `https://forkarcade.github.io/play/deep-protocol/`

## Silnik Narracji

Narracja nie jest dodatkiem — jest wbudowana w platformę na poziomie SDK.

Każda gra na ForkArcade zawiera **moduł narracji** (`fa-narrative.js`), który zapewnia:
- Skierowany graf węzłów fabularnych i przejść
- Zmienne runtime śledzące decyzje i postępy gracza
- Zdarzenia emitowane z rozgrywki, wizualizowane przez platformę w czasie rzeczywistym

Twórca gry definiuje *co się dzieje* — platforma zajmuje się *jak to opowiedzieć*. Panel Narracji na stronie gry pokazuje graf fabuły na żywo, zmienne i log zdarzeń. Gracze widzą, jak ich akcje kształtują historię, bez pisania choćby jednej linii kodu UI.

Każda gra na platformie — od strzelca kosmicznego po city builder — ma głębię narracyjną domyślnie. Twórca skupia się na mechanikach. Platforma dostarcza infrastrukturę fabularną.

## Open Narrative: Społeczność Pisze Historię

Tradycyjne gry mają zamkniętą narrację — studio pisze fabułę, gracz ją konsumuje. ForkArcade wprowadza **Open Narrative** — model, w którym fabuła gry jest otwarta na ewolucję tak samo jak jej kod.

### Jak to działa

1. Gracz gra i doświadcza aktualnej wersji fabuły
2. Gracz proponuje zmianę narracyjną: „Dodaj alternatywne zakończenie, gdzie boss staje się sojusznikiem"
3. Społeczność głosuje ForkCoinem — monety są spalane, tworząc realny koszt decyzji
4. Przy 3+ unikalnych głosujących Claude Code implementuje zmianę i publikuje nową wersję
5. Graf narracji rozrasta się — nowe węzły, nowe ścieżki, nowe zakończenia

Każda wersja jest zachowana. Gracz może wrócić do v1 i doświadczyć oryginalnej fabuły. Albo zagrać w v5, gdzie społeczność dodała trzy boczne wątki i alternatywne zakończenie.

### Dlaczego to działa

Open Narrative jest możliwe, bo trzy rzeczy się zbiegają:
- **Narracja jest ustrukturyzowana** — graf z węzłami i krawędziami, nie wolny tekst. Claude Code może go rozszerzać, bo rozumie strukturę
- **Generowanie contentu jest natychmiastowe** — nowa ścieżka fabularna to jedno wywołanie Claude Code z kontekstem istniejącego grafu
- **Wersjonowanie jest wbudowane** — każdy evolve to nowy snapshot. Nic się nie psuje, wszystko jest odwracalne

## MCP: Od Konceptu do Grywalnej Gry

ForkArcade wykorzystuje narzędzia **Model Context Protocol (MCP)**, które dają Claude Code bezpośredni dostęp do pipeline'u tworzenia gier:

1. **`list_templates`** — dynamiczne odkrywanie dostępnych szablonów gier z GitHuba
2. **`init_game`** — klonuje szablon, kopiuje SDK i moduł narracji, tworzy repozytorium gry
3. **`create_sprite`** — generuje sprite'y pixel art w kompaktowym formacie macierzowym
4. **`validate_game`** — sprawdza, czy gra spełnia standardy platformy (ekrany, narracja, scoring)
5. **`publish_game`** — pushuje na GitHuba, włącza Pages, tworzy wersjonowany snapshot

Każdy **szablon** jest samodzielny: silnik, renderer, obsługa inputu, audio — wszystko w środku. Claude Code otrzymuje brief designu gry i dokumentację API silnika, a następnie implementuje pliki gry. Twórca opisuje czego chce. Agent buduje to w architekturze szablonu.

Rezultat: kompletna, zhostowana, grywalna gra — z narracją, scoringiem, sprite'ami i live URL — stworzona w jednej sesji.

## ForkCoin: Kupowana Waluta Governance'u

ForkCoin to wewnętrzna waluta platformy. ForkCoin **nie jest zarabiany w grach** — jest kupowany za prawdziwe pieniądze. To eliminuje każdy wektor exploitowania ekonomii: nie ma co farmić, nie ma co pompować, nie ma co hackować.

### Jak działa

- Gracz kupuje pakiet ForkCoin na platformie
- ForkCoin wydaje na **głosowanie**: evolve istniejącej gry lub propozycja nowej
- Głos = spalenie monet. ForkCoin jest **konsumowany**, nie transferowany. Każdy głos to realna decyzja ekonomiczna

### Dlaczego to działa

Gry są darmowe. Granie jest darmowe. Badges są darmowe. Narracja jest darmowa. Jedyne za co się płaci to **wpływ na kierunek rozwoju gier**. To nie pay-to-win — to pay-to-govern.

Gracz, który nie kupuje ForkCoin, nadal gra, zdobywa badges, odblokowuje narracje. Traci tylko możliwość głosowania. A gracz, który kupuje — inwestuje w ekosystem, bo głosuje na zmiany, które chce zobaczyć.

## Badges: Klucze do Narracji

Badges to odznaki przyznawane przez **platformę**, nie przez gry. Bazują wyłącznie na danych, które system może zweryfikować.

| Badge | Warunek |
|-------|---------|
| **Newcomer** | Ukończ pierwszą grę |
| **Veteran** | Rozegraj 100 gier |
| **Kingmaker** | Przegłosuj 10 evolve'ów, które zostały wdrożone |
| **Trailblazer** | Zagraj w grę w wersji v1 przed pierwszym evolve |
| **High Roller** | Spal 1000 ForkCoin na głosowania |
| **Polyglot** | Rozegraj gry z 5 różnych szablonów |

### Badges jako klucze narracyjne — dedykowane ścieżki dla najlepszych graczy

Badges to nie tylko ikony na profilu. To **klucze do ukrytego contentu narracyjnego** — dedykowanych ścieżek fabularnych, które widzą tylko gracze z odpowiednimi odznaki.

Każda gra ma swoją główną narrację, dostępną dla wszystkich. Ale silnik narracji **konsumuje badges gracza** i otwiera dodatkowe warstwy fabuły:

- Gracz z badge **„Veteran"** (100 gier) odpala nowego roguelike'a → pojawia się ukryta postać, która mówi: *„Widzę, że to nie twój pierwszy labirynt. Pozwól, że pokażę ci przejście, o którym inni nie wiedzą."* → otwiera się boczna ścieżka z własnym łukiem fabularnym
- Gracz z badge **„Kingmaker"** (10 wdrożonych evolve'ów) odpala grę strategy-RPG → doradca króla zwraca się bezpośrednio do niego: *„Ty już zmieniałeś losy światów. Ten świat też czeka na twoją decyzję."* → alternatywna linia dyplomatyczna, niedostępna dla innych
- Gracz z badge **„Polyglot"** (5 szablonów) → gra rozpoznaje jego doświadczenie z różnych gatunków → narracja łączy motywy z różnych światów w unikalne easter eggi i meta-referencje

**To jest premium content, za który gracz nie płaci pieniędzmi — płaci doświadczeniem.** Nie da się tego kupić. Nie da się tego skrócić. Jedyna droga do tych ścieżek to granie, eksplorowanie i uczestniczenie w ekosystemie.

Szablon definiuje, które badges rozpoznaje i jak je interpretuje. Claude Code generuje rozgałęzienia fabularne przy tworzeniu gry — twórca nie musi o tym myśleć. Efekt: społeczność sama się profesjonalizuje. Im więcej grasz i głosujesz, tym bogatsze doświadczenia fabularne w kolejnych grach.

## Pętla Platformy

```
Graj → zdobywaj badges → badges otwierają głębsze narracje
                                    ↓
         Kup ForkCoin → głosuj na evolve → Claude Code implementuje
                                    ↓
              nowa wersja gry → nowe ścieżki narracyjne → graj dalej
```

Granie jest darmowe i wartościowe samo w sobie. Płacenie jest opcjonalne i daje governance. Dwa niezależne obiegi — bez konfliktu, bez exploitów.

## Otwartość z Założenia: GitHub jako Fundament

ForkArcade jest radykalnie transparentne:

- **Każda gra to publiczne repozytorium GitHub** w organizacji `ForkArcade`
- **Każdy szablon to publiczne repo** odkrywalne po topiku (`forkarcade-template`)
- **Katalog gier = GitHub API** — nie ma bazy danych gier. Platforma czyta bezpośrednio z GitHuba
- **Każdy może sforkować grę**, przejrzeć kod lub stworzyć własny szablon
- **Zero vendor lock-in** — gry to vanilla JS na GitHub Pages. Działają bez platformy

## Analiza Rynku i Konkurencji

### Rynek

ForkArcade działa na przecięciu trzech rosnących rynków:

| Segment | Wartość 2025 | Prognoza | CAGR |
|---------|-------------|----------|------|
| Creator economy w gamingu | $28,6 mld | $230 mld (2034) | 23,2% |
| AI w gamingu | $4,5 mld | $81 mld (2035) | 33,6% |
| Rynek gier indie | $5–11 mld | $29 mld (2033) | 12,5–14,3% |
| Platformy UGC | $12,6 mld (2026) | $44 mld (2031) | 28,3% |

Źródła: Market.us, Mordor Intelligence, Business Research Company, SkyQuest

Kluczowe trendy:
- **90% deweloperów** gier już używa AI w swoich workflow'ach (Google Cloud, 2025)
- AI redukuje czas produkcji gier indie o **~70%**
- Roblox wypłacił twórcom **$1,5 mld** w 2025 roku — dowód, że model UGC skaluje się

### Grupa docelowa

**Segment 1: Twórcy wizjonerzy (kreatorzy gier)**
- Osoby z pomysłami na gry, ale bez umiejętności programistycznych
- Twórcy indie szukający sposobu na szybkie prototypowanie
- Nauczyciele i edukatorzy wykorzystujący gry w dydaktyce

**Segment 2: Gracze-współtwórcy**
- Gracze casual szukający gier z głębią narracyjną
- Społeczności graczy chcące wpływać na rozwój gier (mod community)
- Fani narracji interaktywnej i emergent storytelling

### Konkurencja

| Platforma | Model | Tworzenie | Ewolucja | Otwartość | Narracja |
|-----------|-------|-----------|----------|-----------|----------|
| **Roblox** | Walled garden, Lua | Użytkownik pisze kod | Brak mechanizmu | Zamknięte | Brak SDK |
| **Itch.io** | Marketplace | Użytkownik buduje sam | Brak | Otwarty upload | Brak |
| **GameMaker / RPG Maker** | Narzędzie desktopowe | Drag & drop + scripting | Brak | Eksport lokalny | Brak |
| **Mod.io** | B2B infrastruktura | Modding istniejących gier | Mody | Zależy od gry | Brak |
| **Rosebud AI** | AI generowanie | Prompt → jednorazowy prototyp | Brak wersjonowania | Zamknięte | Brak |
| **ForkArcade** | AI + społeczność | Opis wizji → AI buduje | Głosowanie → AI implementuje → wersje | Open source (GitHub) | SDK narracji wbudowany |

**Unikalna pozycja ForkArcade:** żaden konkurent nie łączy AI jako budowniczego + społecznościowej ewolucji + otwartych repozytoriów + wbudowanego SDK narracji. Rosebud AI generuje jednorazowe prototypy („generate and forget"). ForkArcade tworzy gry, które żyją i ewoluują („create and evolve").

## Model Biznesowy

Gry na ForkArcade są **darmowe** — zawsze.

| Strumień przychodów | Opis |
|---------------------|------|
| **ForkCoin** | Pakiety kupowane za prawdziwe pieniądze. Jedyny sposób na głosowanie i wpływ na rozwój gier. Monety są spalane — każdy głos to nieodwracalna decyzja ekonomiczna |

Zasada: **zero pay-to-win, zero pay-to-narrate**. Badges zdobywa się grając. Ścieżki fabularne otwierają się za doświadczenie, nie za pieniądze. ForkCoin daje wpływ na głosowanie — nie daje dostępu do narracji ani badges.

### Ekonomia ForkCoin

Model inspirowany tokenomiką burn-and-mint:
- Przychód = sprzedaż ForkCoin
- Koszt = infrastruktura (minimalna: GitHub Pages = 0 zł hosting, Turso free tier, Claude Code API)
- Marża rośnie z bazą użytkowników — koszty stałe, przychód zmienny

### Projekcje (scenariusz bazowy)

| Horyzont | Gry na platformie | Aktywni gracze | Głosujący (kupujący FC) | MRR |
|----------|-------------------|----------------|------------------------|-----|
| Dziś | 9 | pre-launch | — | — |
| +6 mies. | 25+ | 500 | 50 (10%) | walidacja modelu |
| +12 mies. | 50+ | 2 000 | 200 (10%) | early revenue |
| +24 mies. | 100+ | 10 000 | 1 000 (10%) | skalowanie |

Konwersja 10% (gracze → głosujący) jest konserwatywna — Roblox osiąga ~5% konwersji na zakupy, ale ForkArcade oferuje bezpośredni wpływ na produkt, co zwiększa motywację.

## Strategia Go Global

### Dlaczego ForkArcade jest globalne z natury

- **Język produktu:** angielski (kod, SDK, dokumentacja, interfejs)
- **Hosting:** GitHub Pages — globalny CDN, zero kosztów skalowania
- **Brak barier wejścia:** przeglądarka + GitHub account = dostęp
- **Open source:** społeczność może powstawać w dowolnym kraju

### Rynki docelowe

| Priorytet | Rynek | Dlaczego | Kanał |
|-----------|-------|----------|-------|
| 1 | **USA / UK** | Największy rynek indie gamedev, silne community GitHub | Product Hunt, Reddit r/indiegaming, Hacker News, GitHub trending |
| 2 | **DACH (DE/AT/CH)** | Silny rynek gamingowy w Europie, bliskość kulturowa, Digital Dragons network | Gamescom, gamedev meetupy, media branżowe |
| 3 | **Azja (Japonia, Korea)** | Ogromny rynek gier, kultura UGC (RPG Maker, pixel art) | Lokalni influencerzy, konferencje gamedev |

### Roadmap ekspansji

1. **Q1-Q2 2026** — Soft launch: Product Hunt, Reddit, Hacker News. Budowanie społeczności early adopters. Walidacja modelu ForkCoin z pierwszymi płacącymi użytkownikami
2. **Q3-Q4 2026** — Community growth: program ambasadorów, integracja z Discord, marketing treściowy (devlogi, case studies tworzenia gier z AI). Pierwsze konferencje (Gamescom, Digital Dragons)
3. **2027** — Scale: partnerstwa z platformami edukacyjnymi (game design courses), API dla zewnętrznych szablonów, ekspansja na rynki azjatyckie

## Ryzyka i Mitygacja

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| **Zależność od Claude Code API** | Średnie | Wysoki | Architektura MCP jest agnostyczna — zmiana modelu = zmiana konfiguracji, nie kodu. Szablony i gry działają bez AI po publikacji |
| **Niska konwersja ForkCoin** | Średnie | Średni | Model pay-to-govern jest nowy — wymaga edukacji. Fallback: sponsorowane evolve'y (marki proponują zmiany) |
| **Konkurencja ze strony Roblox/Epic** | Niskie | Średni | Inne pozycjonowanie — ForkArcade to open-source + AI, nie walled garden. Otwartość jest fosą, nie słabością |
| **Jakość gier generowanych przez AI** | Średnie | Wysoki | Szablony z przetestowanymi silnikami gwarantują minimalną jakość. Walidacja przed publikacją. Ewolucja naprawia błędy |
| **Skalowanie społeczności** | Wysokie | Wysoki | Pętla wiralności: gracz → evolve → nowa wersja → content do shareowania. Partnerstwa z edukacją i konferencjami |

## Zespół

**Grzegorz Durtan** (technologia) i **Maciej Tryba** (produkt) — dwuosobowy zespół założycielski prowadzący wspólnie firmy technologiczne od ponad 10 lat. Komplementarny podział: Grzegorz odpowiada za architekturę, fullstack development i infrastrukturę; Maciej za wizję produktu, design, UX i strategię biznesową.

Wspólnie zbudowali i prowadzą trzy działające produkty:

| Produkt | Opis | Związek z ForkArcade |
|---------|------|----------------------|
| **Gamestack** ([gamestack.net](https://gamestack.net)) | Platforma technologiczna w branży gamedev | Bezpośrednie doświadczenie w gamedev toolingu |
| **ChooseWise** ([choosewise.app](https://choosewise.app)) | Interactive Film Builder — narzędzie do tworzenia filmów interaktywnych z rozgałęzioną narracją | Doświadczenie w interaktywnej narracji — fundament Open Narrative |
| **Obiado** ([obiado.pl](https://obiado.pl)) | System zamawiania posiłków dla szkół i firm cateringowych — zamówienia, płatności, raportowanie | Doświadczenie w budowaniu platform SaaS z płatnościami |

Trzy działające produkty — od gamedev toolingu, przez interaktywną narrację, po platformę SaaS — to dokładnie zestaw kompetencji potrzebny do budowy ForkArcade. Dekada wspólnej pracy eliminuje ryzyko rozpadu zespołu.

## Oczekiwania wobec Programu Akceleracyjnego

### Co chcemy osiągnąć

ForkArcade ma działający prototyp (TRL 7), ale do pełnego MVP brakuje:
- **Monetyzacja** — integracja płatności ForkCoin (Stripe/PayU), walidacja modelu pay-to-govern z pierwszymi użytkownikami
- **Onboarding twórców** — uproszczony flow tworzenia gry dla osób nietechnicznych
- **System badges** — implementacja odznак i ich integracja z narracją
- **Community tools** — Discord bot, powiadomienia o evolve'ach, social sharing

Grant pozwoli sfinansować dokończenie MVP i pierwsze działania Go Global (soft launch, konferencje, materiały marketingowe).

### Czego szukamy w akceleratorze

1. **Mentoring biznesowy** — walidacja modelu ForkCoin, pricing, strategia monetyzacji w gamingu
2. **Kontakty z publisherami i inwestorami** — ForkArcade to platforma, nie pojedyncza gra — potrzebujemy partnerów rozumiejących ekosystemy, nie tylko tytuły
3. **Strategia Go Global** — doświadczenie w wejściu na rynki USA/DACH z produktem gamedev
4. **Feedback od ekspertów branżowych** — gamedev to specyficzny rynek, potrzebujemy perspektywy od ludzi, którzy go znają od środka

### Gotowość

- Obaj założyciele dostępni na pełen etat przez czas trwania programu
- Produkt jest w fazie aktywnego developmentu — cotygodniowe release'y
- Otwartość na pivot jeśli dane rynkowe wskażą inny kierunek

## Dlaczego to ma Znaczenie

Tworzenie gier jest drogie, wolne i zamknięte. Gracze konsumują, ale nie kształtują. Fabuły są statyczne — studio pisze, gracz klika „dalej".

ForkArcade to odwraca:

- **Koszt tworzenia zbliża się do zera** — Claude Code buduje z szablonów w minuty
- **Gry nigdy nie przestają się rozwijać** — społeczność decyduje, co dalej
- **Narracja jest otwarta** — gracze głosują, agent implementuje, fabuła rośnie organicznie
- **Badges otwierają historie** — im więcej grasz, tym głębsze doświadczenia fabularne
- **Wszystko jest otwarte** — kod, fabuła, proces, historia, decyzje

ForkArcade to **ekosystem gier z otwartą narracją** — gdzie Claude Code jest budowniczym, gracze są reżyserami i scenarzystami, a GitHub jest infrastrukturą.
