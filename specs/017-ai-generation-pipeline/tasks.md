# Tasks: AI Generation & Vectorization Pipeline (Epic 1)

**Input**: Design documents from `specs/017-ai-generation-pipeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pipeline-api.md

**Tests**: Tests are MANDATORY per Constitution Principle VII. Write tests first, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and new file scaffolding

- [X] T001 Create directory structure for lib/oral-generation/ with __init__.js
- [X] T002 [P] Create directory structure for components/pipeline/
- [X] T003 [P] Create directory structure for app/api/pipeline/[lessonId]/status/
- [X] T004 [P] Create directory structure for app/api/oral-generation/[jobId]/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Models

- [X] T005 [P] Create PipelineJob model in model/pipeline-job.model.js per data-model.md schema
- [X] T006 [P] Create OralGenerationJob model in model/oral-generation-job.model.js per data-model.md schema
- [X] T007 Add referenceAnswer and oral generation fields (cognitiveLevel, oralGenerationJobId) to existing Question schema in model/questionv2-model.js per data-model.md

### Zod Validation Schemas

- [X] T008 Add triggerPipelineSchema to lib/validations.js per contracts/pipeline-api.md
- [X] T009 Add retryPipelineStageSchema to lib/validations.js
- [X] T010 Add triggerOralGenerationSchema to lib/validations.js
- [X] T011 Add referenceAnswerSchema and oralQuestionSchema to lib/validations.js

### i18n Strings

- [X] T012 [P] Add pipeline-related translation keys to messages/en.json (pipeline status, stage names, notifications)
- [X] T013 [P] Add pipeline-related translation keys to messages/ar.json

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 4 - Oral Question Generation (Priority: P4) 🎯 MVP

**Goal**: System automatically generates open-ended oral questions from lecture content with comprehensive reference answers

**Independent Test**: Trigger oral question generation for indexed content; verify questions are open-ended, reference answers capture key concepts, and questions link to source timestamps.

**Note**: Starting with US4 as it's the truly NEW capability. US1-3 are orchestration of existing features.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T014 [P] [US4] Unit test for oral question generator in __tests__/lib/oral-generation/generator.test.js
- [X] T015 [P] [US4] Unit test for oral duplicate detector in __tests__/lib/oral-generation/duplicate-detector.test.js
- [X] T016 [P] [US4] Contract test for POST /api/oral-generation in __tests__/api/oral-generation.test.js
- [X] T017 [P] [US4] Contract test for GET /api/oral-generation/[jobId] in __tests__/api/oral-generation-status.test.js

### Implementation for User Story 4

#### Core Generation Library

- [X] T018 [P] [US4] Implement Gemini prompt builder for oral questions in lib/oral-generation/generator.js
- [X] T019 [P] [US4] Implement reference answer builder in lib/oral-generation/reference-answer-builder.js
- [X] T020 [P] [US4] Implement oral question duplicate detector (0.90 threshold) in lib/oral-generation/duplicate-detector.js

#### Background Processing Service

- [X] T021 [US4] Implement oral generation queue processor in service/oral-generation-queue.js (mirror mcq-generation-queue.js pattern)
- [X] T022 [US4] Add 100-word minimum content filter to oral generation queue
- [X] T023 [US4] Add cognitive level estimation (application/analysis/synthesis/evaluation) to generator

#### Server Actions

- [X] T024 [US4] Implement triggerOralGeneration action in app/actions/oral-generation.js
- [X] T025 [US4] Add course owner authorization check to oral generation action
- [X] T025a [US4] Implement regenerateOralQuestionForChunk action for specific chunk regeneration in app/actions/oral-generation.js (FR-016)

#### API Routes

- [X] T026 [P] [US4] Implement POST /api/oral-generation/route.js (trigger endpoint)
- [X] T027 [P] [US4] Implement GET /api/oral-generation/[jobId]/route.js (status polling)

**Checkpoint**: Oral question generation should be fully functional and testable independently

---

## Phase 4: User Story 5 - End-to-End Pipeline Orchestration (Priority: P5)

**Goal**: Instructor uploads course materials once, system orchestrates entire pipeline automatically with progress dashboard and notifications

**Independent Test**: Upload a complete lecture package (video + document), monitor pipeline progress, verify all stages complete successfully with a final summary report.

### Tests for User Story 5 ⚠️

- [X] T028 [P] [US5] Unit test for pipeline orchestrator in __tests__/service/pipeline-orchestrator.test.js
- [X] T029 [P] [US5] Contract test for GET /api/pipeline/[lessonId]/status in __tests__/api/pipeline-status.test.js
- [X] T030 [P] [US5] Contract test for triggerPipeline action in __tests__/actions/pipeline.test.js

### Implementation for User Story 5

#### Pipeline Orchestration Service

- [X] T031 [US5] Implement pipeline orchestrator in service/pipeline-orchestrator.js
- [X] T032 [US5] Add stage transition logic (extraction → alignment → indexing → generation) to orchestrator
- [X] T033 [US5] Add parallel MCQ + Oral generation trigger after indexing completes
- [X] T034 [US5] Add concurrency control (max 5 pipelines system-wide) to orchestrator
- [X] T035 [US5] Add pipeline cancellation logic for re-upload scenarios

#### Server Actions

- [X] T036 [US5] Implement triggerPipeline action in app/actions/pipeline.js
- [X] T037 [US5] Implement retryPipelineStage action in app/actions/pipeline.js
- [X] T038 [US5] Implement getPipelineStatus action in app/actions/pipeline.js
- [X] T039 [US5] Add course owner authorization check to all pipeline actions

#### API Routes

- [X] T040 [US5] Implement GET /api/pipeline/[lessonId]/status/route.js (unified status endpoint)

#### Notifications

- [X] T041 [US5] Implement pipeline completion notification (in-app toast + bell) in service/pipeline-orchestrator.js
- [X] T042 [US5] Create notification record in MongoDB on pipeline completion

#### UI Components

- [X] T043 [P] [US5] Create StageIndicator component in components/pipeline/stage-indicator.jsx
- [X] T044 [P] [US5] Create ProgressSummary component in components/pipeline/progress-summary.jsx
- [X] T045 [P] [US5] Create RetryButton component in components/pipeline/retry-button.jsx

#### Dashboard Page

- [X] T046 [US5] Create PipelineDashboard component in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/pipeline/_components/pipeline-dashboard.jsx
- [X] T047 [US5] Create pipeline dashboard page in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/pipeline/page.jsx
- [X] T048 [US5] Add polling logic for real-time status updates in pipeline dashboard
- [X] T049 [US5] Add retry functionality to failed stages in dashboard
- [X] T049a [US5] Verify pipeline dashboard meets WCAG 2.1 AA accessibility (keyboard navigation, contrast ratios, screen reader labels) per Constitution VIII

**Checkpoint**: Full pipeline orchestration should be functional with dashboard visibility

---

## Phase 5: User Story 1 - Dual Input Upload and Synchronization (Priority: P1)

**Goal**: Instructor uploads Word document alongside lecture video; system extracts text and synchronizes with video timestamps

**Independent Test**: Upload a .docx file and video for a lesson, verify text extraction preserves all terminology exactly, verify each text block receives start/end timestamps from alignment process.

**Note**: This story primarily orchestrates existing 012/013 capabilities via the new pipeline.

### Implementation for User Story 1

- [X] T050 [US1] Integrate extraction stage trigger into pipeline orchestrator (calls existing 012 service)
- [X] T051 [US1] Integrate alignment stage trigger into pipeline orchestrator (calls existing 013 service)
- [X] T052 [US1] Add extraction completion listener to trigger alignment automatically
- [X] T053 [US1] Add stage status updates from 012/013 jobs to PipelineJob.stages
- [X] T054 [US1] Handle edge case: skip alignment when video has no audio

**Checkpoint**: Upload workflow triggers extraction and alignment via unified pipeline

---

## Phase 6: User Story 2 - Semantic Chunking and Knowledge Base (Priority: P2)

**Goal**: System parses content by structural headings, generates embeddings, and stores in ChromaDB

**Independent Test**: After document processing, query ChromaDB for chunks related to specific concepts; verify chunks are correctly stored with heading hierarchy metadata.

**Note**: This story primarily orchestrates existing 014 capability via the new pipeline.

### Implementation for User Story 2

- [X] T055 [US2] Integrate indexing stage trigger into pipeline orchestrator (calls existing 014 service)
- [X] T056 [US2] Add alignment completion listener to trigger indexing automatically
- [X] T057 [US2] Add indexing completion listener to trigger parallel generation (MCQ + Oral)
- [X] T058 [US2] Add chunksIndexed count to PipelineJob.stages.indexing from IndexingJob

**Checkpoint**: Pipeline automatically triggers indexing after alignment

---

## Phase 7: User Story 3 - MCQ Generation with IRT Calibration (Priority: P3)

**Goal**: System automatically generates MCQs with IRT b-value estimates from indexed chunks

**Independent Test**: Trigger MCQ generation for a lesson with indexed content; verify questions are created with correct answers, plausible distractors, and b-value estimates within the valid range (-3 to +3).

**Note**: This story primarily orchestrates existing 015 capability via the new pipeline.

### Implementation for User Story 3

- [X] T059 [US3] Integrate MCQ generation stage into pipeline orchestrator (calls existing 015 service)
- [X] T060 [US3] Add MCQ generation completion listener to update PipelineJob.stages.mcqGeneration
- [X] T061 [US3] Add timestamp propagation from alignment data to generated MCQs via sourceChunkId
- [X] T062 [US3] Update pipeline completion check to wait for both MCQ + Oral generation

**Checkpoint**: Pipeline triggers MCQ generation in parallel with oral generation after indexing

---

## Phase 8: Integration & Polish

**Purpose**: Cross-cutting concerns and final integration

### Watch Explanation Feature

- [X] T063 Implement getQuestionTimestamp utility to lookup timestamps via sourceChunkId in lib/alignment/timestamp-lookup.js
- [X] T064 Add "Watch Explanation" link to oral question review UI (reuse existing video player seek)

### Error Handling & Edge Cases

- [X] T065 Add Gemini API quota exhaustion handling with automatic retry in pipeline orchestrator
- [X] T066 Add language mismatch detection between document and video in alignment stage
- [X] T067 Add partial success handling (pipeline completes if MCQ succeeds but oral fails)

### Source Traceability

- [X] T068 Ensure sourceChunkId links questions back to original chunk, heading path, and document (FR-021)
- [X] T069 Add source traceability display in question detail view

### Documentation

- [X] T070 Update README with pipeline usage instructions
- [X] T071 Run quickstart.md validation steps to verify setup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 4 (Phase 3)**: Depends on Foundational - core new capability
- **User Story 5 (Phase 4)**: Depends on Foundational - orchestration layer
- **User Stories 1-3 (Phases 5-7)**: Depend on User Story 5 (orchestration must exist)
- **Integration (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

| Story | Can Start After | Dependencies on Other Stories |
|-------|----------------|-------------------------------|
| US4 (Oral Gen) | Phase 2 complete | None - standalone new capability |
| US5 (Pipeline) | Phase 2 complete | None - but provides infrastructure for US1-3 |
| US1 (Extract/Align) | US5 complete | Requires pipeline orchestrator |
| US2 (Indexing) | US5 complete | Requires pipeline orchestrator |
| US3 (MCQ Gen) | US5 complete | Requires pipeline orchestrator |

### Within Each User Story

1. Tests written and FAILING before implementation
2. Models before services
3. Services before actions/API routes
4. Core implementation before UI
5. Story complete before moving to next

### Parallel Opportunities

**Phase 2 (Foundational)**:
```bash
# All models can be created in parallel:
Task T005: "Create PipelineJob model"
Task T006: "Create OralGenerationJob model"
Task T007: "Extend Question schema" (different file)

