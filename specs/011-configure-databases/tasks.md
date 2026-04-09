# Tasks: Configure Database Infrastructure

**Input**: Design documents from `/specs/011-configure-databases/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Services**: `service/` at repository root
- **Library utilities**: `lib/` at repository root
- **API routes**: `app/api/` (Next.js App Router)
- **Tests**: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create directory structure

- [X] T001 Install chromadb npm package via `npm install chromadb`
- [X] T002 [P] Create lib/db/ directory for database utilities
- [X] T003 [P] Create tests/unit/ directory if not exists
- [X] T004 [P] Create tests/integration/ directory if not exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schemas and utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create database configuration Zod schemas in lib/db/config.js per data-model.md (mongoConfigSchema, chromaConfigSchema, databaseConfigSchema)
- [X] T006 Create health status Zod schemas in lib/db/config.js per data-model.md (serviceHealthSchema, healthStatusSchema)
- [X] T007 [P] Add database-specific error codes to lib/errors.js (MONGODB_CONNECTION_ERROR, MONGODB_TIMEOUT_ERROR, CHROMA_CONNECTION_ERROR, CHROMA_UNAVAILABLE, CONFIG_VALIDATION_ERROR)
- [X] T008 Create configuration loader that reads from environment variables in lib/db/config.js (loadDatabaseConfig function)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Configure MongoDB Connection (Priority: P1) 🎯 MVP

**Goal**: Configure MongoDB database connection with validation, connection pooling, and automatic reconnection

**Independent Test**: Verify MongoDB connects successfully with valid credentials and returns clear error for invalid credentials

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Unit test for MongoDB config validation in tests/unit/db-config.test.js (valid config passes, invalid config fails with specific errors)
- [X] T010 [P] [US1] Integration test for MongoDB connection in tests/integration/mongo-health.test.js (connection success, connection failure handling, reconnection logic)

### Implementation for User Story 1

- [X] T011 [US1] Enhance service/mongo.js with getHealthStatus() method that returns connection status and response time
- [X] T012 [US1] Add configuration validation to service/mongo.js using Zod schemas from lib/db/config.js
- [X] T013 [US1] Implement enhanced error handling in service/mongo.js with error codes from lib/errors.js
- [X] T014 [US1] Add connection event logging to service/mongo.js (connected, disconnected, reconnecting) without exposing credentials

**Checkpoint**: MongoDB connection fully configured with health check capability, testable independently

---

## Phase 4: User Story 2 - Configure ChromaDB Vector Database (Priority: P2)

**Goal**: Configure ChromaDB connection with graceful degradation when unavailable

**Independent Test**: Verify ChromaDB connects when available, and system continues working (with warning) when ChromaDB is unavailable

### Tests for User Story 2 ⚠️

- [X] T015 [P] [US2] Unit test for ChromaDB config validation in tests/unit/db-config.test.js (valid config passes, optional config handling, default values)
- [X] T016 [P] [US2] Integration test for ChromaDB connection in tests/integration/chroma-health.test.js (connection success, graceful degradation when unavailable)

### Implementation for User Story 2

- [X] T017 [US2] Create service/chroma.js with ChromaDB client initialization using chromadb package
- [X] T018 [US2] Implement getHealthStatus() method in service/chroma.js that returns connection status
- [X] T019 [US2] Add graceful degradation logic in service/chroma.js (isAvailable flag, connection retry with backoff)
- [X] T020 [US2] Implement collection auto-creation in service/chroma.js if collection doesn't exist
- [X] T021 [US2] Add connection event logging to service/chroma.js without exposing configuration details

**Checkpoint**: ChromaDB connection configured with graceful degradation, testable independently

---

## Phase 5: User Story 3 - Secure Database Credentials Management (Priority: P3)

**Goal**: Ensure database credentials are never exposed in logs, errors, or responses

**Independent Test**: Verify credentials do not appear in any log output, error messages, or API responses when connection fails

### Tests for User Story 3 ⚠️

- [X] T022 [P] [US3] Unit test for credential sanitization in tests/unit/db-config.test.js (connection strings sanitized, passwords masked)
- [X] T023 [P] [US3] Integration test for secure error logging in tests/integration/mongo-health.test.js (error messages contain no credentials)

### Implementation for User Story 3

- [X] T024 [US3] Create sanitizeConnectionString() utility in lib/db/config.js that masks passwords in connection strings
- [X] T025 [US3] Update service/mongo.js to use sanitized connection strings in all log messages
- [X] T026 [US3] Update service/chroma.js to use sanitized host URLs in all log messages
- [X] T027 [US3] Add environment variable validation at startup in lib/db/config.js (fail fast if MONGODB_CONNECTION_STRING missing)

**Checkpoint**: Credential security verified, no sensitive data in logs

---

## Phase 6: User Story 4 - Database Health Monitoring (Priority: P4)

**Goal**: Provide health check endpoint for monitoring database connectivity status

**Independent Test**: Call GET /api/health and verify it returns correct status for all database services

### Tests for User Story 4 ⚠️

- [X] T028 [P] [US4] Contract test for /api/health endpoint in tests/integration/health-api.test.js per contracts/health-api.md (response schema validation, status codes)
- [X] T029 [P] [US4] Integration test for health endpoint scenarios in tests/integration/health-api.test.js (healthy, degraded, unhealthy states)

### Implementation for User Story 4

- [X] T030 [US4] Create lib/db/health.js with checkAllServices() function that aggregates health from MongoDB and ChromaDB
- [X] T031 [US4] Implement health status caching in lib/db/health.js with configurable interval (DB_HEALTH_INTERVAL_MS)
- [X] T032 [US4] Create app/api/health/route.js with GET handler per contracts/health-api.md
- [X] T033 [US4] Implement overall status logic in lib/db/health.js (healthy/degraded/unhealthy based on service states)
- [X] T034 [US4] Add response time measurement in lib/db/health.js for each service check

**Checkpoint**: Health monitoring fully functional, all acceptance scenarios pass

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation

- [X] T035 [P] Update README.md Quick Start section with new environment variables (CHROMA_HOST, CHROMA_COLLECTION, DB_HEALTH_INTERVAL_MS)
- [X] T036 [P] Add inline JSDoc comments to lib/db/config.js documenting all configuration options
- [X] T037 [P] Add inline JSDoc comments to service/chroma.js documenting public API
- [X] T038 Run all tests via `npm test` and verify 100% pass rate
- [X] T039 Validate quickstart.md by following setup instructions on fresh environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - US1 (MongoDB) can start immediately after Foundational
  - US2 (ChromaDB) can start after US1 or in parallel
  - US3 (Security) depends on US1 and US2 being implemented
  - US4 (Health) depends on US1 and US2 health methods
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
        │
        ▼
┌───────────────────┐
│ US1: MongoDB (P1) │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ US2: ChromaDB(P2) │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ US3: Security(P3) │ (depends on US1 + US2)
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ US4: Health (P4)  │
└───────────────────┘
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Config/schemas before services
- Services before API endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003, T004 can run in parallel

**Phase 2 (Foundational)**:
- T007 can run in parallel with T005/T006 (different file)

**Phase 3 (US1)**:
- T009, T010 tests can run in parallel

**Phase 4 (US2)**:
- T015, T016 tests can run in parallel
- Can run in parallel with US1 if team capacity allows

**Phase 5 (US3)**:
- T022, T023 tests can run in parallel

**Phase 6 (US4)**:
- T028, T029 tests can run in parallel

**Phase 7 (Polish)**:
- T035, T036, T037 can run in parallel

---

## Parallel Example: Phase 2 Foundational

```bash
# Sequential first:
Task T005: "Create database configuration Zod schemas in lib/db/config.js"

