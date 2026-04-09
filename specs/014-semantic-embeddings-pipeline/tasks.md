# Tasks: Semantic Embeddings Pipeline

**Input**: Design documents from `/specs/014-semantic-embeddings-pipeline/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/semantic-search-api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create directory structure

- [X] T001 Install @google/generative-ai package via `npm install @google/generative-ai`
- [X] T002 [P] Create lib/embeddings/ directory structure
- [X] T003 [P] Add GEMINI_API_KEY to .env.example with documentation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create Gemini embedding service in lib/embeddings/gemini.js with generateEmbedding() and generateBatchEmbeddings() functions
- [X] T005 [P] Create heading-aware text chunker in lib/embeddings/chunker.js with chunkByHeadings() function that parses structuredContent
- [X] T006 [P] Create IndexingJob Mongoose model in model/indexing-job.model.js per data-model.md schema
- [X] T007 [P] Extend LectureDocument model in model/lecture-document.model.js with embeddingStatus, embeddingJobId, chunksIndexed, lastIndexedAt fields
- [X] T008 [P] Add semantic search Zod schemas (semanticSearchQuerySchema, searchResultSchema, searchResponseSchema, triggerIndexingSchema) to lib/validations.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Automatic Content Indexing (Priority: P1) 🎯 MVP

**Goal**: When a teacher uploads a lecture document, the system automatically chunks it by headings, generates Gemini embeddings, and stores them in ChromaDB.

**Independent Test**: Upload a lecture document with multiple headings and verify chunks appear in ChromaDB with correct metadata (courseId, lessonId, headingPath).

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Create unit test for heading chunker in tests/unit/heading-chunker.test.js
- [X] T010 [P] [US1] Create integration test for embedding pipeline in tests/integration/embedding-pipeline.test.js

### Implementation for User Story 1

- [X] T011 [US1] Create embedding queue service in service/embedding-queue.js with job processing (max 5 concurrent), retry logic, and cancellation support
- [X] T012 [US1] Enhance service/chroma.js with addEmbeddings(), removeEmbeddingsByDocument(), and queryEmbeddings() functions for semantic chunks
- [X] T013 [US1] Create indexing Server Actions in app/actions/indexing.js with triggerIndexing() and cancelIndexing() functions per contracts
- [X] T014 [US1] Integrate embedding pipeline trigger into existing lecture document upload flow in app/actions/lecture-document.js
- [X] T015 [US1] Implement job processor logic: fetch pending jobs, chunk document, generate embeddings via Gemini, store in ChromaDB, update status
- [X] T016 [US1] Handle document re-upload: cancel in-progress job, remove old embeddings, create new job per clarification decision
- [X] T017 [US1] Implement cascade delete: remove embeddings when LectureDocument or Lesson is deleted

**Checkpoint**: User Story 1 complete - documents are automatically indexed when uploaded, re-indexed on re-upload

---

## Phase 4: User Story 2 - Student Semantic Search (Priority: P2)

**Goal**: Students can ask natural language questions and receive relevant chunks from indexed content, scoped to courses they are enrolled in.

**Independent Test**: Query indexed content with various phrasings, verify top results are relevant and include heading context and lesson info. Verify non-enrolled students cannot search.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US2] Create unit test for Gemini embedding service in tests/unit/gemini-embeddings.test.js (mock API calls)
- [X] T019 [P] [US2] Create integration test for semantic search in tests/integration/semantic-search.test.js

### Implementation for User Story 2

- [X] T020 [US2] Create semantic search service in service/semantic-search.js with searchCourse() function including enrollment verification
- [X] T021 [US2] Create search API endpoint in app/api/semantic-search/route.js (POST) per contracts/semantic-search-api.md
- [X] T022 [US2] Create searchCourseContent Server Action in app/actions/semantic-search.js with enrollment check
- [X] T023 [US2] Implement query embedding generation using lib/embeddings/gemini.js
- [X] T024 [US2] Implement result filtering: 0.7 threshold, max 5 results, enrich with lesson titles from MongoDB
- [X] T025 [US2] Create course search UI component in app/[locale]/(main)/courses/[id]/_components/course-search.jsx using shadcn/ui
- [X] T026 [US2] Integrate search component into course page for enrolled students
- [X] T027 [US2] Handle ChromaDB unavailable gracefully with user-friendly error message

**Checkpoint**: User Story 2 complete - students can search course content with natural language

---

## Phase 5: User Story 3 - Processing Status Visibility (Priority: P3)

**Goal**: Teachers can see indexing status (pending, processing, indexed, failed) with chunk counts and retry options.

**Independent Test**: Upload a document and observe status transitions in the UI. Verify failed status shows retry button.

### Implementation for User Story 3

- [X] T028 [US3] Create status API endpoint in app/api/semantic-search/status/route.js (GET) per contracts
- [X] T029 [US3] Create embedding status UI component in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/_components/embedding-status.jsx
- [X] T030 [US3] Implement status polling or real-time updates in status component
- [X] T031 [US3] Add retry button for failed status that calls triggerIndexing action
- [X] T032 [US3] Integrate status component into lesson management page in dashboard
- [X] T033 [US3] Add course-level status summary showing indexed/pending/failed counts

**Checkpoint**: User Story 3 complete - teachers have full visibility into indexing pipeline status

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and improvements that affect multiple user stories

- [X] T034 [P] Add i18n translation keys for search UI and status messages in messages/en.json and messages/ar.json
- [X] T035 [P] Run quickstart.md validation to verify setup instructions work
- [X] T036 Update README.md with semantic search feature documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 must complete before US2 (search needs indexed content)
  - US3 can run in parallel with US2 (independent UI)
- **Polish (Phase 6)**: Depends on user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **MVP**
- **User Story 2 (P2)**: Depends on US1 completion (needs indexed content to search)
- **User Story 3 (P3)**: Can start after Foundational - independent of US2, but better tested after US1

### Within Each User Story

- Services before actions
- Actions before API endpoints
- API endpoints before UI components
- Core implementation before integration points

### Parallel Opportunities

**Phase 2 (all can run in parallel):**
```
T004: Gemini embedding service
T005: Heading-aware chunker
T006: IndexingJob model
T007: LectureDocument extension
T008: Zod validation schemas
```

**Phase 3 - US1 Tests (can run in parallel):**
```
T009: Unit test - chunker
T010: Integration test - pipeline
```

**Phase 4 - US2 Tests (can run in parallel):**
```
T018: Unit test - embeddings
T019: Integration test - search
```

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all foundational tasks in parallel:
Task: "Create Gemini embedding service in lib/embeddings/gemini.js"
Task: "Create heading-aware chunker in lib/embeddings/chunker.js"
Task: "Create IndexingJob model in model/indexing-job.model.js"
Task: "Extend LectureDocument model with embedding fields"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) - **CRITICAL**
3. Complete Phase 3: User Story 1 (T009-T017) - Tests first, then implementation
4. **STOP and VALIDATE**: Upload documents, verify ChromaDB has embeddings
5. Deploy/demo indexing pipeline

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (tests → impl) → **MVP Ready!**
3. Add User Story 2 (tests → impl) → Students can query
4. Add User Story 3 → Teachers have visibility
5. Add Polish → Documentation complete

### Story Completion Order

```text
US1 (Indexing) ─────────────────────────┐
                                        ├──▶ US2 (Search)
                                        │
US3 (Status) ──────────────────────────┘
```

US3 can be developed in parallel with US2, but both depend on US1 for meaningful testing.

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- **TDD Approach**: Tests (T009-T010, T018-T019) written BEFORE implementation per Constitution VII
- US1 is the MVP - complete indexing pipeline delivers foundational value
- US2 depends on US1 having indexed content to search
- US3 is independent but provides operational value alongside US1/US2
- Verify Gemini API key works before starting T004
- ChromaDB must be running for integration tests
- Total tasks: 36 → 36 (tests moved to user story phases, not removed)
