# Prompt definitivo — Log de TCG Live → JSON

> Prompt para convertir el **LOG** de una partida de Pokémon TCG Live en el JSON
> que la app importa. Este es el que funcionó (lados y cartas correctos).

## Flujo de uso

1. Cargá los **dos mazos** en la app:
   - P1 = tu mazo (draga saul).
   - P2 = el mazo del rival (chandelure).
2. Copiá el **log** de la partida desde TCG Live.
3. Pegá **este prompt + el log** en tu IA (ChatGPT, Claude, Gemini).
4. La IA te devuelve el **JSON**.
5. En la app: **📥 Importar** → pegá el JSON → **Cargar escenario**.

## Prompt (copiar desde acá)

```
Sos un extractor de estado de Pokémon TCG. Te paso el LOG de una partida de
Pokémon TCG Live (está en español) y las listas de ambos mazos. Reconstruí el
estado FINAL de la partida y devolvé SOLO JSON válido en exactamente este
formato (solo nombres y números; la app resuelve el resto):

{
  "turn": 3,
  "currentPlayer": "player1",
  "player1": {
    "active": { "name": "Dragapult ex", "hp": 320, "currentHp": 210,
                "attachedEnergy": ["fire", "psychic"], "status": "none" },
    "bench": [{ "name": "Drakloak", "hp": 90 }],
    "hand": [{ "name": "Lillie's Determination", "kind": "trainer" }],
    "prizes": 4,
    "discard": ["Fire Energy"],
    "deck": 20
  },
  "player2": { "active": { "name": "Comfey", "hp": 70 } }
}

MI MAZO (srgx2013 — nombres en inglés, con HP):
- Pokémon: Dreepy (70), Drakloak (90), Dragapult ex (320), Munkidori (110),
  Dunsparce (70), Dudunsparce (140), Budew (30), Fezandipiti ex (210),
  Meowth ex (170)
- Entrenadores: Lillie's Determination, Boss's Orders, Crispin,
  Rosa's Encouragement, Buddy-Buddy Poffin, Poké Pad, Ultra Ball,
  Crushing Hammer, Night Stretcher, Special Red Card, Unfair Stamp,
  Risky Ruins
- Energías: Psychic, Fire, Darkness

MAZO DEL RIVAL (Powerflame69 — nombres en inglés, con HP):
- Pokémon: Litwick (50), Lampent (80), Chandelure (130), Comfey (70),
  Maractus (80)
- Entrenadores: Rare Candy, Xerosic's Machinations, Sacred Ash,
  Boss's Orders, Ultra Ball, Lillie's Determination, Air Balloon,
  Poké Pad, Buddy-Buddy Poffin
- Energías: Telepathic Psychic Energy, Fire, Psychic

Reglas:
- Yo soy srgx2013 → player1. El rival (Powerflame69) → player2.
  IMPORTANTE: srgx2013 SIEMPRE es player1. No lo inviertas.
- El log está en español; mapeá los nombres al inglés usando las listas de
  arriba (ej: "Órdenes de Jefes" = "Boss's Orders",
  "Maquinaciones de Xero" = "Xerosic's Machinations",
  "Camilla Nocturna" = "Night Stretcher", "Caramelo Raro" = "Rare Candy").
- Reconstruí el estado FINAL (cuando terminó la partida): Pokémon activos y
  en banca, HP actual (restá el daño del log), energías adjuntas, premios
  restantes, mano y deck de cada jugador.
- attachedEnergy en inglés: fire, water, grass, electric, psychic,
  fighting, darkness, metal, dragon, fairy, normal.
- status: none, poisoned, paralyzed, asleep, confused.
- Cartas boca abajo (mano rival, premios) y mazo restante: usá la CANTIDAD
  como número.
```

## Para recrear un punto específico (no el final)

Cambiá la regla `Reconstruí el estado FINAL...` por:

```
- Reconstruí el estado en el MOMENTO que te indique al final de este prompt.
  Si no te indico nada, usá el estado final.
```

Y al final del prompt (después de todas las reglas) agregá UNA de estas frases:

- `Reconstruí el estado al inicio del turno 5 de srgx2013.`
- `Reconstruí el estado justo antes de que Dragapult ex use Picado Fantasma.`
- `Reconstruí el estado justo después de que Powerflame69 juegue Órdenes de Jefes.`

## Notas

- **Nombres correctos**: la carta es `Xerosic's Machinations` (con "sic"), no
  `Xero's Machinations`. En la lista de mazo del rival usá el nombre correcto.
- **Chandelure**: el del rival es `Chandelure TWM 38` (130 HP, *Alluring Light*
  + *Mind Ruler*). Para que la API resuelva el set correcto, en la lista de
  mazo poné `Chandelure TWM 38` en vez de solo `Chandelure`.
- Los HP del prompt son una guía para desambiguar; la app los resuelve contra
  los mazos cargados.
