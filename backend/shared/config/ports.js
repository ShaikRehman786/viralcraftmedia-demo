/**
 * Centralized service discovery and port configuration.
 * Allows independent execution of the 5 services across ports 5000-5004,
 * with fallbacks for local monolithic development and containerized environments.
 */

export const SERVICE_NAMES = {
  MAIN_API: 'main-api',
  WHATSAPP: 'whatsapp-service',
  BACKUP: 'backup-service',
  WORKER: 'background-worker',
  REALTIME: 'realtime-service'
};

export const DEFAULT_PORTS = {
  [SERVICE_NAMES.MAIN_API]: 5000,
  [SERVICE_NAMES.WHATSAPP]: 5001,
  [SERVICE_NAMES.BACKUP]: 5002,
  [SERVICE_NAMES.WORKER]: 5003,
  [SERVICE_NAMES.REALTIME]: 5004
};

export function getServiceUrl(serviceName) {
  switch (serviceName) {
    case SERVICE_NAMES.MAIN_API:
      return process.env.MAIN_API_URL || `http://localhost:${process.env.PORT || DEFAULT_PORTS[SERVICE_NAMES.MAIN_API]}`;
    case SERVICE_NAMES.WHATSAPP:
      return process.env.WHATSAPP_SERVICE_URL || `http://localhost:${process.env.WHATSAPP_PORT || DEFAULT_PORTS[SERVICE_NAMES.WHATSAPP]}`;
    case SERVICE_NAMES.BACKUP:
      return process.env.BACKUP_SERVICE_URL || `http://localhost:${process.env.BACKUP_PORT || DEFAULT_PORTS[SERVICE_NAMES.BACKUP]}`;
    case SERVICE_NAMES.WORKER:
      return process.env.WORKER_SERVICE_URL || `http://localhost:${process.env.WORKER_PORT || DEFAULT_PORTS[SERVICE_NAMES.WORKER]}`;
    case SERVICE_NAMES.REALTIME:
      return process.env.REALTIME_SERVICE_URL || `http://localhost:${process.env.REALTIME_PORT || DEFAULT_PORTS[SERVICE_NAMES.REALTIME]}`;
    default:
      throw new Error(`Unknown service: ${serviceName}`);
  }
}
