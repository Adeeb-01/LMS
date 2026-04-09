# Tasks: Automatic MCQ Generation

**Input**: Design documents from `/specs/015-auto-mcq-generation/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/generation-api.md

**Tests**: Tests included as per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Data models and validation schemas shared across all user stories

- [X] T001 Create GenerationJob model in model/generation-job.model.js
- [X] T002 [P] Extend Question schema with generation fields in model/questionv2-model.js
- [X] T003 [P] Add generation Zod schemas to lib/validations.js (triggerGenerationSchema, generatedQuestionSchema, geminiResponseSchema)
- [X] T004 [P] Create lib/mcq-generation/ directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create Gemini generative model client in lib/mcq-generation/generator.js (basic prompt structure, JSON mode configuration)
- [X] T006 [P] Create question validator utility in lib/mcq-generation/question-validator.js (validates Gemini output structure)
- [X] T007 Implement chunk retrieval helper to fetch indexed chunks from ChromaDB in service/mcq-generation-queue.js (stub for queue service)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - One-Click MCQ Generation (Priority: P1) 🎯 MVP

**Goal**: Instructor clicks "Generate Questions" and MCQs are created from indexed lecture content and added to quiz as drafts.

**Independent Test**: Upload lecture document, trigger generation, verify MCQs appear in quiz with isDraft=true.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Unit test for Gemini prompt and response parsing in tests/unit/mcq-generator.test.js
- [X] T009 [P] [US1] Integration test for generation flow in tests/integration/mcq-generation.test.js

### Implementation for User Story 1

- [X] T010 [US1] Implement MCQ generation prompt engineering in lib/mcq-generation/generator.js (generateQuestionsFromChunk function)
- [X] T011 [US1] Implement background job processor in service/mcq-generation-queue.js (processGenerationJob, iterates chunks, calls Gemini)
- [X] T012 [US1] Create triggerGeneration server action in app/actions/mcq-generation.js (authorization, job creation, background trigger)
- [X] T013 [P] [US1] Create getGenerationStatus server action in app/actions/mcq-generation.js
- [X] T014 [P] [US1] Create cancelGeneration server action in app/actions/mcq-generation.js
- [X] T015 [US1] Create POST /api/mcq-generation API route in app/api/mcq-generation/route.js (internal trigger for background processing)
- [X] T016 [P] [US1] Create GET /api/mcq-generation/[jobId] API route in app/api/mcq-generation/[jobId]/route.js (status polling)
- [X] T017 [US1] Create generation trigger button component in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions/_components/generation-trigger.jsx
- [X] T018 [US1] Add confirmation dialog in generation-trigger.jsx when existing generated questions found for lesson
- [X] T019 [US1] Create generation page in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions/page.jsx
- [X] T020 [P] [US1] Create generation status indicator component in components/mcq-generation/generation-status.jsx
- [X] T021 [US1] Implement activateGeneratedQuestions server action in app/actions/mcq-generation.js
- [X] T022 [P] [US1] Implement deleteGeneratedQuestions server action in app/actions/mcq-generation.js
- [X] T023 [US1] Create generated questions preview component in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions/_components/generated-questions-preview.jsx
- [X] T024 [US1] Hook b-value reset into updateQuestion in app/actions/quizv2.js (reset irtParams to defaults when question text/options modified)
- [X] T025 [US1] Add i18n strings for generation UI to messages/en.json
- [X] T026 [P] [US1] Add i18n strings for generation UI to messages/ar.json

**Checkpoint**: User Story 1 complete - instructors can generate MCQs with one click and review/activate them

---

## Phase 4: User Story 2 - Difficulty Estimation (Priority: P2)

**Goal**: Generated questions include b-value estimates with reasoning based on Bloom's taxonomy level and content complexity.

**Independent Test**: Generate questions from varying content complexity and verify b-values correlate (easy content → lower b-values, complex → higher).

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Unit test for difficulty estimation in tests/unit/difficulty-estimator.test.js

### Implementation for User Story 2

- [X] T028 [US2] Create difficulty estimator module in lib/mcq-generation/difficulty-estimator.js (Bloom's taxonomy mapping, b-value calculation)
- [X] T029 [US2] Enhance Gemini prompt in lib/mcq-generation/generator.js to include difficulty analysis (bloomLevel, reasoning)
- [X] T030 [US2] Create difficulty badge component in components/mcq-generation/difficulty-badge.jsx (shows b-value with color coding)
- [X] T031 [US2] Add difficulty tooltip with reasoning to generated-questions-preview.jsx
- [X] T032 [P] [US2] Add difficulty-related i18n strings to messages/en.json and messages/ar.json

**Checkpoint**: User Story 2 complete - generated questions show estimated difficulty with reasoning

---

## Phase 5: User Story 3 - Batch Generation with Progress Tracking (Priority: P3)

**Goal**: Instructor sees real-time progress during generation, can navigate away and return, errors on individual chunks don't stop the job.

**Independent Test**: Trigger generation on large document, verify progress updates appear, verify partial completion if some chunks fail.

### Tests for User Story 3 ⚠️

- [X] T033 [P] [US3] Integration test for progress tracking and partial failures in tests/integration/mcq-generation.test.js (extend existing)

### Implementation for User Story 3

- [X] T034 [US3] Create progress indicator component in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions/_components/generation-progress.jsx
- [X] T035 [US3] Implement real-time progress polling with useEffect in generation page
- [X] T036 [US3] Enhance job processor in service/mcq-generation-queue.js to update progress after each chunk
- [X] T037 [US3] Add chunk error handling and partial completion logic to job processor
- [X] T038 [US3] Display chunk errors in UI with skip/retry options
- [X] T039 [P] [US3] Add progress-related i18n strings to messages/en.json and messages/ar.json

**Checkpoint**: User Story 3 complete - instructors see real-time progress and can handle partial failures

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements, duplicate detection, edge cases

- [X] T040 [P] Create duplicate detector module in lib/mcq-generation/duplicate-detector.js (two-phase: token similarity + semantic embedding)
- [X] T041 [P] Unit test for duplicate detection in tests/unit/duplicate-detector.test.js
- [X] T042 Integrate duplicate detection into job processor in service/mcq-generation-queue.js
- [X] T043 Implement regenerateForChunk server action in app/actions/mcq-generation.js
- [X] T044 Add regenerate button per chunk in generated-questions-preview.jsx
- [X] T045 [P] Add content filtering for non-educational chunks (TOC, bibliography) in lib/mcq-generation/generator.js
- [X] T046 [P] Add short chunk merging logic (under 50 words) in service/mcq-generation-queue.js
- [X] T047 Implement job cancellation on document re-upload (hook into lecture-document upload flow)
- [X] T048 Run quickstart.md validation steps and verify all acceptance scenarios
- [X] T049 [P] Code cleanup and JSDoc comments for all new modules

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially by priority
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Enhances US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational - Enhances US1 but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before server actions
- Server actions before API routes
- Backend before UI components
- Core implementation before polish

### Parallel Opportunities

**Setup Phase**:
```bash
T002, T003, T004  # All create different files
```

**Foundational Phase**:
```bash
T005, T006  # Generator and validator are independent
```

**User Story 1**:
```bash
T008, T009           # Tests first (parallel)
T013, T014           # Status and cancel actions (parallel)
T016, T020, T022     # Independent components/actions (parallel)
T025, T026           # i18n files (parallel)
```

**User Story 2**:
```bash
T027                 # Test first
T030, T032           # UI component and i18n (parallel)
```

**User Story 3**:
```bash
T033                 # Test first
T039                 # i18n can parallel with UI work
```

**Polish Phase**:
```bash
T040, T041, T045, T046, T049  # Independent modules and cleanup
```

---

## Parallel Example: User Story 1

```bash
# Step 1: Launch tests together (should fail initially):
Task T008: "Unit test for Gemini prompt in tests/unit/mcq-generator.test.js"
Task T009: "Integration test for generation flow in tests/integration/mcq-generation.test.js"

