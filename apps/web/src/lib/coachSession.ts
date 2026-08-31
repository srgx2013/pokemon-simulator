import { webStorage } from './storage';
import { STORAGE_KEYS } from '@pokemon-simulator/core';

// The 7th persistence key (spec C-1 / SC7): the coach session flows through the
// same async web adapter as every other key. Coach stays web-only (D-3) — no
// mobile surface reads or writes it.
export const COACH_SESSION_KEY = STORAGE_KEYS.coachSession;

export type CoachStatus = 'idle' | 'sending' | 'pending' | 'checking' | 'done' | 'error';

export type CoachSession = {
  coachId: string;
  coachStatus: CoachStatus;
  coachResult: string;
  coachError: string;
};

// Async over the web adapter (C-2). The try/catch keeps the legacy tolerance
// the ExportPanel always had — a throwing localStorage (privacy mode, quota)
// degrades to "no session" instead of crashing the export surface.
export async function loadCoachSession(): Promise<CoachSession | null> {
  try {
    const raw = await webStorage.getItem(COACH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as CoachSession) : null;
  } catch {
    return null;
  }
}

export async function saveCoachSession(session: CoachSession): Promise<void> {
  try {
    await webStorage.setItem(COACH_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* localStorage no disponible: ignoramos la persistencia */
  }
}

export async function clearCoachSession(): Promise<void> {
  try {
    await webStorage.removeItem(COACH_SESSION_KEY);
  } catch {
    /* localStorage no disponible */
  }
}