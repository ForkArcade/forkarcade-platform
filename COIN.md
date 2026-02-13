# ForkCoin — Waluta Platformy ForkArcade

## Koncept

ForkCoin to wewnętrzna waluta platformy, która łączy natywne systemy scoringu i narracji w jedną cross-game ekonomię. Gracze "kopią" coiny grając w gry i odkrywając narracje. Coiny wydają na wpływanie na ewolucję gier.

## Źródła coinów

### Score Mining

Każda gra generuje coiny proporcjonalnie do zdobytych punktów.

- Gracz zdobywa score → serwer przelicza na coiny wg kursu gry
- **Kurs zależy od popularności**: mniej graczy = lepszy kurs → zachęta do odkrywania niszowych gier
- **Diminishing returns**: pierwsze score'y w grze dają więcej coinów, potem maleje → zachęta do grania w różne gry zamiast grindowania jednej
- **Nowy rekord personalny = bonus** → nagroda za progres, nie za powtarzanie

### Narrative Milestones

Narracja przestaje być "za darmo" — ma realną wartość.

- Twórca gry definiuje milestones w grafie narracji (dotarcie do node'a, odblokowanie brancha, zmiana zmiennej)
- Osiągnięcie milestone'a = jednorazowy bonus coinów
- Eventy narracyjne (`FA_NARRATIVE_UPDATE`) już lecą do platformy — wystarczy je ewaluować server-side

### Odkrywanie

- Pierwsza sesja w nowej grze = bonus "Explorer"
- Zagranie we wszystkie gry danego szablonu = bonus "Completionist"
- Zagranie w nowo opublikowaną grę (< 48h) = bonus "Early Adopter"

## Na co wydać coiny

### Evolve Voting (killer feature)

- Każda gra ma issues na GitHub → propozycje zmian
- Gracze głosują coinami na issue który chcą → AI (Claude Code) implementuje najwyżej ogłosowany
- To zamyka pętlę: **grasz → zarabiasz → głosujesz → gra ewoluuje → grasz dalej**
- Koszt głosu: np. 10 coinów per vote, bez limitu

### Boost

- Gracz płaci coiny żeby wywindować grę w katalogu (na stronie głównej)
- Boost trwa X godzin, widoczny jako badge na karcie
- Twórca gry może boostować własną grę

### Profil

- Tytuły i rangi (na podstawie coinów zarobionych lifetime)
- Pozycja w globalnym rankingu graczy (nie per gra — cross-platform)

## Monetyzacja

### Free-to-play

- Coiny zdobywa się wyłącznie przez granie i narracje
- Zero pay-to-win: coiny nie dają przewagi w grach
- Model jest fair — grind jest realny i przyjemny (bo grasz w gry)

### Premium (opcjonalnie, na później)

- Kupno coinów za real money (shortcut, nie jedyna droga)
- Premium szablony/gry odblokowane za coiny (zarobione LUB kupione)
- Subskrypcja: X coinów miesięcznie + priorytet w evolve queue

## Architektura techniczna

### Baza danych

Jedna nowa tabela:

```sql
CREATE TABLE wallets (
  user_id INTEGER REFERENCES users(id),
  balance INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  PRIMARY KEY (user_id)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  amount INTEGER NOT NULL,          -- + earn, - spend
  type TEXT NOT NULL,                -- 'score_mine', 'narrative', 'explorer', 'evolve_vote', 'boost'
  game_slug TEXT,
  metadata TEXT,                     -- JSON: {score, milestone, issue_number, ...}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Nowe endpointy serwera

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/wallet` | GET | Saldo i lifetime gracza |
| `/api/wallet/transactions` | GET | Historia transakcji |
| `/api/games/:slug/vote` | POST | Głosuj coinami na issue |
| `/api/games/:slug/boost` | POST | Boost gry w katalogu |

Mint (zarabianie) dzieje się server-side — przy `POST /api/games/:slug/score` serwer automatycznie liczy coiny i dodaje do walleta. Klient nie decyduje ile coinów dostaje.

### PostMessage protocol (rozszerzenie SDK)

| Type | Kierunek | Opis |
|------|----------|------|
| `FA_COIN_EARNED` | platforma → gra | Informacja ile coinów gracz właśnie zarobił (fire-and-forget, opcjonalne — gra może pokazać notyfikację) |

Gra NIE mintuje coinów — to robi serwer. Gra tylko wysyła score i narrative events jak dotychczas. Zero zmian w SDK poza opcjonalnym odbiorem `FA_COIN_EARNED`.

### Kurs score → coin

```
coins = floor(score * base_rate * popularity_multiplier * diminishing_factor)

base_rate          = 0.1 (konfigurowalny per szablon)
popularity_mult    = 1 / log2(active_players + 2)   — mniej graczy = więcej coinów
diminishing_factor = 1 / (1 + user_plays_count / 10) — maleje z każdą sesją
```

## Pętla wartości

```
Gracz gra → zdobywa score/narrację
    ↓
Serwer mintuje coiny
    ↓
Gracz głosuje coinami na evolve issue
    ↓
AI implementuje najwyżej głosowany issue
    ↓
Gra ewoluuje → nowa wersja
    ↓
Gracz wraca grać w nową wersję
    ↓
(powtórz)
```

To jest flywheel: im więcej graczy, tym więcej głosów, tym szybciej gry ewoluują, tym więcej graczy wraca.

## Fazy wdrożenia

### Faza 1: Wallet + Score Mining
- Tabela `wallets` + `transactions`
- Mint przy score submit
- Wyświetlanie salda w UI (toolbar)
- Strona profilu z historią

### Faza 2: Evolve Voting
- Głosowanie coinami na issues
- Integracja z GitHub Actions (evolve workflow czyta głosy)
- UI: lista issues z liczbą głosów na GamePage

### Faza 3: Narrative Milestones + Discovery
- Ewaluacja narrative events server-side
- Bonusy za odkrywanie gier
- Achievement system

### Faza 4: Boost + Monetyzacja
- Boost gier w katalogu
- Opcjonalny zakup coinów
- Globalne rankingi graczy
