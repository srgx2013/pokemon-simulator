#!/usr/bin/env node
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
 *   node scripts/coach-server.ts
 *   # o: npm run coach
 *   # o: COACH_PORT=9000 COACH_HOST=0.0.0.0 npm run coach:remote
 *
 * Seguridad: por defecto escucha en localhost. Para acceso remoto vía
 * Tailscale, seteá COACH_HOST=0.0.0.0 (nunca expongas este puerto a internet
 * sin el túnel privado).
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { spawn, spawnSync } from 'child_process';
import { createServer } from 'http';
import type { IncomingMessage } from 'http';

const PORT = Number(process.env.COACH_PORT ?? 9000);
const HOST = process.env.COACH_HOST ?? 'localhost';
const INBOX = join(import.meta.dirname, 'coach-inbox');
const OUTBOX = join(import.meta.dirname, 'coach-outbox');

mkdirSync(INBOX, { recursive: true });
mkdirSync(OUTBOX, { recursive: true });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res: import('http').ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function safeId(raw: string): string | null {
  return /^[a-zA-Z0-9-]+$/.test(raw) ? raw : null;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

// Hook de Herdr: muestra un toast (y suena) para avisar que llegó un escenario.
// El usuario ve el aviso y le pide al coach que lo analice. Si Herdr no está
// corriendo, se ignora silenciosamente.
function notifyHerdr(title: string, body: string): void {
  try {
    const proc = spawn(
      'herdr',
      ['notification', 'show', title, '--body', body, '--sound', 'request'],
      { stdio: 'ignore' },
    );
    proc.unref();
  } catch {
    // herdr no disponible — no crítico
  }
}

// Descubre el pane del coach (agente pi) para enviarle mensajes. Prioriza
// COACH_PANE_ID y si no está, consulta `herdr agent list`.
function discoverCoachPane(): string | null {
  const env = process.env.COACH_PANE_ID;
  if (env) return env;
  try {
    const proc = spawnSync('herdr', ['agent', 'list'], { encoding: 'utf-8' });
    const output = proc.stdout ?? '';
    const parsed = JSON.parse(output);
    const agents: { agent?: string; pane_id?: string }[] = parsed?.result?.agents ?? [];
    const coach = agents.find((a) => a.agent === 'pi') ?? agents[0];
    return coach?.pane_id ?? null;
  } catch {
    return null;
  }
}

// Escribe texto literal en el prompt del coach (sin Enter) para que el usuario
// solo confirme. Si no hay pane, no hace nada.
function sendToCoach(message: string): void {
  const paneId = discoverCoachPane();
  if (!paneId) return;
  try {
    const proc = spawn('herdr', ['agent', 'send', paneId, message], { stdio: 'ignore' });
    proc.unref();
  } catch {
    // ignorar
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);

  // ── CORS preflight ──────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // ── Health check ────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      inbox: readdirSync(INBOX).filter((f) => f.endsWith('.md')).length,
      outbox: readdirSync(OUTBOX).filter((f) => f.endsWith('.md')).length,
    });
    return;
  }

  // ── POST /analyze — recibir markdown ─────────────────────────────
  if (req.method === 'POST' && url.pathname === '/analyze') {
    const raw = await readBody(req).catch(() => '');
    let body: unknown = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    if (!body || typeof (body as { markdown?: unknown }).markdown !== 'string' || (body as { markdown: string }).markdown.trim() === '') {
      sendJson(res, 400, { error: 'Se requiere { markdown: string } no vacío' });
      return;
    }
    const id = randomUUID();
    writeFileSync(join(INBOX, `${id}.md`), (body as { markdown: string }).markdown);
    notifyHerdr('🃏 Escenario recibido', `La app envió un escenario para analizar (ID ${id.slice(0, 8)}…)`);
    sendToCoach(
      `🃏 Nuevo escenario en el inbox: scripts/coach-inbox/${id}.md — analizalo con el skill pokemon-tcg-coach y escribí el análisis en scripts/coach-outbox/${id}.md.`,
    );
    sendJson(res, 200, { id, status: 'pending' });
    return;
  }

  // ── GET /result/:id — consultar resultado ───────────────────────
  if (req.method === 'GET' && url.pathname.startsWith('/result/')) {
    const id = safeId(url.pathname.split('/').pop() ?? '');
    if (!id) {
      sendJson(res, 400, { error: 'id inválido' });
      return;
    }

    const resultPath = join(OUTBOX, `${id}.md`);
    if (existsSync(resultPath)) {
      sendJson(res, 200, { status: 'done', result: readFileSync(resultPath, 'utf-8') });
      return;
    }
    if (existsSync(join(INBOX, `${id}.md`))) {
      sendJson(res, 200, { status: 'pending' });
      return;
    }
    sendJson(res, 404, { error: 'No encontrado' });
    return;
  }

  // ── GET /inbox — listar pendientes (para el coach) ──────────────
  if (req.method === 'GET' && url.pathname === '/inbox') {
    const items = readdirSync(INBOX)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({
        id: f.replace(/\.md$/, ''),
        preview: readFileSync(join(INBOX, f), 'utf-8').slice(0, 200),
      }));
    sendJson(res, 200, items);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`🃏 Coach server en http://${HOST}:${PORT}`);
  console.log(`   POST /analyze     → recibir markdown (inbox)`);
  console.log(`   GET  /result/:id  → consultar resultado (outbox)`);
  console.log(`   GET  /inbox       → listar pendientes`);
  console.log(`   GET  /health      → estado`);
});