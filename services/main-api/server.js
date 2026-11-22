import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default service identity/port for standalone execution. Existing env values win.
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'main-api';
process.env.PORT = process.env.PORT || process.env.MAIN_API_PORT || '5000';

// Keep existing monolith behavior by default; split deployments can disable in-process workers.
process.env.RUN_IN_PROCESS_BACKUP = process.env.RUN_IN_PROCESS_BACKUP || 'true';
process.env.RUN_IN_PROCESS_WORKERS = process.env.RUN_IN_PROCESS_WORKERS || 'true';
process.env.RUN_IN_PROCESS_WHATSAPP = process.env.RUN_IN_PROCESS_WHATSAPP || 'true';

// Reuse the existing backend boot path to preserve API/socket behavior.
await import(pathToFileURL(path.resolve(__dirname, '../../backend/server.js')).href);