# Then parallel:
Task T006: "Create health status Zod schemas in lib/db/config.js"
Task T007: "Add database-specific error codes to lib/errors.js"

# Then sequential:
Task T008: "Create configuration loader in lib/db/config.js"
```

---

## Parallel Example: User Story 1

```bash
# Launch tests in parallel:
Task T009: "Unit test for MongoDB config validation in tests/unit/db-config.test.js"
Task T010: "Integration test for MongoDB connection in tests/integration/mongo-health.test.js"

# Then sequential implementation:
Task T011: "Enhance service/mongo.js with getHealthStatus() method"
Task T012: "Add configuration validation to service/mongo.js"
Task T013: "Implement enhanced error handling in service/mongo.js"
Task T014: "Add connection event logging to service/mongo.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (MongoDB)
4. **STOP and VALIDATE**: Test MongoDB connection independently
5. Deploy/demo if ready - system works with existing MongoDB functionality

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (MongoDB) → Test independently → **MVP Ready!**
3. Add User Story 2 (ChromaDB) → Test independently → Semantic features enabled
4. Add User Story 3 (Security) → Test independently → Production-ready security
5. Add User Story 4 (Health) → Test independently → Full monitoring capability
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MongoDB)
   - Developer B: User Story 2 (ChromaDB) - can start after T005-T008
3. After US1 + US2 complete:
   - Developer A: User Story 3 (Security)
   - Developer B: User Story 4 (Health)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing `service/mongo.js` is enhanced, not replaced
- ChromaDB is optional - system works without it (graceful degradation)
