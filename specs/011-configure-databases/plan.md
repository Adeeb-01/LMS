# Implementation Plan: Configure Database Infrastructure

**Branch**: `011-configure-databases` | **Date**: 2026-03-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-configure-databases/spec.md`

## Summary

Configure MongoDB and ChromaDB database connections with secure credential management, connection pooling, automatic reconnection, health monitoring, and graceful degradation. MongoDB connection already exists in `service/mongo.js` and needs enhancement; ChromaDB is a new integration for semantic embeddings.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15  
**Primary Dependencies**: Mongoose 8 (existing), chromadb (new), Zod 3 (existing)  
**Storage**: MongoDB (existing), ChromaDB (new - vector database)  
**Testing**: Jest 30 (existing)  
**Target Platform**: Node.js server (Next.js App Router)  
**Project Type**: Web application (LMS)  
**Performance Goals**: Health checks respond within 2 seconds, 99.9% uptime  
**Constraints**: Zero credential exposure in logs, graceful degradation when ChromaDB unavailable  
**Scale/Scope**: Educational platform with student profiles, question banks, semantic embeddings

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ Pass | Health check endpoints will be public (read-only status); admin config routes require admin role |
| II. Server-Side Authority | ✅ Pass | All database configuration and health checks are server-side only (API routes/Server Actions) |
| III. Schema-Validated Data | ✅ Pass | Configuration validated with Zod schemas before use |
| IV. Component Modularity | ✅ Pass | Database services isolated in `service/` and `lib/` directories |
| V. Progressive Enhancement | ✅ Pass | P1 (MongoDB) works independently; P2 (ChromaDB) degrades gracefully |
| VI. Code Quality | ✅ Pass | Clear separation of concerns, documented configuration options |
| VII. Rigorous Testing | ✅ Pass | Unit tests for config validation, integration tests for connections |
| VIII. UX Consistency | ✅ Pass | Health status displayed consistently in admin dashboard |
| IX. Performance Requirements | ✅ Pass | Connection pooling, configurable timeouts, async operations |

**Pre-Design Gate Status**: ✅ PASSED

### Post-Design Re-Check

| Principle | Status | Verification |
|-----------|--------|--------------|
| I. Role-Based Security | ✅ Pass | `/api/health` is public read-only, no sensitive data exposed |
| II. Server-Side Authority | ✅ Pass | All config/health logic in `service/`, `lib/db/`, `app/api/` |
| III. Schema-Validated Data | ✅ Pass | Zod schemas defined in `data-model.md` for all config entities |
| IV. Component Modularity | ✅ Pass | Clear separation: `service/mongo.js`, `service/chroma.js`, `lib/db/` |
| V. Progressive Enhancement | ✅ Pass | ChromaDB optional, graceful degradation documented in contracts |
| VI. Code Quality | ✅ Pass | Single-responsibility services, documented in research.md |
| VII. Rigorous Testing | ✅ Pass | Test plan: unit tests for config, integration for health checks |
| VIII. UX Consistency | ✅ Pass | Health API follows standard JSON format, admin dashboard integration planned |
| IX. Performance Requirements | ✅ Pass | Cached health checks (30s), connection pooling, async operations |

**Post-Design Gate Status**: ✅ PASSED - Design complies with all nine principles

## Project Structure

### Documentation (this feature)

```text
specs/011-configure-databases/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── health-api.md    # Health check API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
service/
├── mongo.js             # Existing MongoDB connection (enhance)
└── chroma.js            # New ChromaDB connection service

lib/
├── db/
│   ├── config.js        # Database configuration with Zod validation
│   └── health.js        # Health check utilities
└── errors.js            # Existing (add database-specific errors)

app/api/
└── health/
    └── route.js         # Health check API endpoint

tests/
├── unit/
│   └── db-config.test.js
└── integration/
    ├── mongo-health.test.js
    └── chroma-health.test.js
```

**Structure Decision**: Follows existing Next.js App Router structure with services in `service/`, utilities in `lib/`, and API routes in `app/api/`. Database configuration centralized in new `lib/db/` directory.

## Complexity Tracking

> No Constitution violations requiring justification. Design follows existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
