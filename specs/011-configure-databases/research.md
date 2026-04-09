# Research: Configure Database Infrastructure

**Feature**: 011-configure-databases  
**Date**: 2026-03-11

## Research Tasks

### 1. ChromaDB Integration with Next.js

**Decision**: Use `chromadb` npm package with HTTP client mode

**Rationale**:
- ChromaDB provides official JavaScript/TypeScript client
- HTTP client mode allows ChromaDB to run as separate service (better for production)
- Aligns with existing architecture pattern (MongoDB runs externally)
- Supports both local development and production deployments

**Alternatives Considered**:
- **Embedded mode**: Rejected - not suitable for serverless/edge deployments, causes memory issues
- **Direct Python interop**: Rejected - adds unnecessary complexity, breaks Node.js-only stack
- **Pinecone/Weaviate**: Rejected - ChromaDB specified in requirements, simpler self-hosted option

### 2. MongoDB Connection Enhancement

**Decision**: Enhance existing `service/mongo.js` with health check capabilities and improved error handling

**Rationale**:
- Existing connection pooling (maxPoolSize: 10) is well-configured
- Current implementation already handles reconnection scenarios
- Only needs health check method and standardized error codes

**Alternatives Considered**:
- **Complete rewrite**: Rejected - existing implementation follows best practices
- **Mongoose plugins**: Rejected - adds dependency for simple health check functionality

### 3. Credential Security Pattern

**Decision**: Environment variables with Zod validation at startup

**Rationale**:
- Follows existing project pattern (`process.env.MONGODB_CONNECTION_STRING`)
- Zod validation catches configuration errors early (fail-fast)
- Environment variables are standard for containerized deployments
- No credential storage in database or files

**Alternatives Considered**:
- **HashiCorp Vault**: Rejected - overkill for current scale, adds operational complexity
- **AWS Secrets Manager**: Rejected - locks to AWS, adds latency on startup
- **Encrypted config files**: Rejected - key management adds complexity

### 4. Health Check Implementation

**Decision**: Single `/api/health` endpoint returning JSON with component status

**Rationale**:
- Standard pattern for containerized applications
- Kubernetes/Docker health probes expect HTTP endpoint
- JSON format allows detailed status per component
- Easy to extend for future services

**Alternatives Considered**:
- **Separate endpoints per database**: Rejected - increases API surface, complicates monitoring
- **WebSocket health stream**: Rejected - overkill for polling-based health checks

### 5. Graceful Degradation Strategy

**Decision**: Feature flags based on connection status, logged warnings, no exceptions for optional services

**Rationale**:
- ChromaDB is optional (semantic features), core LMS works without it
- Connection status cached and refreshed periodically (not on every request)
- Clear logging helps administrators identify issues
- Application continues serving requests during outages

**Alternatives Considered**:
- **Circuit breaker pattern**: Rejected - adds complexity, simple status flag sufficient for two services
- **Automatic failover**: Rejected - no secondary ChromaDB instance planned

## Technical Specifications

### ChromaDB Client Configuration

```javascript
// Recommended configuration
{
  path: process.env.CHROMA_HOST || 'http://localhost:8000',
  fetchOptions: {
    timeout: 5000  // 5 second timeout
  }
}
```

### Environment Variables Required

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_CONNECTION_STRING` | Yes | - | MongoDB connection URI |
| `CHROMA_HOST` | No | `http://localhost:8000` | ChromaDB HTTP endpoint |
| `CHROMA_COLLECTION` | No | `lms_embeddings` | Default collection name |
| `DB_HEALTH_INTERVAL_MS` | No | `30000` | Health check cache interval |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MONGODB_CONNECTION_ERROR` | 503 | Cannot connect to MongoDB |
| `MONGODB_TIMEOUT_ERROR` | 504 | MongoDB operation timed out |
| `CHROMA_CONNECTION_ERROR` | 503 | Cannot connect to ChromaDB |
| `CHROMA_UNAVAILABLE` | 200 | ChromaDB offline (graceful degradation) |
| `CONFIG_VALIDATION_ERROR` | 500 | Invalid database configuration |

## Dependencies

### New Dependencies

```json
{
  "chromadb": "^1.8.1"
}
```

### Version Compatibility

- **chromadb**: Requires Node.js 18+, compatible with Next.js 15
- **mongoose**: Already at v8.8.2, no update needed

## Resolved Clarifications

All technical decisions made based on:
1. Existing codebase patterns
2. Constitution requirements (especially Principles II, III, V, IX)
3. Production deployment best practices

No outstanding clarifications remain.
