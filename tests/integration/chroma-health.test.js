/**
 * @jest-environment node
 */
import { getHealthStatus, getCollection } from '../../service/chroma';

// Mocking ChromaDB client to test connection scenarios
// In a real environment, this would hit a running Chroma instance
jest.mock('chromadb', () => {
  return {
    ChromaClient: jest.fn().mockImplementation(() => {
      return {
        heartbeat: jest.fn().mockResolvedValue(123456789),
        getOrCreateCollection: jest.fn().mockResolvedValue({ name: 'lms_embeddings' }),
      };
    }),
  };
});

describe('ChromaDB Connection Integration Tests', () => {
  it('should have a getHealthStatus method on the chroma service', async () => {
    const health = await getHealthStatus();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('responseTimeMs');
    expect(health).toHaveProperty('message');
    expect(health).toHaveProperty('lastError');
  });

  it('should return healthy status when heartbeats are successful', async () => {
    const health = await getHealthStatus();
    expect(health.status).toBe('healthy');
    expect(health.message).toBe('Connected');
  });

  it('should return a collection when getCollection is called', async () => {
    const collection = await getCollection();
    expect(collection).toBeDefined();
    expect(collection.name).toBe('lms_embeddings');
  });
});
