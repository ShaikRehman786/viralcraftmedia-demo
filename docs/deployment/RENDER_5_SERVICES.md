# ViralCraft Media CRM — 5-Service Render Deployment Guide

This guide describes the approved 5-service layout. It is a deployment/runbook reference only; do **not** treat it as proof of live deployment.

## Approved Services (only these 5)

| Service | Folder | Default Port | Health | Start Command |
|---|---|---:|---|---|
| Main API | `services/main-api/` | 5000 | `GET /health` | `node services/main-api/server.js` |
| WhatsApp Service | `services/whatsapp-service/` | 5001 | `GET /health` | `node services/whatsapp-service/server.js` |
| Backup Service | `services/backup-service/` | 5002 | `GET /health` | `node services/backup-service/server.js` |
| Worker Service | `services/worker-service/` | 5003 | `GET /health` | `node services/worker-service/server.js` |
| Realtime Service | `services/realtime-service/` | 5004 | `GET /health` | `node services/realtime-service/server.js` |

All services expose `/health` (and main API also exposes `/api/health`). Health handlers return 200 when dependencies are healthy, 503 when degraded.

## Local Independent Startup

Run from repo root (so backend dependencies resolve):

```powershell
# Main API (port 5000)
$env:PORT=5000; node services/main-api/server.js

# WhatsApp Service (port 5001) - existing service, preserved
$env:PORT=5001; node services/whatsapp-service/server.js

# Backup Service (port 5002)
$env:PORT=5002; node services/backup-service/server.js

# Worker Service (port 5003)
$env:PORT=5003; node services/worker-service/server.js

# Realtime Service (port 5004)
$env:PORT=5004; node services/realtime-service/server.js
```

For split mode, disable in-process duplicates in Main API:

```env
RUN_IN_PROCESS_BACKUP=false
RUN_IN_PROCESS_WORKERS=false
RUN_IN_PROCESS_WHATSAPP=false
WHATSAPP_ADAPTER_ENABLED=false   # keep false until live validation passes
REALTIME_SERVICE_URL=http://localhost:5004
WHATSAPP_SERVICE_URL=http://localhost:5001
BACKUP_SERVICE_URL=http://localhost:5002
WORKER_SERVICE_URL=http://localhost:5003
```

## HMAC Internal API Contract

All internal service-to-service calls use `backend/shared/security/internalAuth.js`:

- Headers: `x-internal-service`, `x-internal-timestamp`, `x-internal-nonce`, `x-internal-signature`
- Canonical signature message: `timestamp\nservice\nnonce\nmethod\npath\nbody`
- Timestamp skew tolerance: 30s; nonce replay protection: Redis NX+EX when available, fail-closed when Redis unavailable unless explicit test store injected.
- Shared secret: `INTERNAL_SERVICE_KEY` (required in production).

Implemented internal endpoints:

- WhatsApp Service: `POST/GET /internal/whatsapp/*` (existing, HMAC protected)
- Realtime Service: `POST /internal/realtime/dispatch` (HMAC protected)
- Backup Service: `GET /internal/backup/status`, `POST /internal/backup/force-sync`, `POST /internal/backup/purge-expired` (HMAC protected)

Internal routes must never be exposed without HMAC verification.

## Render Web Service Configuration (5 services)

Create 5 separate Render Web Services from the same repo/branch, each with its own start command and env vars.

### Common env vars (all services where applicable)
- `NODE_ENV=production`
- `INTERNAL_SERVICE_KEY=<strong-shared-secret>`
- `MONGO_URI=<primary-mongodb-uri>`
- `REDIS_URL=<redis-url>` (recommended for nonce replay protection/rate limiting)
- `FRONTEND_URL=<crm-frontend-url>`