# Step 2: Core implementation (sequential):
Task T010: "Implement MCQ generation prompt in lib/mcq-generation/generator.js"
Task T011: "Implement background job processor in service/mcq-generation-queue.js"
Task T012: "Create triggerGeneration server action in app/actions/mcq-generation.js"

# Step 3: Supporting server actions (parallel):
Task T013: "Create getGenerationStatus server action"
Task T014: "Create cancelGeneration server action"

# Step 4: API routes:
Task T015: "Create POST /api/mcq-generation API route"
Task T016: "Create GET /api/mcq-generation/[jobId] API route"

# Step 5: UI components (some parallel):
Task T017: "Create generation trigger button component"
Task T018: "Add confirmation dialog for re-generation"
Task T019: "Create generation page"
Task T020: "Create generation status indicator component" (parallel with T17-T19)

# Step 6: Question management:
Task T021: "Implement activateGeneratedQuestions"
Task T022: "Implement deleteGeneratedQuestions" (parallel with T21)
Task T023: "Create generated questions preview component"
Task T024: "Hook b-value reset into updateQuestion"

# Step 7: i18n (parallel):
Task T025: "Add i18n strings to messages/en.json"
Task T026: "Add i18n strings to messages/ar.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (4 tasks)
2. Complete Phase 2: Foundational (3 tasks)
3. Complete Phase 3: User Story 1 (19 tasks)
4. **STOP and VALIDATE**: Test generation end-to-end
5. Deploy/demo if ready - instructors can generate MCQs!

### Incremental Delivery

1. Setup + Foundational → Foundation ready (7 tasks)
2. Add User Story 1 → MVP with basic generation (19 tasks)
3. Add User Story 2 → Enhanced with difficulty estimates (6 tasks)
4. Add User Story 3 → Full progress tracking (7 tasks)
5. Add Polish → Production quality (10 tasks)

### Estimated Task Counts

| Phase | Tasks | Cumulative |
|-------|-------|------------|
| Setup | 4 | 4 |
| Foundational | 3 | 7 |
| User Story 1 | 19 | 26 |
| User Story 2 | 6 | 32 |
| User Story 3 | 7 | 39 |
| Polish | 10 | 49 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing dependencies (014-semantic-embeddings-pipeline, 009-question-irt-parameters) must be complete
