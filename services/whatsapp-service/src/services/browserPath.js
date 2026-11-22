import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// services/whatsapp-service/src/services -> services/whatsapp-service
export const serviceRoot = path.resolve(__dirname, '../..');

export function getServiceCacheDir(configured) {
  const fromEnv = (configured || process.env.PUPPETEER_CACHE_DIR || '').trim();
  if (fromEnv) return fromEnv;
  return path.join(serviceRoot, '.cache', 'puppeteer');
}

const BINARY_REL_PATHS = [
  path.join('chrome-linux64', 'chrome'),
  path.join('chrome-win64', 'chrome.exe'),
  path.join('chrome-linux', 'chrome'),
];

export function findChromeBinary(cacheDir) {
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

export function resolveBrowserExecutable({ isProduction, configuredCacheDir, configuredExecutablePath } = {}) {
  // If an explicit executable path is configured, honor it strictly (deterministic, no silent fallback).
  const explicit = (configuredExecutablePath || process.env.PUPPETEER_EXECUTABLE_PATH || '').trim();
  if (explicit) {
    try { if (fs.existsSync(explicit)) return explicit; } catch {}
    return undefined;
  }

  const cacheDir = getServiceCacheDir(configuredCacheDir);
  const found = findChromeBinary(cacheDir);
  if (found) return found;

  const extraCacheDirs = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(serviceRoot, '.cache', 'puppeteer'),
    path.join(process.cwd(), '.cache', 'puppeteer'),
  ].filter(Boolean);
  for (const dir of extraCacheDirs) {
    const b = findChromeBinary(dir);
    if (b) return b;
  }

  // In production, probe common system locations only if they exist; never invent paths.
  if (isProduction) {
    for (const sysPath of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
      try { if (fs.existsSync(sysPath)) return sysPath; } catch {}
    }
  }
  return undefined;
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}
