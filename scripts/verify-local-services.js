#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY || 'smoke-internal-key-0123456789';
process.env.INTERNAL_SERVICE_KEY = INTERNAL_KEY;
const BASE_ENV = {
  ...process.env,
  NODE_ENV: 'development',
  INTERNAL_SERVICE_KEY: INTERNAL_KEY,
  INTERNAL_AUTH_MEMORY_NONCE_STORE: 'true',
  WHATSAPP_ADAPTER_ENABLED: 'false',
  RUN_IN_PROCESS_BACKUP: 'false',
  RUN_IN_PROCESS_WORKERS: 'false',
  RUN_IN_PROCESS_WHATSAPP: 'false',
  WHATSAPP_SKIP_INIT: 'true',
  REALTIME_SERVICE_URL: 'http://localhost:5004',
  WHATSAPP_SERVICE_URL: 'http://localhost:5001',
  BACKUP_SERVICE_URL: 'http://localhost:5002',
  WORKER_SERVICE_URL: 'http://localhost:5003',
};

const SERVICES = [
  { name: 'main-api', port: 5000, entry: 'services/main-api/server.js', healthPath: '/health' },
  { name: 'whatsapp-service', port: 5001, entry: 'services/whatsapp-service/server.js', healthPath: '/health' },
  { name: 'backup-service', port: 5002, entry: 'services/backup-service/server.js', healthPath: '/health' },
  { name: 'worker-service', port: 5003, entry: 'services/worker-service/server.js', healthPath: '/health' },
  { name: 'realtime-service', port: 5004, entry: 'services/realtime-service/server.js', healthPath: '/health' },
];

const results = [];
const children = [];

function log(msg) { console.log(msg); }
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}

async function tcpCheck(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const s = net.createConnection(port, host);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    setTimeout(() => { try { s.destroy(); } catch {} resolve(false); }, 1000);
  });
}

