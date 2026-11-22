const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const current = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

function ts() { return new Date().toISOString(); }
function emit(level, msg, meta) {
  if ((LEVELS[level] || 0) < current) return;
  const line = `[${ts()}] [whatsapp-service] [${level.toUpperCase()}] ${msg}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta && typeof meta === 'object' && Object.keys(meta).length) out(line, meta);
  else out(line);
}

export const logger = {
  debug: (m, meta) => emit('debug', m, meta),
  info: (m, meta) => emit('info', m, meta),
  warn: (m, meta) => emit('warn', m, meta),
  error: (m, meta) => emit('error', m, meta),
};
