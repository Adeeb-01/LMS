import { mongoConfigSchema, databaseConfigSchema, sanitizeConnectionString } from '../../lib/db/config';

describe('Database Configuration Unit Tests', () => {
  describe('mongoConfigSchema', () => {
    it('should validate a valid MongoDB connection string', () => {
      const validConfig = {
        connectionString: 'mongodb://localhost:27017/testdb',
        maxPoolSize: 20,
        serverSelectionTimeoutMs: 3000,
        socketTimeoutMs: 30000,
      };
      const result = mongoConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should fail if connectionString is missing', () => {
      const invalidConfig = {
        maxPoolSize: 10,
      };
      const result = mongoConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error.errors[0].path).toContain('connectionString');
    });

    it('should use default values for optional fields', () => {
      const minimalConfig = {
        connectionString: 'mongodb://localhost:27017/testdb',
      };
      const result = mongoConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      expect(result.data.maxPoolSize).toBe(10);
      expect(result.data.serverSelectionTimeoutMs).toBe(5000);
      expect(result.data.socketTimeoutMs).toBe(45000);
    });

    it('should fail if values are out of bounds', () => {
      const invalidConfig = {
        connectionString: 'mongodb://localhost:27017/testdb',
        maxPoolSize: 200, // max 100
      };
      const result = mongoConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('sanitizeConnectionString', () => {
    it('should mask password in a standard connection string', () => {
      const connStr = 'mongodb://user:secretPassword@localhost:27017/db';
      const sanitized = sanitizeConnectionString(connStr);
      expect(sanitized).toBe('mongodb://user:****@localhost:27017/db');
    });

    it('should mask password in a SRV connection string', () => {
      const connStr = 'mongodb+srv://admin:pass123@cluster0.abc.mongodb.net/test';
      const sanitized = sanitizeConnectionString(connStr);
      expect(sanitized).toBe('mongodb+srv://admin:****@cluster0.abc.mongodb.net/test');
    });

    it('should handle strings without passwords gracefully', () => {
      const connStr = 'mongodb://localhost:27017/db';
      const sanitized = sanitizeConnectionString(connStr);
      // If regex doesn't match, it returns the original or handles it
      // Based on my implementation: it only replaces if it matches the pattern
      expect(sanitized).toBe(connStr);
    });

    it('should return empty string for null/undefined', () => {
      expect(sanitizeConnectionString(null)).toBe('');
      expect(sanitizeConnectionString(undefined)).toBe('');
    });
  });

  describe('chromaConfigSchema', () => {
    const { chromaConfigSchema } = require('../../lib/db/config');

    it('should validate a valid ChromaDB configuration', () => {
      const validConfig = {
        host: 'http://chroma:8000',
        collection: 'test_collection',
        timeout: 5000,
      };
      const result = chromaConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should use default values for optional ChromaDB fields', () => {
      const minimalConfig = {};
      const result = chromaConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      expect(result.data.host).toBe('http://localhost:8000');
      expect(result.data.collection).toBe('lms_embeddings');
      expect(result.data.timeout).toBe(5000);
    });

    it('should fail for invalid host URL', () => {
      const invalidConfig = {
        host: 'not-a-url',
      };
      const result = chromaConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should fail for invalid collection name format', () => {
      const invalidConfig = {
        collection: 'invalid-name!',
      };
      const result = chromaConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
});
