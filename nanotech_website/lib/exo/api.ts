/**
 * Exo-Platform API client.
 * Connects the Next.js frontend to the Python backend via proxy rewrite.
 */

const BASE = '/api/exo';

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// --- Health ---
export async function getHealth() {
  return fetchJSON(`${BASE}/health`);
}

export async function getStatus() {
  return fetchJSON(`${BASE}/status`);
}

// --- Clients (Pi agents) ---
export interface PiClient {
  client_id: string;
  session_id: string;
  connected_at: number;
  last_heartbeat: number;
  video_connected: boolean;
  telemetry_connected: boolean;
  device_manifest: DeviceInfo[];
  sim_mode: boolean;
}

export interface DeviceInfo {
  type: string;
  id: string;
  config: Record<string, any>;
}

export async function listClients(): Promise<PiClient[]> {
  return fetchJSON(`${BASE}/clients`);
}

export async function getClient(clientId: string): Promise<PiClient> {
  return fetchJSON(`${BASE}/clients/${clientId}`);
}

export async function getClientDevices(clientId: string): Promise<DeviceInfo[]> {
  return fetchJSON(`${BASE}/clients/${clientId}/devices`);
}

// --- Commands ---
export interface CommandResult {
  msg_id: string;
  status: string;
  command: string;
}

export async function sendCommand(
  clientId: string,
  command: string,
  device?: string,
  params?: Record<string, any>
): Promise<CommandResult> {
  return fetchJSON(`${BASE}/clients/${clientId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command, device: device || '', params: params || {} }),
  });
}

export async function sendDeviceCommand(
  clientId: string,
  deviceType: string,
  command: string,
  params?: Record<string, any>
): Promise<CommandResult> {
  return fetchJSON(`${BASE}/clients/${clientId}/devices/${deviceType}/command`, {
    method: 'POST',
    body: JSON.stringify({ command, params: params || {} }),
  });
}

export async function getCommandStatus(msgId: string) {
  return fetchJSON(`${BASE}/commands/${msgId}`);
}

export async function getCommandHistory(clientId: string, limit = 50) {
  return fetchJSON(`${BASE}/clients/${clientId}/commands?limit=${limit}`);
}

// --- Video ---
export function getVideoFeedUrl(clientId: string): string {
  return `${BASE}/clients/${clientId}/video`;
}

export function getSnapshotUrl(clientId: string): string {
  return `${BASE}/clients/${clientId}/video/snapshot`;
}

// --- Telemetry ---
export async function getLatestTelemetry(clientId: string) {
  return fetchJSON(`${BASE}/clients/${clientId}/telemetry`);
}

export async function getTelemetryHistory(clientId: string, since?: number, limit = 1000) {
  let url = `${BASE}/clients/${clientId}/telemetry/history?limit=${limit}`;
  if (since) url += `&since=${since}`;
  return fetchJSON(url);
}

export function createTelemetryWebSocket(clientId: string): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${protocol}//${window.location.host}/api/exo/clients/${clientId}/telemetry/ws`);
}

// --- Auth ---
export async function login(username: string, password: string) {
  return fetchJSON(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username: string, password: string, role = 'researcher') {
  return fetchJSON(`${BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });
}