# i18n can run in parallel:
Task T012: "Add English translations"
Task T013: "Add Arabic translations"
```

**Phase 3 (US4 - Oral Generation)**:
```bash
# All tests can run in parallel:
Task T014-T017: All test files are independent

# All lib files can run in parallel:
Task T018: "Implement generator"
Task T019: "Implement reference-answer-builder"
Task T020: "Implement duplicate-detector"

# Both API routes can run in parallel:
Task T026: "POST /api/oral-generation"
Task T027: "GET /api/oral-generation/[jobId]"
```

**Phase 4 (US5 - Pipeline Orchestration)**:
```bash
# All tests can run in parallel:
Task T028-T030: All test files are independent

# All UI components can run in parallel:
Task T043: "StageIndicator"
Task T044: "ProgressSummary"
Task T045: "RetryButton"
```

---

## Implementation Strategy

### MVP First (User Story 4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 4 (Oral Question Generation)
4. **STOP and VALIDATE**: Test oral generation independently
5. Deploy/demo if ready - instructors can manually trigger oral generation

### Incremental Delivery

1. **Foundation** → Setup + Models + Schemas
2. **Add US4** → Oral generation works standalone → Demo
3. **Add US5** → Pipeline orchestration + dashboard → Demo
4. **Add US1-3** → Full pipeline integration → Demo
5. **Polish** → Edge cases, traceability, documentation

### Parallel Team Strategy

With multiple developers after Phase 2:

- **Developer A**: User Story 4 (Oral Generation) - core new capability
- **Developer B**: User Story 5 (Pipeline Orchestration) - infrastructure
- **Developer C**: UI Components (can start T043-T045 in parallel)

After US4 + US5 complete:
- **All**: US1-3 integration tasks (smaller, quick integration work)

---

## Summary

| Phase | Task Count | Parallel Tasks |
|-------|------------|----------------|
| Phase 1: Setup | 4 | 3 |
| Phase 2: Foundational | 9 | 4 |
| Phase 3: US4 (Oral Gen) | 15 | 10 |
| Phase 4: US5 (Pipeline) | 23 | 9 |
| Phase 5: US1 (Extract/Align) | 5 | 0 |
| Phase 6: US2 (Indexing) | 4 | 0 |
| Phase 7: US3 (MCQ Gen) | 4 | 0 |
| Phase 8: Integration | 9 | 0 |
| **Total** | **73** | **26** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing 012-015 services are reused via orchestration, not reimplemented
