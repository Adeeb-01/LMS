import { z } from 'zod';

/**
 * MongoDB configuration schema
 * @property {string} connectionString - MongoDB connection URI
 * @property {number} maxPoolSize - Maximum connection pool size (1-100)
 * @property {number} serverSelectionTimeoutMs - Server selection timeout (1000-30000ms)
 * @property {number} socketTimeoutMs - Socket timeout (10000-120000ms)
 */
export const mongoConfigSchema = z.object({
  connectionString: z.string().min(1, 'MongoDB connection string is required'),
  maxPoolSize: z.number().min(1).max(100).default(10),
  serverSelectionTimeoutMs: z.number().min(1000).max(30000).default(5000),
  socketTimeoutMs: z.number().min(10000).max(120000).default(45000),
});

/**
 * ChromaDB configuration schema
 * @property {string} host - ChromaDB HTTP endpoint URL
 * @property {string} collection - Default collection name for embeddings
 * @property {number} timeout - Request timeout (1000-30000ms)
 */
export const chromaConfigSchema = z.object({
  host: z.string().url('Invalid ChromaDB host URL').default('http://localhost:8000'),
  collection: z.string().regex(/^[a-zA-Z0-9_]+$/, 'Invalid collection name format').default('lms_embeddings'),
  timeout: z.number().min(1000).max(30000).default(5000),
});

/**
 * Overall database configuration schema
 * @property {object} mongodb - MongoDB specific configuration
 * @property {object} [chroma] - ChromaDB specific configuration (optional)
 * @property {number} healthCheckIntervalMs - Cache duration for health checks (5000-300000ms)
 */
export const databaseConfigSchema = z.object({
  mongodb: mongoConfigSchema,
  chroma: chromaConfigSchema.optional(),
  healthCheckIntervalMs: z.number().min(5000).max(300000).default(30000),
});

/**
 * Service health status schema
 */
export const serviceHealthSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'unavailable']),
  responseTimeMs: z.number(),
  message: z.string(),
  lastError: z.string().nullable(),
});

/**
 * Aggregated health status schema
 */
export const healthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  responseTimeMs: z.number(),
  services: z.object({
    mongodb: serviceHealthSchema,
    chroma: serviceHealthSchema,
  }),
});

/**
 * Sanitizes a MongoDB connection string by masking the password
 * @param {string} connectionString 
 * @returns {string}
 */
export function sanitizeConnectionString(connectionString) {
  if (!connectionString) return '';
  try {
    // Regex for mongo connection string: mongodb+srv://username:password@host/db
    return connectionString.replace(
      /(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/,
      '$1****$3'
    );
  } catch (err) {
    return '[INVALID CONNECTION STRING]';
  }
}

/**
 * Loads database configuration from environment variables
 * @returns {object} Validated database configuration
 * @throws {Error} If configuration validation fails
 */
export function loadDatabaseConfig() {
  const config = {
    mongodb: {
      connectionString: process.env.MONGODB_CONNECTION_STRING,
      maxPoolSize: process.env.MONGODB_MAX_POOL_SIZE ? parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) : undefined,
      serverSelectionTimeoutMs: process.env.MONGODB_SERVER_SELECTION_TIMEOUT ? parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT, 10) : undefined,
      socketTimeoutMs: process.env.MONGODB_SOCKET_TIMEOUT ? parseInt(process.env.MONGODB_SOCKET_TIMEOUT, 10) : undefined,
    },
    chroma: {
      host: process.env.CHROMA_HOST,
      collection: process.env.CHROMA_COLLECTION,
      timeout: process.env.CHROMA_TIMEOUT ? parseInt(process.env.CHROMA_TIMEOUT, 10) : undefined,
    },
    healthCheckIntervalMs: process.env.DB_HEALTH_INTERVAL_MS ? parseInt(process.env.DB_HEALTH_INTERVAL_MS, 10) : undefined,
  };

  const result = databaseConfigSchema.safeParse(config);

  if (!result.success) {
    const errorMessages = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Database configuration validation failed: ${errorMessages}`);
  }

  return result.data;
}
