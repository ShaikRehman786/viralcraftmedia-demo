// Build-time Puppeteer browser installer + verifier (single mechanism).
//
// Invoked as `npm run setup:chrome` AND as the `postinstall` hook, so EVERY
// `npm install` / `npm ci` — including a fresh Render build using a dashboard
// build command that never mentions Chrome — installs the exact Chrome
// revision required by the backend's installed Puppeteer into the ONE
// authoritative project-local cache dir (see ./puppeteer-cache.js), then
// VERIFIES the binary exists and that Puppeteer resolves it.
//
// This runs in the BUILD phase only. It never runs at server start, per
// WhatsApp connection, or per QR request.
//
// Failure policy: any install/verification failure exits non-zero so the
// Render BUILD fails loudly instead of deploying a broken WhatsApp service.
// (A local `npm install` is unaffected in practice: npm already fails today
// via Puppeteer's own postinstall if Chrome cannot be downloaded.)
//
// Prints only safe paths/versions — never secrets.
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  backendRoot,
  getAuthoritativeCacheDir,
  findChromeBinary
} from './puppeteer-cache.js';

const SKIP = ['PUPPETEER_SKIP_DOWNLOAD', 'PUPPETEER_SKIP_CHROME_DOWNLOAD']
  .some((k) => (process.env[k] || '').toLowerCase() === 'true');

const fail = (message) => {
  console.error(`[PUPPETEER] Browser verification: FAIL — ${message}`);
  process.exit(1);
};

const main = async () => {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const cacheDir = getAuthoritativeCacheDir();
  // Both the installer CLI and the runtime resolver below must use this dir.
  process.env.PUPPETEER_CACHE_DIR = cacheDir;

  console.info(`[PUPPETEER] Environment: ${nodeEnv}`);
  console.info(`[PUPPETEER] Cache directory: ${cacheDir}`);

  fs.mkdirSync(cacheDir, { recursive: true });

  if (!SKIP) {
    // Installs the Chrome revision required by THIS backend's puppeteer
    // (whatsapp-web.js resolves to the same hoisted copy). Idempotent:
    // skipped when the revision is already present. backend/node_modules/.bin
    // is on PATH inside npm lifecycle scripts on every platform.
    try {
      execSync('puppeteer browsers install chrome', {
        cwd: backendRoot,
        env: process.env,
        stdio: 'inherit',
        shell: true
      });
    } catch (err) {
      fail(`Chrome installation command failed (${err.message}).`);
    }
  } else {
    console.info('[PUPPETEER] Download skipped via PUPPETEER_SKIP_DOWNLOAD; verifying provided browser.');
  }

  // Verify via Puppeteer's OWN resolution (same mechanism whatsapp-web.js uses
  // at runtime), plus an independent filesystem probe. Dynamic import AFTER
  // setting PUPPETEER_CACHE_DIR so resolution uses the authoritative dir.
  let resolved = '';
  try {
    const { default: puppeteer } = await import('puppeteer');
    resolved = puppeteer.executablePath();
  } catch (err) {
    fail(`Puppeteer could not resolve a Chrome executable (${err.message}).`);
  }

  const onDisk = resolved && fs.existsSync(resolved) ? resolved : findChromeBinary(cacheDir);
  const explicit = (process.env.PUPPETEER_EXECUTABLE_PATH || '').trim();
  const finalExecutable = onDisk || (explicit && fs.existsSync(explicit) ? explicit : '');

  if (!finalExecutable) {
    fail(
      'no browser binary found. Expected Puppeteer to resolve Chrome ' +
      `inside ${cacheDir} (PUPPETEER_CACHE_DIR) or PUPPETEER_EXECUTABLE_PATH.`
    );
  }

  let puppeteerVersion = 'unknown';
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(backendRoot, 'node_modules', 'puppeteer', 'package.json'), 'utf8')
    );
    puppeteerVersion = pkg.version || 'unknown';
  } catch {
    // Version label is informational only; verification already passed.
  }
  const revisionMatch = finalExecutable.match(/(\d{3}\.\d+\.\d+\.\d+)/);
  console.info(`[PUPPETEER] Puppeteer version: ${puppeteerVersion}`);
  console.info(`[PUPPETEER] Chrome revision: ${revisionMatch ? revisionMatch[1] : 'unknown'}`);
  console.info(`[PUPPETEER] Executable: ${finalExecutable}`);
  console.info('[PUPPETEER] Browser installed: true');
  console.info('[PUPPETEER] Browser verification: PASS');
};

await main();
