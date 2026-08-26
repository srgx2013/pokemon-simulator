# Validación del reconocimiento por imagen — Camino A

> Documento de trabajo para validar el flujo completo:
> **screenshot de TCG Live → IA → JSON → tablero**.

## Contexto

- El proyecto **exporta** estado en markdown (`src/services/stateExporter.ts`) para que una IA lo analice.
- Para **importar** (armar el tablero desde una screenshot) se usa **JSON estructurado**, no markdown, porque los LLMs generan JSON válido con más fiabilidad y `JSON.parse` es determinista.
- El importador ya está implementado: `src/services/stateImporter.ts` — función `importStateFromJson(text)`.
- El markdown de exportación se sigue usando para *analizar*; el JSON es para *importar*.

## Formato JSON canónico

```json
{
  "turn": 3,
  "currentPlayer": "player1",
  "player1": {
    "active": {
      "name": "Charizard ex",
      "hp": 330,
      "currentHp": 210,
      "attachedEnergy": ["fire", "fire"],
      "status": "none"
    },
    "bench": [{ "name": "Pidgey", "hp": 60 }],
    "hand": [
      { "name": "Professor's Research", "kind": "trainer" },
      { "name": "Fire Energy", "kind": "energy", "type": "fire" }
    ],
    "prizes": 4,
    "discard": ["Rare Candy"],
    "deck": [{ "name": "Pidgey", "kind": "pokemon", "hp": 60, "stage": "basic" }]
  },
  "player2": {
    "active": { "name": "Greninja ex", "hp": 300 }
  }
}
```

Reglas del formato:

- `active` / `bench`: objetos con `name` + opcionales (`hp`, `currentHp`, `stage`, `type`, `status`, `attachedEnergy`, `retreatCost`). `bench` máximo 5.
- Zonas `hand` / `discard` / `deck`: arrays de `{ "name": "...", "kind": "pokemon|trainer|energy" }` o strings simples.
- `prizes`: número (cantidad, cartas desconocidas) **o** lista de nombres.
- `attachedEnergy` en inglés: `fire, water, grass, electric, psychic, fighting, darkness, metal, dragon, fairy, normal`.
- `status`: `none, poisoned, paralyzed, asleep, confused`.
- Cartas boca abajo (mano del rival, premios): usar la **cantidad** como número.

## Prompt para la IA (listo para copiar)

```
Sos un extractor de estado de Pokémon TCG. Te paso una captura de
Pokémon TCG Live. Devolvé SOLO JSON válido (sin comentarios ni texto
alrededor), en exactamente este formato:

{
  "turn": 3,
  "currentPlayer": "player1",
  "player1": {
    "active": { "name": "Charizard ex", "hp": 330, "currentHp": 210,
                "attachedEnergy": ["fire", "fire"], "status": "none" },
    "bench": [{ "name": "Pidgey", "hp": 60 }],
    "hand": [{ "name": "Professor's Research", "kind": "trainer" }],
    "prizes": 4,
    "discard": ["Rare Candy"],
    "deck": [{ "name": "Pidgey", "kind": "pokemon", "hp": 60 }]
  },
  "player2": { "active": { "name": "Greninja ex", "hp": 300 } }
}

Reglas:
- attachedEnergy en inglés: fire, water, grass, electric, psychic,
  fighting, darkness, metal, dragon, fairy, normal.
- status: none, poisoned, paralyzed, asleep, confused.
- Cartas boca abajo (mano rival, premios): poné la CANTIDAD como número.
- Si no leés algo, no lo inventes.
```

## Protocolo de validación (loop end-to-end)

1. **Tomar una screenshot** de TCG Live en un estado conocido (sabés qué cartas, HP y energías hay).
2. **Pasársela a la IA** con el prompt de arriba.
3. **Pegar el JSON** en la app y mirar si el tablero queda bien.
4. **Comparar contra la verdad** y anotar los errores en el scorecard.
5. **Iterar el prompt** según el patrón de errores.

Repetir con 3-5 screenshots distintas.

## Scorecard

La "verdad" es lo que sabés de la partida en la screenshot.

### Ejemplo completado

| Zona | Esperado | Detectó la IA | ¿OK? |
|---|---|---|---|
| Active | Charizard ex | Charizard ex | ✅ |
| Active HP | 210/330 | 210/330 | ✅ |
| Energía active | fire, fire | fire | ❌ |
| Bench #1 | Pidgey | Pidgey | ✅ |
| Premios | 4 | 4 | ✅ |
| Deck restante | 38 | 37 | ❌ |

### Plantilla vacía

| Zona | Esperado | Detectó la IA | ¿OK? |
|---|---|---|---|
| Active | | | |
| Active HP | | | |
| Energía active | | | |
| Bench #1 | | | |
| Bench #2 | | | |
| Premios | | | |
| Mano | | | |
| Deck restante | | | |
| Descarte | | | |

## Métricas

Con 3-5 screenshots sacar dos métricas:

- **% de cartas identificadas** correctamente.
- **% de atributos** (HP, energía, estado) correctos — acá suele estar el fallo.

## Notas / próximos pasos

- Limitación conocida del importador: `inferKind` solo detecta energías por nombre; el resto cae en `trainer`. La resolución correcta de nombres → carta completa (ataques, imagen, tipo real) contra la Pokémon TCG API / deck preset es una capa posterior.
- Camino B (integrar todo en un Cloudflare Worker) es un upgrade natural: primero validar con A, después integrar.
