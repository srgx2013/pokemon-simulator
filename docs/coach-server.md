# Coach Server — conectar la app con el coach

Servidor HTTP local que conecta la app del simulador de escenarios con el
**coach** (agente de IA que analiza estados de Pokémon TCG usando el skill
`pokemon-tcg-coach`).

## Qué hace

La app exporta el markdown del escenario → lo manda al server → el server lo
guarda en un **inbox** → el coach lo analiza y escribe el **outbox** → la app
consulta el resultado.

```
App ──POST /analyze──► inbox/  ──(coach analiza)──► outbox/  ──GET /result──► App
```

## Arranque

```bash
bun run coach
# o personalizado:
# COACH_PORT=9000 COACH_HOST=0.0.0.0 bun run coach
```

- `COACH_HOST=localhost` (default) → solo tu máquina.
- `COACH_HOST=0.0.0.0` → accesible por la red (usá **Tailscale**, nunca expongas el puerto a internet).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/analyze` | Recibe `{ "markdown": "..." }`, guarda en inbox, devuelve `{ id, status: "pending" }` |
| `GET` | `/result/:id` | Devuelve `{ status: "done", result: "..." }` o `{ status: "pending" }` |
| `GET` | `/inbox` | Lista los pendientes (para que el coach vea qué analizar) |
| `GET` | `/health` | Estado (cantidad de pendientes y resultados) |

## Flujo completo

1. La app exporta el markdown y hace `POST /analyze`.
2. El server guarda `scripts/coach-inbox/<id>.md`.
3. El coach lee el inbox, analiza con `pokemon-tcg-coach`, y escribe
   `scripts/coach-outbox/<id>.md`.
4. La app hace `GET /result/<id>` y muestra la respuesta.

## Probar con curl

```bash
# 1. Enviar un escenario
curl -X POST http://localhost:9000/analyze \
  -H 'Content-Type: application/json' \
  -d '{"markdown": "## Resumen\n..."}'
# → {"id":"...","status":"pending"}

# 2. Ver pendientes (el coach los lee de acá)
curl http://localhost:9000/inbox

# 3. Consultar resultado (cuando el coach ya escribió el outbox)
curl http://localhost:9000/result/<id>
```

## Escribir el resultado (el coach)

El coach escribe el resultado a mano (o un hook de Herdr lo dispara):

```bash
echo "## Análisis\n..." > scripts/coach-outbox/<id>.md
```

## Próximos pasos

- Botón "📤 Analizar con el coach" en la app (hace el POST automáticamente).
- Hook de Herdr para que el coach se entere cuando llega un escenario.
- Acceso desde el teléfono vía Tailscale.
