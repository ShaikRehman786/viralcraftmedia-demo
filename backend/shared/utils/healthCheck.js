/**
 * Reusable health/readiness handler factory.
 * Returns 200 when all reported dependencies are healthy, 503 when degraded.
 */
export function createHealthHandler(options = {}) {
  const serviceName = options.serviceName || 'service';
  const getDependencies = typeof options.dependencies === 'function'
    ? options.dependencies
    : () => options.dependencies || {};

  return async (req, res) => {
    let dependencies = {};
    try {
      const raw = await getDependencies();
      dependencies = raw && typeof raw === 'object' ? raw : {};
    } catch {
      dependencies = { error: false };
    }

    const normalized = {};
    for (const [key, value] of Object.entries(dependencies)) {
      normalized[key] = typeof value === 'function' ? await value() : value;
    }

    const healthy = Object.values(normalized).every((value) => {
      if (value === true) return true;
      if (value === false || value === null || value === undefined) return false;
      if (typeof value === 'object') return value.healthy !== false && value.ok !== false && value.status !== 'down';
      return Boolean(value);
    });

    const payload = {
      success: healthy,
      status: healthy ? 'healthy' : 'degraded',
      service: serviceName,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: normalized,
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
    };

    return res.status(healthy ? 200 : 503).json(payload);
  };
}

export default createHealthHandler;