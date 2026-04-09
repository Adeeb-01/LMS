/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { dbConnect } from '../../service/mongo';
import { ERROR_CODES } from '../../lib/errors';

// Note: This integration test requires a running MongoDB or mocks it.
// For the purpose of TDD, we want to see it fail if implementation is not ready.

describe('MongoDB Connection Integration Tests', () => {
  beforeAll(async () => {
    // If there's an existing connection, close it
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should successfully connect with valid environment variables', async () => {
    // This expects MONGODB_CONNECTION_STRING to be set in the test environment
    // For TDD purposes, if implementation is not yet updated to use Zod/Enhanced logging,
    // this test might still pass if the basic connection works, but we want to check for the new features.
    
    const conn = await dbConnect();
    expect(conn.readyState).toBe(1); // Connected
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('should have a getHealthStatus method on the mongo service', async () => {
    // Import the getHealthStatus function
    const { getHealthStatus } = require('../../service/mongo');
    
    const health = await getHealthStatus();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('responseTimeMs');
    expect(health).toHaveProperty('message');
    expect(health).toHaveProperty('lastError');
  });

  it('should return healthy status when connected', async () => {
    const { getHealthStatus } = require('../../service/mongo');
    
    // Ensure connected first
    await dbConnect();
    
    const health = await getHealthStatus();
    expect(health.status).toBe('healthy');
    expect(health.message).toBe('Connected');
    expect(health.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  describe('Secure Error Logging', () => {
    it('should not contain credentials in error messages', async () => {
      const { sanitizeConnectionString } = require('../../lib/db/config');
      const secretConnStr = 'mongodb://admin:topSecret123@localhost:27017/db';
      
      try {
        // We simulate a failure that might include the connection string
        throw new Error(`Failed to connect to ${secretConnStr}`);
      } catch (err) {
        const message = err.message;
        const sanitized = message.replace(secretConnStr, sanitizeConnectionString(secretConnStr));
        
        expect(message).toContain('admin');
        expect(message).toContain('topSecret123');
        expect(sanitized).not.toContain('topSecret123');
        expect(sanitized).toContain('****');
      }
    });

    it('should sanitize error objects using sanitizeErrorMessage from lib/errors', () => {
      const { sanitizeErrorMessage } = require('../../lib/errors');
      const secretConnStr = 'mongodb://admin:topSecret123@localhost:27017/db';
      const error = new Error(`Connection failed: ${secretConnStr}`);
      
      const sanitized = sanitizeErrorMessage(error);
      expect(sanitized).not.toContain('topSecret123');
    });
  });
});
