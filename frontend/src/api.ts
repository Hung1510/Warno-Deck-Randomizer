import type { DeckResponse, Division, MetaResponse, RandomizePayload } from './types';

const BASE: string = import.meta.env.VITE_API_BASE || '';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getMeta(): Promise<MetaResponse> {
  return fetch(`${BASE}/api/meta`).then((r) => json<MetaResponse>(r));
}

export function getDivisions(): Promise<Division[]> {
  return fetch(`${BASE}/api/divisions`).then((r) => json<Division[]>(r));
}

export function randomize(payload: RandomizePayload): Promise<DeckResponse> {
  return fetch(`${BASE}/api/randomize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((r) => json<DeckResponse>(r));
}

export function decode(code: string): Promise<DeckResponse> {
  return fetch(`${BASE}/api/decode?code=${encodeURIComponent(code)}`).then((r) => json<DeckResponse>(r));
}