async function waitForHealth(svc, timeoutMs = 60000) {
  const start = Date.now();
  let lastErr = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${svc.port}${svc.healthPath}`, { signal: AbortSignal.timeout(3000) });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      if (json) return { ok: res.status >= 200 && res.status < 500, status: res.status, json, text };
      lastErr = `non-json ${res.status}`;
    } catch (e) {
      lastErr = e.message;
    }
    await delay(500);
  }
  return { ok: false, error: lastErr || 'timeout' };
}

function spawnService(svc) {
  const env = { ...BASE_ENV, PORT: String(svc.port) };
  if (svc.name === 'main-api') env.MAIN_API_PORT = String(svc.port);
  if (svc.name === 'worker-service') env.WORKER_PORT = String(svc.port);
  if (svc.name === 'realtime-service') env.REALTIME_PORT = String(svc.port);
  if (svc.name === 'backup-service') env.BACKUP_PORT = String(svc.port);

  const child = spawn(process.execPath, [path.join(repoRoot, svc.entry)], {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => { svc.stdout = (svc.stdout || '') + d.toString(); });
  child.stderr.on('data', (d) => { svc.stderr = (svc.stderr || '') + d.toString(); });
  child.on('exit', (code, signal) => { svc.exitCode = code; svc.exitSignal = signal; });
  svc.child = child;
  children.push(child);
  return child;
}

async function killAll() {
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch {}
  }
  await delay(1500);
  for (const child of children) {
    try { if (!child.killed) child.kill('SIGKILL'); } catch {}
  }
  // Windows fallback
  if (process.platform === 'win32') {
    for (const child of children) {
      if (child.pid) {
        try {
          spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
        } catch {}
      }
    }
  }
}

async function signedFetch(url, { method = 'GET', body, serviceName = 'main-api' } = {}) {
  const { pathToFileURL } = await import('node:url');
  const { signInternalPayload } = await import(pathToFileURL(path.join(repoRoot, 'backend/shared/security/internalAuth.js')).href);
  const u = new URL(url);
  const pathWithQuery = `${u.pathname}${u.search}`;
  const headers = signInternalPayload({ serviceName, method, path: pathWithQuery, body });
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...(body !== undefined ? { 'content-type': 'application/json; charset=utf-8' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function unsignedFetch(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json; charset=utf-8' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function tamperedFetch(url, { method = 'GET', body, serviceName = 'main-api' } = {}) {
  const { pathToFileURL } = await import('node:url');
  const { signInternalPayload } = await import(pathToFileURL(path.join(repoRoot, 'backend/shared/security/internalAuth.js')).href);
  const u = new URL(url);
  const pathWithQuery = `${u.pathname}${u.search}`;
  const headers = signInternalPayload({ serviceName, method, path: pathWithQuery, body });
  headers['x-internal-signature'] = '0'.repeat(64); // tampered
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...(body !== undefined ? { 'content-type': 'application/json; charset=utf-8' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function main() {
  log('== Local 5-service smoke check ==');
  log(`Repo: ${repoRoot}`);
  log(`Node: ${process.version}`);
  log(`INTERNAL_SERVICE_KEY set: ${Boolean(INTERNAL_KEY)}`);
  log(`INTERNAL_AUTH_MEMORY_NONCE_STORE: ${BASE_ENV.INTERNAL_AUTH_MEMORY_NONCE_STORE}`);

  const mongoOk = await tcpCheck(27017);
  const redisOk = await tcpCheck(6379);
  log(`Prereq MongoDB 127.0.0.1:27017: ${mongoOk ? 'reachable' : 'NOT reachable'}`);
  log(`Prereq Redis 127.0.0.1:6379: ${redisOk ? 'reachable' : 'NOT reachable'}`);
  if (!redisOk) log('NOTE: Redis unavailable; signed internal requests may fail closed with 503 unless memory nonce store is enabled.');

  for (const svc of SERVICES) {
    const free = await isPortFree(svc.port);
    if (!free) {
      record(`port:${svc.port}:${svc.name}`, false, 'port not free');
    } else {
      record(`port:${svc.port}:${svc.name}`, true, 'free');
    }
  }

  // Spawn services
  for (const svc of SERVICES) {
    log(`\nStarting ${svc.name} on ${svc.port}...`);
    spawnService(svc);
  }

  // Wait for health
  for (const svc of SERVICES) {
    const h = await waitForHealth(svc, svc.name === 'main-api' ? 90000 : 60000);
    svc.health = h;
    const expectedServiceNames = [svc.name];
    if (svc.name === 'worker-service') expectedServiceNames.push('background-worker');
    const hasIdentity = h.json && expectedServiceNames.includes(h.json.service);
    const ok = Boolean(h.json && hasIdentity && (h.status === 200 || h.status === 503));
    const tail = ((svc.stderr || '') + '\n' + (svc.stdout || '')).split(/\r?\n/).slice(-6).join(' | ');
    record(`health:${svc.name}`, ok, ok ? `status=${h.status} service=${h.json.service}` : `status=${h.status || 'n/a'} err=${h.error || ''} body=${(h.text || '').slice(0, 120)} tail=${tail.slice(0, 300)}`);
  }

  // Fail-closed checks (unsigned/tampered)
  const internalChecks = [
    { name: 'unsigned:realtime-dispatch', url: 'http://127.0.0.1:5004/internal/realtime/dispatch', method: 'POST', body: { eventType: 'smoke.test', payload: { ok: true }, userId: null } },
    { name: 'unsigned:backup-status', url: 'http://127.0.0.1:5002/internal/backup/status', method: 'GET' },
    { name: 'unsigned:whatsapp-status', url: 'http://127.0.0.1:5001/internal/whatsapp/status', method: 'GET' },
  ];
  for (const c of internalChecks) {
    try {
      const r = await unsignedFetch(c.url, { method: c.method, body: c.body });
      const ok = r.status === 401 || r.status === 403;
      record(c.name, ok, `status=${r.status} code=${r.json?.error?.code || ''}`);
    } catch (e) {
      record(c.name, false, e.message);
    }
  }

  const tamperedChecks = [
    { name: 'tampered:realtime-dispatch', url: 'http://127.0.0.1:5004/internal/realtime/dispatch', method: 'POST', body: { eventType: 'smoke.test', payload: { ok: true }, userId: null } },
    { name: 'tampered:backup-status', url: 'http://127.0.0.1:5002/internal/backup/status', method: 'GET' },
    { name: 'tampered:whatsapp-status', url: 'http://127.0.0.1:5001/internal/whatsapp/status', method: 'GET' },
  ];
  for (const c of tamperedChecks) {
    try {
      const r = await tamperedFetch(c.url, { method: c.method, body: c.body });
      const ok = r.status === 401 || r.status === 403;
      record(c.name, ok, `status=${r.status} code=${r.json?.error?.code || ''}`);
    } catch (e) {
      record(c.name, false, e.message);
    }
  }

  // Signed HMAC checks
  try {
    const r = await signedFetch('http://127.0.0.1:5004/internal/realtime/dispatch', {
      method: 'POST',
      body: { eventType: 'smoke.test', payload: { ok: true }, userId: null },
      serviceName: 'main-api',
    });
    record('signed:realtime-dispatch', r.status === 200 && r.json?.success === true, `status=${r.status} code=${r.json?.error?.code || ''}`);
  } catch (e) {
    record('signed:realtime-dispatch', false, e.message);
  }

  try {
    const r = await signedFetch('http://127.0.0.1:5002/internal/backup/status', { method: 'GET', serviceName: 'main-api' });
    // backup-service may return 200 with status or 500 if backup DB not configured; accept 200 as success
    record('signed:backup-status', r.status === 200 && r.json?.success === true, `status=${r.status} code=${r.json?.error?.code || ''}`);
  } catch (e) {
    record('signed:backup-status', false, e.message);
  }

  try {
    const r = await signedFetch('http://127.0.0.1:5001/internal/whatsapp/status', { method: 'GET', serviceName: 'main-api' });
    record('signed:whatsapp-status', r.status === 200 && r.json?.success === true, `status=${r.status} code=${r.json?.error?.code || ''}`);
  } catch (e) {
    record('signed:whatsapp-status', false, e.message);
  }

  // End-to-end dispatch from main-api createRealtimeDispatcher with REALTIME_SERVICE_URL
  try {
    process.env.REALTIME_SERVICE_URL = 'http://localhost:5004';
    const { pathToFileURL } = await import('node:url');
    const mod = await import(pathToFileURL(path.join(repoRoot, 'backend/services/realtimeDispatchService.js')).href);
    const dispatchToRemote = mod.dispatchToRemoteRealtimeService || mod.default?.dispatchToRemoteRealtimeService;
    const ok = await dispatchToRemote('smoke.e2e', { source: 'smoke' }, null);
    record('e2e:dispatchToRemoteRealtimeService', ok === true, `result=${ok}`);
  } catch (e) {
    record('e2e:dispatchToRemoteRealtimeService', false, e.message);
  }

  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  log(`\n== Smoke summary ==`);
  log(`PASS=${pass} FAIL=${fail} TOTAL=${results.length}`);
  for (const r of results) log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} :: ${r.detail || ''}`);

  await killAll();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('SMOKE SCRIPT FATAL', e);
  await killAll();
  process.exit(1);
});
