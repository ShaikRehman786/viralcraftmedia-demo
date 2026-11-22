import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '..', '..', 'dist', 'crm');
const dest = path.resolve(here, '..', 'app');

try {
  await stat(path.join(src, 'index-crm.html'));
} catch {
  console.error('Missing dist/crm/index-crm.html — run "npm run build:crm" in the repo root first.');
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await mkdir(path.dirname(dest), { recursive: true });
await cp(src, dest, { recursive: true });
console.log(`Prepared desktop bundle: ${dest}`);
