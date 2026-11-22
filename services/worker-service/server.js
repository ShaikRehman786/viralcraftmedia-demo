import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'worker-service';
process.env.PORT = process.env.PORT || process.env.WORKER_PORT || '5003';
process.env.WORKER_PORT = process.env.WORKER_PORT || process.env.PORT;
// Worker service owns referral/background jobs only; avoid duplicate backup/WA watchers.
process.env.RUN_IN_PROCESS_BACKUP = process.env.RUN_IN_PROCESS_BACKUP || 'false';
process.env.RUN_IN_PROCESS_WHATSAPP = process.env.RUN_IN_PROCESS_WHATSAPP || 'false';
process.env.RUN_IN_PROCESS_WORKERS = process.env.RUN_IN_PROCESS_WORKERS || 'true';

await import(pathToFileURL(path.resolve(__dirname, '../../backend/workers/referralWorker.js')).href);
