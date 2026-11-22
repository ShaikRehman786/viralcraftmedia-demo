// Build-time Chrome installer for whatsapp-service (adapted from backend/scripts/install-chrome.js logic)
// Installs Puppeteer's Chrome into the authoritative service cache and verifies the binary exists.
// Never logs secrets. Safe to run locally; on Render run during build.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceRoot = path.resolve(__dirname, '..');

function getServiceCacheDir() {
  const fromEnv = (process.env.PUPPETEER_CACHE_DIR || '').trim();
  if (fromEnv) return fromEnv;
  return path.join(serviceRoot, '.cache', 'puppeteer');
}

const BINARY_REL_PATHS = [
  path.join('chrome-linux64', 'chrome'),
  path.join('chrome-win64', 'chrome.exe'),
  path.join('chrome-linux', 'chrome'),
];

function findChromeBinary(cacheDir) {
  try {
    if (!cacheDir) return undefined;
    const chromeDir = path.join(cacheDir, 'chrome');
    if (!fs.existsSync(chromeDir)) return undefined;
    for (const build of fs.readdirSync(chromeDir)) {
      for (const rel of BINARY_REL_PATHS) {
        const full = path.join(chromeDir, build, rel);
        try { if (fs.existsSync(full)) return full; } catch {}
      }
    }
  } catch {}
  return undefined;
}

function npmExecPath() {
  // When invoked via an npm script, npm exposes the CLI entrypoint directly.
  // This avoids spawning npm.cmd on Windows (spawnSync EINVAL without a shell).
  const fromEnv = (process.env.npm_execpath || '').trim();
  if (fromEnv) {
    try { if (fs.existsSync(fromEnv)) return fromEnv; } catch {}
  }
  try {
    const require = createRequire(import.meta.url);
    return require.resolve('npm/bin/npm-cli.js');
  } catch {
    return null;
  }
}

const cacheDir = getServiceCacheDir();
console.info(`[whatsapp-service][chrome] cache dir: ${cacheDir}`);
fs.mkdirSync(cacheDir, { recursive: true });

if (process.env.PUPPETEER_SKIP_DOWNLOAD === '1' || process.env.PUPPETEER_SKIP_DOWNLOAD === 'true') {
  console.info('[whatsapp-service][chrome] PUPPETEER_SKIP_DOWNLOAD set; skipping download and verifying existing binary only.');
} else {
  const npmCli = npmExecPath();
  const args = ['exec', '--yes', '--', 'puppeteer', 'browsers', 'install', 'chrome', `--cache-dir=${cacheDir}`];
  console.info('[whatsapp-service][chrome] installing Chrome via puppeteer browsers install...');
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, ...args], { cwd: serviceRoot, stdio: 'inherit', env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir } })
    : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: serviceRoot, stdio: 'inherit', env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir } });
  if (result.error) {
    console.error(`[whatsapp-service][chrome] install process error: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[whatsapp-service][chrome] install failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

const binary = findChromeBinary(cacheDir);
if (!binary) {
  console.error(`[whatsapp-service][chrome] verification failed: no Chrome binary found under ${path.join(cacheDir, 'chrome')}`);
  process.exit(1);
}
console.info(`[whatsapp-service][chrome] verified browser binary: ${binary}`);
