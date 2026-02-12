# ForkArcade — Zasady platformy

Te zasady obowiazuja KAZDA gre na platformie ForkArcade, niezaleznie od szablonu.

## 3 ekrany (obowiazkowe)

Kazda gra MUSI miec minimum 3 ekrany (stan `screen` w state):

1. **Ekran startowy** (`screen: 'start'`) — tytul gry, krotki opis, sterowanie, prompt do rozpoczecia (np. `[SPACJA]`)
2. **Ekran gry** (`screen: 'playing'`) — wlasciwa rozgrywka
3. **Ekran koncowy** (`screen: 'victory'` / `screen: 'defeat'` / `screen: 'death'`) — tekst narracyjny, statystyki, wynik, prompt do restartu (np. `[R]`)

## Narracja (obowiazkowa)

Narracja to misja platformy — dev skupia sie na grze, narracja jest za darmo. Ale gracz MUSI ja widziec w grze.

- Zarejestruj teksty narracyjne: `FA.register('narrativeText', nodeId, { text, color })`
- Wyswietlaj je w grze (np. pasek u gory ekranu z fade out)
- Wywoluj `showNarrative(nodeId)` przy kluczowych momentach
- Ekran koncowy pokazuje odpowiedni tekst narracyjny

Wzorzec `showNarrative`:
```js
function showNarrative(nodeId) {
  var textDef = FA.lookup('narrativeText', nodeId);
  if (textDef) {
    // life w milisekundach! dt w engine jest w ms (~16.67ms per tick)
    FA.setState('narrativeMessage', { text: textDef.text, color: textDef.color, life: 4000 });
  }
  FA.narrative.transition(nodeId);
}
```
W game loop odliczaj: `if (state.narrativeMessage && state.narrativeMessage.life > 0) state.narrativeMessage.life -= dt;`
W renderze wyswietlaj pasek z `alpha = Math.min(1, state.narrativeMessage.life / 1000)` dla plynnego fade out.

## Timing

**dt jest w milisekundach** (~16.67ms per tick). Timery musza uzywac ms:
- `life: 4000` = 4 sekundy
- `life: 2000` = 2 sekundy
- NIE `life: 3` (to 3ms = niewidoczne)

## SDK

- `ForkArcade.onReady(callback)` — wywolaj na starcie
- `ForkArcade.submitScore(score)` — wywolaj na koncu gry
- `ForkArcade.updateNarrative(data)` — raportuj stan narracji do platformy

## Sprite fallback

`FA.draw.sprite(category, name, x, y, size, fallbackChar, fallbackColor)` — jesli brak sprite'a, rysuje tekst. Gra MUSI dzialac bez sprite'ow.

## Pliki platformy (nie edytuj)

- `forkarcade-sdk.js` — SDK (scoring, auth)
- `fa-narrative.js` — modul narracji (graf, zmienne, transition)
- `sprites.js` — generowany z `_sprites.json`
