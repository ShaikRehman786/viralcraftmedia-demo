# WhatsApp Automation Service (Phase 2 Step 3 Foundation)

Standalone, independently executable WhatsApp service scaffold for ViralCraft Media CRM.

## Isolation / safety
- **Does not modify** Main CRM backend, routes, frontend, schemas, or existing WhatsApp runtime.
- **No production traffic switching.** Initial endpoints are internal/HMAC-protected only (except `/health`).
- **Session isolation:** defaults to an isolated LocalAuth client/session (`WHATSAPP_CLIENT_ID=vcm-crm-whatsapp-phase2-foundation`) and service-local auth path. **Do not use production client id `vcm-crm-whatsapp` or point to production session data** for foundation validation.

## Run
- Requires Node.js 18+ and a service-local install: `npm install` inside `services/whatsapp-service` (creates `node_modules` and `package-lock.json` here).
- The service resolves its runtime packages (including `whatsapp-web.js` and `puppeteer`) from its own `node_modules`; it does not require `backend/node_modules`.
- `node server.js` (listens on `PORT`, default 5001)

## Scripts
- `npm run setup:chrome` - build-time Puppeteer Chrome install/verify into authoritative cache (adapted from backend scripts logic). Run during build/deploy, not per request/startup connection.
- `npm test` - runs foundation tests (`node --test`).

## Persistence (required for real deployments)
- **LocalAuth session:** persistent writable volume mounted to the service session base dir (default `<service>/.wwebjs_auth`). Ephemeral filesystems lose WhatsApp auth and require re-scan.
- **Chromium/Puppeteer cache:** persistent or build-persisted cache at `PUPPETEER_CACHE_DIR` (recommended inside deployable/persistent path). Ephemeral cache can cause browser-not-found on restart.
- **Single active session holder:** run exactly one instance per WhatsApp account/clientId to avoid competing browser sessions/takeover conflicts.

## Internal security
- Operational endpoints under `/internal/*` require Phase 1.1 HMAC headers: `x-internal-service`, `x-internal-timestamp`, `x-internal-nonce`, `x-internal-signature`.
- Canonical signing: `timestamp\nservice\nnonce\nMETHOD\ncanonicalPathWithQuery\nbody` (HMAC-SHA256, timing-safe verify, ±30s skew, nonce replay protection via Redis `SET NX EX`, fail-closed when replay protection unavailable).
- `/health` is unauthenticated for liveness checks.
