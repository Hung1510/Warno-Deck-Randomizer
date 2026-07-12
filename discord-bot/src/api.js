// Thin wrapper around the WARNO Deck Randomizer REST API. No Discord-specific
// code here -- kept separate so it can be exercised against the real running
// server without needing a live Discord connection (see README's "What's
// verified vs not" section).

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';

async function apiFetch(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error ${res.status}`);
  return body;
}

export function randomDeck({ divisionId, chaos, theme } = {}) {
  const params = new URLSearchParams();
  if (divisionId) params.set('divisionId', divisionId);
  if (chaos !== undefined) params.set('chaos', String(chaos));
  if (theme) params.set('theme', theme);
  return apiFetch(`/api/randomize?${params.toString()}`);
}

export function dailyDeck() {
  return apiFetch('/api/daily');
}

export function findDivision(query) {
  return apiFetch(`/api/divisions/lookup?q=${encodeURIComponent(query)}`);
}

export function counterDivision(query, { divisionId } = {}) {
  const params = new URLSearchParams();
  if (divisionId) params.set('divisionId', divisionId);
  return apiFetch(`/api/counter/division/${encodeURIComponent(query)}?${params.toString()}`);
}