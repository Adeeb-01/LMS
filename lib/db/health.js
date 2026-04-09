import * as mongoService from '../../service/mongo';
import * as chromaService from '../../service/chroma';
import { loadDatabaseConfig } from './config';

/**
 * Health check cache state
 */
let cachedHealth = {
  data: null,
  timestamp: 0,
};

/**
 * Aggregates health status from all configured database services
 * @param {boolean} force - Whether to force a fresh check (skip cache)
 * @returns {Promise<object>} Unified health status
 */
export async function checkAllServices(force = false) {
  const config = loadDatabaseConfig();
  const cacheInterval = config.healthCheckIntervalMs || 30000;
  const now = Date.now();

  // Return cached version if still valid
  if (!force && cachedHealth.data && (now - cachedHealth.timestamp < cacheInterval)) {
    return {
      ...cachedHealth.data,
      cached: true,
      timestamp: new Date(cachedHealth.timestamp).toISOString(),
    };
  }

  const startTime = now;
  
  // 1. Check MongoDB (Core service)
  const mongoHealth = await mongoService.getHealthStatus();
  
  let chromaHealth;
  let overallStatus = 'healthy';

  // 2. Determine overall status based on MongoDB health
  if (mongoHealth.status !== 'healthy') {
    overallStatus = 'unhealthy';
    // If MongoDB is down, we skip ChromaDB as the system is already considered unhealthy
    chromaHealth = {
      status: 'unavailable',
      responseTimeMs: 0,
      message: 'ChromaDB check skipped (MongoDB unhealthy)',
      lastError: null,
    };
  } else {
    // 3. Check ChromaDB (Optional service)
    chromaHealth = await chromaService.getHealthStatus();
    
    if (chromaHealth.status !== 'healthy') {
      overallStatus = 'degraded';
    }
  }

  const totalResponseTimeMs = Date.now() - startTime;

  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTimeMs: totalResponseTimeMs,
    services: {
      mongodb: mongoHealth,
      chroma: chromaHealth,
    },
  };

  // Update cache
  cachedHealth = {
    data: healthData,
    timestamp: Date.now(),
  };

  return {
    ...healthData,
    cached: false,
  };
}

/**
 * Invalidates the health cache
 */
export function invalidateCache() {
  cachedHealth.data = null;
  cachedHealth.timestamp = 0;
}
