import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadCoachSession,
  saveCoachSession,
  clearCoachSession,
  COACH_SESSION_KEY,
} from './coachSession';
import { STORAGE_KEYS } from '@pokemon-simulator/core/storage';

// Mock localStorage behind the same shape the browser exposes — the coach
// session persists through the same web adapter (`webStorage` over
// `window.localStorage`) that every other storage key uses (C-1, SC7).
const store: Record<string, string> = {};
vi.stubGlobal('window', {
  localStorage: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (_: number) => null,
  },
});

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
});

describe('coach session persistence through the web adapter (7th key, SC7)', () => {
  it('binds COACH_SESSION_KEY to STORAGE_KEYS.coachSession', () => {
    // The 7-key contract from spec C-1: the coach key is part of the same
    // frozen key set the core store/normalization flows through.
    expect(COACH_SESSION_KEY).toBe(STORAGE_KEYS.coachSession);
    expect(COACH_SESSION_KEY).toBe('pokemon-coach-session');
  });

  it('returns null when no session is stored', async () => {
    await expect(loadCoachSession()).resolves.toBeNull();
  });

  it('persists a session through webStorage under the coach key', async () => {
    const session = {
      coachId: 'coach-abc',
      coachStatus: 'pending' as const,
      coachResult: '',
      coachError: '',
    };
    await saveCoachSession(session);
    // The value lands in the browser localStorage under the 7th key.
    expect(store['pokemon-coach-session']).toBe(JSON.stringify(session));
  });

  it('round-trips a saved session through loadCoachSession', async () => {
    const session = {
      coachId: 'coach-xyz',
      coachStatus: 'done' as const,
      coachResult: '# Análisis del coach',
      coachError: '',
    };
    await saveCoachSession(session);
    await expect(loadCoachSession()).resolves.toEqual(session);
  });

  it('clears the session from storage', async () => {
    await saveCoachSession({
      coachId: 'coach-clear',
      coachStatus: 'done' as const,
      coachResult: 'r',
      coachError: '',
    });
    await clearCoachSession();
    expect(store['pokemon-coach-session']).toBeUndefined();
    await expect(loadCoachSession()).resolves.toBeNull();
  });

  it('is idempotent when clearing a missing session', async () => {
    await expect(clearCoachSession()).resolves.toBeUndefined();
    await expect(loadCoachSession()).resolves.toBeNull();
  });

  it('tolerates malformed stored JSON (legacy tolerance, never throws)', async () => {
    store['pokemon-coach-session'] = '{not-json';
    await expect(loadCoachSession()).resolves.toBeNull();
  });
});