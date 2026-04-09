/**
 * @jest-environment node
 */
import { GET } from '../../app/api/health/route';
import * as mongoService from '../../service/mongo';
import * as chromaService from '../../service/chroma';
import { invalidateCache } from '../../lib/db/health';

// Mock the services
jest.mock('../../service/mongo');
jest.mock('../../service/chroma');
jest.mock('../../lib/db/config', () => ({
  loadDatabaseConfig: jest.fn().mockReturnValue({
    healthCheckIntervalMs: 1000,
  }),
}));

describe('Health API Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateCache();
  });

  it('should return 200 and healthy status when all services are healthy', async () => {
    mongoService.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      responseTimeMs: 10,
      message: 'Connected',
      lastError: null,
    });
    chromaService.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      responseTimeMs: 20,
      message: 'Connected',
      lastError: null,
    });

    const response = await GET(new Request('http://localhost/api/health'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.services.mongodb.status).toBe('healthy');
    expect(data.services.chroma.status).toBe('healthy');
  });

  it('should return 200 and degraded status when ChromaDB is unhealthy', async () => {
    mongoService.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      responseTimeMs: 10,
      message: 'Connected',
      lastError: null,
    });
    chromaService.getHealthStatus.mockResolvedValue({
      status: 'unhealthy',
      responseTimeMs: 5000,
      message: 'Connection failed',
      lastError: 'ETIMEDOUT',
    });

    const response = await GET(new Request('http://localhost/api/health'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('degraded');
    expect(data.services.mongodb.status).toBe('healthy');
    expect(data.services.chroma.status).toBe('unhealthy');
  });

  it('should return 503 and unhealthy status when MongoDB is unhealthy', async () => {
    mongoService.getHealthStatus.mockResolvedValue({
      status: 'unhealthy',
      responseTimeMs: 5000,
      message: 'Cannot connect',
      lastError: 'MongoNetworkError',
    });
    chromaService.getHealthStatus.mockResolvedValue({
      status: 'unavailable',
      responseTimeMs: 0,
      message: 'Skipped',
      lastError: null,
    });

    const response = await GET(new Request('http://localhost/api/health'));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.services.mongodb.status).toBe('unhealthy');
  });
});
