import mongoose from "mongoose";
import { loadDatabaseConfig, sanitizeConnectionString } from "../lib/db/config";
import { ERROR_CODES, sanitizeErrorMessage } from "../lib/errors";

/**
 * Global object for caching Mongoose connection.
 * This ensures the same connection is reused in serverless environments.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, lastError: null };
}

/**
 * Event logging for MongoDB connection status
 */
function setupEventLogging(connection) {
  connection.on('connected', () => {
    console.info('[MongoDB] Connected successfully');
  });

  connection.on('error', (err) => {
    const message = sanitizeErrorMessage(err);
    console.error(`[MongoDB] Connection error: ${message}`);
    cached.lastError = message;
  });

  connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected');
  });

  connection.on('reconnected', () => {
    console.info('[MongoDB] Reconnected');
  });
}

/**
 * Establishes a connection to the MongoDB database
 * @returns {Promise<mongoose.Connection>}
 * @throws {Error} If connection fails or configuration is invalid
 */
export async function dbConnect() {
  // Check if already connected (readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Load and validate configuration (US1 - T012)
  let config;
  try {
    const fullConfig = loadDatabaseConfig();
    config = fullConfig.mongodb;
  } catch (err) {
    const message = sanitizeErrorMessage(err);
    console.error(`[MongoDB] Configuration error: ${message}`);
    const error = new Error(`Database configuration validation failed: ${message}`);
    error.code = ERROR_CODES.CONFIG_VALIDATION_ERROR;
    throw error;
  }

  // If connecting, wait for the existing promise
  if (mongoose.connection.readyState === 2 && cached.promise) {
    try {
      cached.conn = await cached.promise;
      // Wait for connection to be fully ready
      if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve) => {
          if (mongoose.connection.readyState === 1) {
            resolve();
          } else {
            mongoose.connection.once('connected', resolve);
          }
        });
      }
      return mongoose.connection;
    } catch (e) {
      cached.promise = null;
      throw e;
    }
  }

  // Create new connection promise if not already creating one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: config.maxPoolSize,
      serverSelectionTimeoutMS: config.serverSelectionTimeoutMs,
      socketTimeoutMS: config.socketTimeoutMs,
    };

    const sanitizedUri = sanitizeConnectionString(config.connectionString);
    console.info(`[MongoDB] Connecting to ${sanitizedUri}...`);

    setupEventLogging(mongoose.connection);

    cached.promise = mongoose
      .connect(config.connectionString, opts)
      .then(async (m) => {
        // Wait for connection to be fully established
        if (mongoose.connection.readyState !== 1) {
          await new Promise((resolve) => {
            if (mongoose.connection.readyState === 1) {
              resolve();
            } else {
              mongoose.connection.once('connected', resolve);
            }
          });
        }
        cached.lastError = null;
        return m.connection;
      })
      .catch((error) => {
        cached.promise = null;
        const sanitizedMsg = sanitizeErrorMessage(error);
        cached.lastError = sanitizedMsg;
        
        // Enhance error handling (US1 - T013)
        const dbError = new Error(`MongoDB connection failed: ${sanitizedMsg}`);
        if (error.message.includes('timeout')) {
          dbError.code = ERROR_CODES.MONGODB_TIMEOUT_ERROR;
        } else {
          dbError.code = ERROR_CODES.MONGODB_CONNECTION_ERROR;
        }
        throw dbError;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

/**
 * Checks the health of the MongoDB connection
 * @returns {Promise<object>} Health status object
 */
export async function getHealthStatus() {
  const startTime = Date.now();
  
  try {
    // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const state = mongoose.connection.readyState;
    let status = 'unhealthy';
    let message = 'Disconnected';
    let responseTimeMs = 0;

    if (state === 1) {
      // Ping the database if connected
      try {
        await mongoose.connection.db.admin().ping();
        status = 'healthy';
        message = 'Connected';
        responseTimeMs = Date.now() - startTime;
      } catch (pingErr) {
        status = 'unhealthy';
        const sanitizedPingErr = sanitizeErrorMessage(pingErr);
        message = `Ping failed: ${sanitizedPingErr}`;
        cached.lastError = sanitizedPingErr;
      }
    } else if (state === 2) {
      status = 'unhealthy'; // Or 'connecting' if schema allowed it, but schemas say 'healthy', 'unhealthy', 'unavailable'
      message = 'Connecting';
    }

    return {
      status,
      responseTimeMs,
      message,
      lastError: cached.lastError || null,
    };
  } catch (err) {
    const sanitizedErr = sanitizeErrorMessage(err);
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - startTime,
      message: sanitizedErr,
      lastError: sanitizedErr,
    };
  }
}
