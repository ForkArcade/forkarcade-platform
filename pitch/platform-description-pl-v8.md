# ForkArcade — Platforma Gier z Open Narrative i Ewolucją Społecznościową

## Czym jest ForkArcade?

ForkArcade to otwarta platforma, na której gry powstają z szablonów, a gracze rozwijają je przez głosowanie. Każda gra działa na GitHub Pages, jest budowana przez Claude Code (agenta programistycznego od Anthropic) i żyje jako publiczne repozytorium — w pełni transparentne, forkowalne i zarządzane przez społeczność.

Twórca nie pisze kodu. Twórca wnosi wizję — koncept gry, mechaniki, łuk narracyjny. Claude Code zajmuje się resztą: od szkieletu do grywalnej gry w minuty, nie miesiące.

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

## Model Biznesowy

Gry na ForkArcade są **darmowe** — zawsze.

| Strumień | Opis |
|----------|------|
| **ForkCoin** | Pakiety kupowane za prawdziwe pieniądze. Jedyny sposób na zdobycie ForkCoin |

Zasada: **zero pay-to-win, zero pay-to-narrate**. Badges zdobywa się grając. Ścieżki fabularne otwierają się za doświadczenie, nie za pieniądze. ForkCoin daje wpływ na głosowanie — nie daje dostępu do narracji ani badges.

## Dlaczego to ma Znaczenie

Tworzenie gier jest drogie, wolne i zamknięte. Gracze konsumują, ale nie kształtują. Fabuły są statyczne — studio pisze, gracz klika „dalej".

ForkArcade to odwraca:

- **Koszt tworzenia zbliża się do zera** — Claude Code buduje z szablonów w minuty
- **Gry nigdy nie przestają się rozwijać** — społeczność decyduje, co dalej
- **Narracja jest otwarta** — gracze głosują, agent implementuje, fabuła rośnie organicznie
- **Badges otwierają historie** — im więcej grasz, tym głębsze doświadczenia fabularne
- **Wszystko jest otwarte** — kod, fabuła, proces, historia, decyzje

ForkArcade to **ekosystem gier z otwartą narracją** — gdzie Claude Code jest budowniczym, gracze są reżyserami i scenarzystami, a GitHub jest infrastrukturą.
