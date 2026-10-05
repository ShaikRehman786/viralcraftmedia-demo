// Single source of truth for the Puppeteer browser cache location.
//
// AUTHORITATIVE RULE (build and runtime must agree):
//   PUPPETEER_CACHE_DIR env var when set, otherwise
//   <backend-root>/.cache/puppeteer  (inside the deployable project directory,
//   so the browser installed during the Render BUILD survives to runtime).
//
// Resolved from this file's location — never from process.cwd() — so it is
// identical whether Render runs from `/` or `/backend`, and whether the
// caller is the build-time installer or the runtime WhatsApp service.
// No secrets are read or printed here.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/scripts/ -> backend/
export const backendRoot = path.resolve(__dirname, '..');

export const getAuthoritativeCacheDir = () => {
  const fromEnv = (process.env.PUPPETEER_CACHE_DIR || '').trim();
  if (fromEnv) return fromEnv;
  return path.join(backendRoot, '.cache', 'puppeteer');
};

const BINARY_REL_PATHS = [
  path.join('chrome-linux64', 'chrome'),
  path.join('chrome-win64', 'chrome.exe'),
  path.join('chrome-linux', 'chrome')
];

// Return the first Chrome binary that actually exists under <cacheDir>/chrome/*,
// or undefined. Never throws.
export const findChromeBinary = (cacheDir) => {
  try {
    if (!cacheDir) return undefined;
    const chromeDir = path.join(cacheDir, 'chrome');
    if (!fs.existsSync(chromeDir)) return undefined;
    for (const build of fs.readdirSync(chromeDir)) {
      for (const rel of BINARY_REL_PATHS) {
        const full = path.join(chromeDir, build, rel);
        try {
          if (fs.existsSync(full)) return full;
        } catch {
          // Keep probing.
        }
      }
    }
  } catch {
    // Unreadable cache dir -> treat as not found.
  }
  return undefined;
};
