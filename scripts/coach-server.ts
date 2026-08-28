/**
 * Coach Server — mini servidor HTTP local para conectar la app del simulador
 * con el coach (agente de IA que analiza escenarios de Pokémon TCG).
 *
 * Flujo:
 *   1. La app hace POST /analyze con el markdown exportado.
 *   2. El server lo guarda en scripts/coach-inbox/<id>.md.
 *   3. El coach (agente) procesa el inbox y escribe el resultado en
 *      scripts/coach-outbox/<id>.md.
 *   4. La app hace GET /result/<id> y obtiene la respuesta.
 *
 * Arranque:
 *   bun run coach
 *   # o: COACH_PORT=9000 COACH_HOST=0.0.0.0 bun run coach
 *
 * Seguridad: por defecto escucha en localhost. Para acceso remoto vía
 * Tailscale, seteá COACH_HOST=0.0.0.0 (nunca expongas este puerto a internet
 * sin el túnel privado).
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const PORT = Number(process.env.COACH_PORT ?? 9000);
const HOST = process.env.COACH_HOST ?? 'localhost';
const INBOX = join(import.meta.dir, 'coach-inbox');
const OUTBOX = join(import.meta.dir, 'coach-outbox');

mkdirSync(INBOX, { recursive: true });
mkdirSync(OUTBOX, { recursive: true });

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function safeId(raw: string): string | null {
  return /^[a-zA-Z0-9-]+$/.test(raw) ? raw : null;
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // ── Health check ────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        inbox: readdirSync(INBOX).filter((f) => f.endsWith('.md')).length,
        outbox: readdirSync(OUTBOX).filter((f) => f.endsWith('.md')).length,
      });
    }

    // ── POST /analyze — recibir markdown ─────────────────────────────
    if (req.method === 'POST' && url.pathname === '/analyze') {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.markdown !== 'string' || body.markdown.trim() === '') {
        return json({ error: 'Se requiere { markdown: string } no vacío' }, 400);
      }
      const id = randomUUID();
      writeFileSync(join(INBOX, `${id}.md`), body.markdown);
      return json({ id, status: 'pending' });
    }

    // ── GET /result/:id — consultar resultado ───────────────────────
    if (req.method === 'GET' && url.pathname.startsWith('/result/')) {
      const id = safeId(url.pathname.split('/').pop() ?? '');
      if (!id) return json({ error: 'id inválido' }, 400);

      const resultPath = join(OUTBOX, `${id}.md`);
      if (existsSync(resultPath)) {
        return json({ status: 'done', result: readFileSync(resultPath, 'utf-8') });
      }
      if (existsSync(join(INBOX, `${id}.md`))) {
        return json({ status: 'pending' });
      }
      return json({ error: 'No encontrado' }, 404);
    }

    // ── GET /inbox — listar pendientes (para el coach) ──────────────
    if (req.method === 'GET' && url.pathname === '/inbox') {
      const items = readdirSync(INBOX)
        .filter((f) => f.endsWith('.md'))
        .map((f) => ({
          id: f.replace(/\.md$/, ''),
          preview: readFileSync(join(INBOX, f), 'utf-8').slice(0, 200),
        }));
      return json(items);
    }

    return json({ error: 'Not found' }, 404);
  },
});

console.log(`🃏 Coach server en http://${HOST}:${PORT}`);
console.log(`   POST /analyze     → recibir markdown (inbox)`);
console.log(`   GET  /result/:id  → consultar resultado (outbox)`);
console.log(`   GET  /inbox       → listar pendientes`);
console.log(`   GET  /health      → estado`);
