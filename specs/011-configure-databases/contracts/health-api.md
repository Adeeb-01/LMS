# API Contract: Health Check Endpoint

**Feature**: 011-configure-databases  
**Date**: 2026-03-11  
**Version**: 1.0.0

## Overview

Public health check endpoint for monitoring database connectivity status. Used by load balancers, container orchestrators, and monitoring systems.

---

## Endpoint

### GET /api/health

Returns the health status of all configured database services.

**Authentication**: None required (public endpoint)  
**Rate Limit**: 60 requests per minute per IP

---

## Request

**Method**: `GET`  
**URL**: `/api/health`  
**Headers**: None required

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `detailed` | boolean | No | `false` | Include detailed timing information |

---

## Response

### Success Response (200 OK)

**Content-Type**: `application/json`

```json
{
  "status": "healthy",
  "timestamp": "2026-03-11T10:30:00.000Z",
  "responseTimeMs": 45,
  "services": {
    "mongodb": {
      "status": "healthy",
      "responseTimeMs": 12,
      "message": "Connected to MongoDB"
    },
    "chroma": {
      "status": "healthy",
      "responseTimeMs": 28,
      "message": "Connected to ChromaDB"
    }
  }
}
```

### Degraded Response (200 OK)

When ChromaDB is unavailable but MongoDB is healthy:

```json
{
  "status": "degraded",
  "timestamp": "2026-03-11T10:30:00.000Z",
  "responseTimeMs": 5015,
  "services": {
    "mongodb": {
      "status": "healthy",
      "responseTimeMs": 15,
      "message": "Connected to MongoDB"
    },
    "chroma": {
      "status": "unavailable",
      "responseTimeMs": 5000,
      "message": "ChromaDB connection timeout",
      "lastError": "ETIMEDOUT"
    }
  }
}
```

### Unhealthy Response (503 Service Unavailable)

When MongoDB is unavailable:

```json
{
  "status": "unhealthy",
  "timestamp": "2026-03-11T10:30:00.000Z",
  "responseTimeMs": 5023,
  "services": {
    "mongodb": {
      "status": "unhealthy",
      "responseTimeMs": 5000,
      "message": "Cannot connect to MongoDB",
      "lastError": "MongoNetworkError: connection refused"
    },
    "chroma": {
      "status": "unavailable",
      "responseTimeMs": 18,
      "message": "ChromaDB check skipped (MongoDB unhealthy)"
    }
  }
}
```

---

## Response Schema

```javascript
// Zod schema for response validation
const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  responseTimeMs: z.number().nonnegative(),
  services: z.object({
    mongodb: z.object({
      status: z.enum(['healthy', 'unhealthy']),
      responseTimeMs: z.number().nonnegative(),
      message: z.string(),
      lastError: z.string().optional(),
    }),
    chroma: z.object({
      status: z.enum(['healthy', 'unhealthy', 'unavailable']),
      responseTimeMs: z.number().nonnegative(),
      message: z.string(),
      lastError: z.string().optional(),
    }),
  }),
});
```

---

## Status Codes

| Code | Status | Condition |
|------|--------|-----------|
| 200 | OK | All services healthy, or ChromaDB degraded |
| 429 | Too Many Requests | Rate limit exceeded |
| 503 | Service Unavailable | MongoDB unhealthy |

---

## Status Definitions

### Overall Status

| Status | Meaning | HTTP Code |
|--------|---------|-----------|
| `healthy` | All configured services operational | 200 |
| `degraded` | Core services operational, optional services down | 200 |
| `unhealthy` | Core services (MongoDB) unavailable | 503 |

### Service Status

| Status | Meaning |
|--------|---------|
| `healthy` | Service connected and responding |
| `unhealthy` | Service configured but not responding |
| `unavailable` | Service not configured or check skipped |

---

## Caching

- Health status is cached for `DB_HEALTH_INTERVAL_MS` (default: 30000ms)
- Cache is invalidated on detected connection failures
- `responseTimeMs` reflects cached vs fresh check

---

## Examples

### cURL

```bash
# Basic health check
curl -X GET http://localhost:3000/api/health

# Detailed health check
curl -X GET "http://localhost:3000/api/health?detailed=true"
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 1
```

### Docker Compose

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

---

## Error Handling

| Error | Response | Action |
|-------|----------|--------|
| Rate limited | 429 with `Retry-After` header | Client should backoff |
| Internal error | 500 with error message | Check server logs |
| Timeout | 504 | Increase timeout or check network |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-11 | Initial contract |