### 1) Main API (port 5000)
- **Root/Build**: repo root; `npm install --prefix backend`
- **Start**: `node services/main-api/server.js`
- **Health Check Path**: `/health`
- **Env**: all existing backend required vars (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `BACKUP_JWT_SECRET`, `PARTNER_JWT_SECRET`, `BACKUP_ADMIN_EMAIL`, etc.), plus:
  - `PORT=5000`
  - `WHATSAPP_ADAPTER_ENABLED=false` (default until live validation passes)
  - `RUN_IN_PROCESS_BACKUP=false` (split mode)
  - `RUN_IN_PROCESS_WORKERS=false` (split mode)
  - `RUN_IN_PROCESS_WHATSAPP=false` (split mode)
  - `REALTIME_SERVICE_URL=https://<realtime-service>.onrender.com`
  - `WHATSAPP_SERVICE_URL=https://<whatsapp-service>.onrender.com`
  - `BACKUP_SERVICE_URL=https://<backup-service>.onrender.com`
  - `WORKER_SERVICE_URL=https://<worker-service>.onrender.com`

### 2) WhatsApp Service (port 5001)
- **Root/Build**: repo root; `npm install --prefix services/whatsapp-service`
- **Start**: `node services/whatsapp-service/server.js`
- **Health Check Path**: `/health`
- **Env**:
  - `PORT=5001`
  - `INTERNAL_SERVICE_KEY=<same-shared-secret>`
  - `REDIS_URL=<redis-url>`
  - `WHATSAPP_CLIENT_ID=<isolated-client-id>`
  - `WHATSAPP_CLEAR_SESSION_ON_LOGOUT=true`
  - `PUPPETEER_CACHE_DIR=/tmp/puppeteer-cache` (or Render persistent disk path)

### 3) Backup Service (port 5002)
- **Root/Build**: repo root; `npm install --prefix backend`
- **Start**: `node services/backup-service/server.js`
- **Health Check Path**: `/health`
- **Env**:
  - `PORT=5002`
  - `INTERNAL_SERVICE_KEY=<same-shared-secret>`
  - `MONGO_URI=<primary-mongodb-uri>`
  - `BACKUP_MONGODB_URI=<backup-mongodb-uri>`
  - `BACKUP_ADMIN_EMAIL=<backup-admin-email>`
  - `BACKUP_ADMIN_PASSWORD=<backup-admin-password>`
  - `BACKUP_JWT_SECRET=<backup-jwt-secret>`
  - `BACKUP_RETENTION_DAYS=30`
  - `BACKUP_MAX_RETRIES=10`
  - `REDIS_URL=<redis-url>`

### 4) Worker Service (port 5003)
- **Root/Build**: repo root; `npm install --prefix backend`
- **Start**: `node services/worker-service/server.js`
- **Health Check Path**: `/health`
- **Env**:
  - `PORT=5003`
  - `INTERNAL_SERVICE_KEY=<same-shared-secret>`
  - `MONGO_URI=<primary-mongodb-uri>`
  - `REDIS_URL=<redis-url>`
  - `RUN_IN_PROCESS_BACKUP=false`
  - `RUN_IN_PROCESS_WHATSAPP=false`

### 5) Realtime Service (port 5004)
- **Root/Build**: repo root; `npm install --prefix backend`
- **Start**: `node services/realtime-service/server.js`
- **Health Check Path**: `/health`
- **Env**:
  - `PORT=5004`
  - `INTERNAL_SERVICE_KEY=<same-shared-secret>`
  - `REDIS_URL=<redis-url>`
  - `FRONTEND_URL=<crm-frontend-url>`

## Safety / Rollback Notes
- Keep `WHATSAPP_ADAPTER_ENABLED=false` until live WhatsApp adapter validation passes.
- Default in-process flags preserve existing monolith behavior when env vars are unset.
- Split deployment should set Main API `RUN_IN_PROCESS_BACKUP=false`, `RUN_IN_PROCESS_WORKERS=false`, `RUN_IN_PROCESS_WHATSAPP=false` to avoid duplicate change-stream/cron/WA watchers.
- Realtime remote dispatch falls back safely when `REALTIME_SERVICE_URL` is not set or remote call fails (local emit/no-op behavior preserved).
- Internal endpoints are HMAC-protected; never expose them publicly without ingress controls.
