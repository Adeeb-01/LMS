# Data Model: Configure Database Infrastructure

**Feature**: 011-configure-databases  
**Date**: 2026-03-11

## Overview

This feature primarily configures database connections rather than creating new data entities. The data model focuses on configuration schemas and health status structures.

## Configuration Entities

### DatabaseConfig

Represents validated database connection configuration.

**Purpose**: Store and validate database connection settings at application startup

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `mongodb.connectionString` | string | Yes | URI format | MongoDB connection URI |
| `mongodb.maxPoolSize` | number | No | 1-100, default: 10 | Maximum connection pool size |
| `mongodb.serverSelectionTimeoutMs` | number | No | 1000-30000, default: 5000 | Server selection timeout |
| `mongodb.socketTimeoutMs` | number | No | 10000-120000, default: 45000 | Socket timeout |
| `chroma.host` | string | No | URL format, default: `http://localhost:8000` | ChromaDB HTTP endpoint |
| `chroma.collection` | string | No | alphanumeric, default: `lms_embeddings` | Default collection name |
| `chroma.timeout` | number | No | 1000-30000, default: 5000 | Request timeout |
| `healthCheckIntervalMs` | number | No | 5000-300000, default: 30000 | Health status cache duration |

**Zod Schema**:

```javascript
const mongoConfigSchema = z.object({
  connectionString: z.string().min(1),
  maxPoolSize: z.number().min(1).max(100).default(10),
  serverSelectionTimeoutMs: z.number().min(1000).max(30000).default(5000),
  socketTimeoutMs: z.number().min(10000).max(120000).default(45000),
});

const chromaConfigSchema = z.object({
  host: z.string().url().default('http://localhost:8000'),
  collection: z.string().regex(/^[a-zA-Z0-9_]+$/).default('lms_embeddings'),
  timeout: z.number().min(1000).max(30000).default(5000),
});

const databaseConfigSchema = z.object({
  mongodb: mongoConfigSchema,
  chroma: chromaConfigSchema.optional(),
  healthCheckIntervalMs: z.number().min(5000).max(300000).default(30000),
});
```

---

### HealthStatus

Represents the current health state of database connections.

**Purpose**: Provide real-time status information for monitoring and graceful degradation

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | Overall status: `healthy`, `degraded`, `unhealthy` |
| `timestamp` | ISO8601 string | When health check was performed |
| `responseTimeMs` | number | Total health check duration |
| `services.mongodb` | ServiceHealth | MongoDB connection status |
| `services.chroma` | ServiceHealth | ChromaDB connection status |

**ServiceHealth Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | `healthy`, `unhealthy`, `unavailable` |
| `responseTimeMs` | number | Connection check duration |
| `message` | string | Human-readable status message |
| `lastError` | string | null | Last error message if unhealthy |

**Zod Schema**:

```javascript
const serviceHealthSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'unavailable']),
  responseTimeMs: z.number(),
  message: z.string(),
  lastError: z.string().nullable(),
});

const healthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  responseTimeMs: z.number(),
  services: z.object({
    mongodb: serviceHealthSchema,
    chroma: serviceHealthSchema,
  }),
});
```

**Status Logic**:
- `healthy`: All configured services are healthy
- `degraded`: MongoDB healthy, ChromaDB unhealthy/unavailable
- `unhealthy`: MongoDB unhealthy (core functionality impacted)

---

## Existing Entities (Context)

These entities already exist in the system and will be stored in the configured databases:

### Student Profile (MongoDB)

Stored in: `users` collection  
Model: `model/user-model.js`

Relevant fields for this feature:
- User data persisted to MongoDB
- No schema changes required

### Question Bank (MongoDB)

Stored in: `questions` collection  
Model: `model/questionv2-model.js`

Relevant fields for this feature:
- Questions persisted to MongoDB
- Content field may be embedded in ChromaDB for semantic search

### Semantic Embedding (ChromaDB)

Stored in: `lms_embeddings` collection (new)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (matches MongoDB document ID) |
| `embedding` | float[] | Vector representation (dimension depends on model) |
| `metadata.type` | string | Entity type: `question`, `lesson`, etc. |
| `metadata.sourceId` | string | Reference to MongoDB document |
| `document` | string | Original text content |

---

## State Transitions

### Connection State Machine

```
┌─────────────┐
│ Disconnected│
└──────┬──────┘
       │ connect()
       ▼
┌─────────────┐
│ Connecting  │
└──────┬──────┘
       │ success / failure
       ▼
┌─────────────┐     error      ┌─────────────┐
│  Connected  │ ◄────────────► │ Reconnecting│
└─────────────┘                └─────────────┘
       │
       │ disconnect()
       ▼
┌─────────────┐
│ Disconnected│
└─────────────┘
```

### Health Status Transitions

- **healthy → degraded**: ChromaDB becomes unavailable
- **degraded → healthy**: ChromaDB reconnects successfully  
- **healthy → unhealthy**: MongoDB becomes unavailable
- **unhealthy → healthy**: MongoDB reconnects successfully
- **degraded → unhealthy**: MongoDB fails while ChromaDB already down

---

## Relationships

```
DatabaseConfig (1) ──────> (1) MongoDB Connection
                 └──────> (0..1) ChromaDB Connection

HealthStatus ──────> ServiceHealth (MongoDB)
            └──────> ServiceHealth (ChromaDB)

Question (MongoDB) ──────> Embedding (ChromaDB)
  via sourceId reference
```

---

## Validation Rules

1. **MongoDB connection string**: Must be valid URI, required for application startup
2. **ChromaDB host**: Must be valid URL if provided, optional (graceful degradation)
3. **Timeouts**: Must be positive integers within reasonable bounds
4. **Collection names**: Alphanumeric with underscores only
5. **Pool sizes**: Positive integers, max 100 to prevent resource exhaustion
