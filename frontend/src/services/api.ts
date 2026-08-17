/**
 * JalSetu GIS — Centralized API Service
 * All fetch calls to the backend live here.
 */

const API_BASE = `${(import.meta.env.VITE_API_URL || 'http://localhost:5050').replace(/\/$/, '')}/api`;

async function fetchJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || res.statusText);
  }
  return res.json();
}

// ─── Health ──────────────────────────────────────────────
export const getHealth = () => fetchJSON('/health');

// ─── City Metadata ───────────────────────────────────────
export const getCityMetadata = () => fetchJSON('/city');

// ─── Waterways ───────────────────────────────────────────
export const getWaterways = (params?: { bbox?: string; type?: string }) => {
  const qs = new URLSearchParams();
  if (params?.bbox) qs.set('bbox', params.bbox);
  if (params?.type) qs.set('type', params.type);
  const q = qs.toString();
  return fetchJSON(`/waterways${q ? '?' + q : ''}`);
};
export const getWaterwayStats = () => fetchJSON('/waterways/stats');
export const getWaterwayById = (osmId: string) => fetchJSON(`/waterways/${encodeURIComponent(osmId)}`);

// ─── Flood Events ────────────────────────────────────────
export const getFloodEvents = () => fetchJSON('/flood-events');
export const getFloodEventByIndex = (index: number) => fetchJSON(`/flood-events/${index}`);

// ─── Flood Locations ─────────────────────────────────────
export const getFloodLocations = (params?: { bbox?: string; category?: string }) => {
  const qs = new URLSearchParams();
  if (params?.bbox) qs.set('bbox', params.bbox);
  if (params?.category) qs.set('category', params.category);
  const q = qs.toString();
  return fetchJSON(`/flood-locations${q ? '?' + q : ''}`);
};

// ─── Risk Model ──────────────────────────────────────────
export const getRiskModel = () => fetchJSON('/risk-model');
export const getSusceptibility = () => fetchJSON('/risk-model/susceptibility');
export const getRiskScore = (lat: number, lng: number) =>
  fetchJSON(`/risk-model/score?lat=${lat}&lng=${lng}`);

// ─── Nullahs ─────────────────────────────────────────────
export const getNullahs = () => fetchJSON('/nullahs');

// ─── Wards ───────────────────────────────────────────────
export const getWards = () => fetchJSON('/wards');

// ─── Government Response ─────────────────────────────────
export const getGovernmentResponse = () => fetchJSON('/government-response');

// ─── Citizen Reports ─────────────────────────────────────
export const getCitizenReports = (params?: { bbox?: string; status?: string; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.bbox) qs.set('bbox', params.bbox);
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return fetchJSON(`/citizen-reports${q ? '?' + q : ''}`);
};
export const submitCitizenReport = (body: {
  location: { type: 'Point'; coordinates: [number, number] };
  estimated_depth: string;
  description: string;
  photo_url?: string;
}) =>
  fetchJSON('/citizen-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

// ─── Interventions ───────────────────────────────────────
export const getInterventions = (status?: string) => {
  const q = status ? `?status=${status}` : '';
  return fetchJSON(`/interventions${q}`);
};
export const getInterventionById = (id: string) => fetchJSON(`/interventions/${id}`);
export const createIntervention = (body: {
  work_order_id: string;
  type: string;
  description: string;
  status: string;
  waterway_osm_id?: string;
  cost_estimate?: number;
}) =>
  fetchJSON('/interventions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
export const updateIntervention = (id: string, updates: Record<string, unknown>) =>
  fetchJSON(`/interventions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

// ─── Analytics ───────────────────────────────────────────
export const getAnalyticsSummary = () => fetchJSON('/analytics/summary');

// ─── Data Sources ────────────────────────────────────────
export const getDataSources = () => fetchJSON('/data-sources');

// ─── Blockchain ──────────────────────────────────────────
export const getBlockchainStatus = () => fetchJSON('/blockchain/status');

/** collection: 'citizen-reports' | 'interventions' */
export const verifyOnChain = (collection: 'citizen-reports' | 'interventions', id: string) =>
  fetchJSON(`/blockchain/verify/${collection}/${id}`);
