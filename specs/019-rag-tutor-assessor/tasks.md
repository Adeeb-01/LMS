# Tasks: Interactive RAG Tutor & Semantic Assessor

**Input**: Design documents from `/specs/019-rag-tutor-assessor/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Tests are included per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on existing LMS project structure:
- Models: `model/*.model.js`
- Server Actions: `app/actions/*.js`
- API Routes: `app/api/**/*.js`
- Components: `app/[locale]/(main)/courses/[id]/lesson/_components/*.jsx`
- Shared Components: `components/**/*.jsx`
- Libraries: `lib/**/*.js`
- Tests: `__tests__/**/*.js`
- Validations: `lib/validations.js`
- i18n: `messages/*.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, validation schemas, and i18n setup

- [X] T001 Add Zod validation schemas for oral assessment in `lib/validations.js`
- [X] T002 [P] Add OralAssessment i18n strings to `messages/en.json`
- [X] T003 [P] Add OralAssessment i18n strings to `messages/ar.json`
- [X] T004 [P] Add RagTutor i18n strings to `messages/en.json`
- [X] T005 [P] Add RagTutor i18n strings to `messages/ar.json`
- [X] T006 [P] Add ReciteBack i18n strings to `messages/en.json`
- [X] T007 [P] Add ReciteBack i18n strings to `messages/ar.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Implement semantic similarity utility with cosine similarity in `lib/ai/semantic-similarity.js`
- [X] T009 [P] Implement concept coverage analysis in `lib/ai/concept-coverage.js`
- [X] T010 [P] Create assessment prompt display component in `components/assessment/assessment-prompt.jsx`
- [X] T011 [P] Create similarity result visualization component in `components/assessment/similarity-result.jsx`
- [X] T012 [P] Create concept coverage display component in `components/assessment/concept-coverage.jsx`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

| Checklist | Total | Completed | Incomplete | Status |
|-----------|-------|-----------|------------|--------|
| Phase 6: Instructor Authoring (Enhancement) | 4 | 4 | 0 | ✓ PASS |
| requirements.md | 12 | 12 | 0 | ✓ PASS |

### Phase 3: User Story 1 - Directed Semantic Assessment (Priority: P1) 🎯 MVP

**Goal**: System prompts students with oral questions at video timestamps, transcribes responses via Whisper, and evaluates semantic similarity against reference answers.

**Independent Test**: Present a pre-defined oral question, record voice response, transcribe, compute similarity score against reference answer, display feedback with concept coverage.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US1] Unit test for semantic similarity computation in `__tests__/lib/semantic-similarity.test.js`
- [X] T014 [P] [US1] Unit test for concept coverage analysis in `__tests__/lib/concept-coverage.test.js`
- [X] T015 [P] [US1] Integration test for oral assessment submission flow in `__tests__/actions/oral-assessment.test.js`

### Models for User Story 1

- [X] T016 [P] [US1] Create OralAssessment model with indexes in `model/oral-assessment.model.js`
- [X] T017 [P] [US1] Create StudentResponse model with indexes in `model/student-response.model.js`

### Server Actions for User Story 1

- [X] T018 [US1] Implement getAssessmentPoints action in `app/actions/oral-assessment.js` (auth: verify student enrolled in course)
- [X] T019 [US1] Implement submitOralResponse action with transcription and evaluation in `app/actions/oral-assessment.js` (auth: verify student enrolled in course)
- [X] T020 [US1] Implement createOralAssessment instructor action in `app/actions/oral-assessment.js` (auth: verify instructor owns course)
- [X] T021 [US1] Implement reviewOralAssessment instructor action in `app/actions/oral-assessment.js` (auth: verify instructor owns course)

### API Routes for User Story 1

- [X] T022 [US1] Create audio upload API route in `app/api/oral-assessment/[assessmentId]/submit/route.js`
- [X] T023 [US1] Create assessment points GET API route in `app/api/oral-assessment/lesson/[lessonId]/route.js`

### UI Components for User Story 1

- [X] T024 [US1] Create oral assessment panel overlay in `app/[locale]/(main)/courses/[id]/lesson/_components/oral-assessment-panel.jsx`
- [X] T025 [US1] Modify lesson-video.jsx to detect and trigger assessment checkpoints in `app/[locale]/(main)/courses/[id]/lesson/_components/lesson-video.jsx`
- [X] T026 [US1] Add assessment state management to lesson page in `app/[locale]/(main)/courses/[id]/lesson/page.jsx`

**Checkpoint**: User Story 1 complete - students can answer oral questions during video with semantic evaluation

---

## Phase 4: User Story 2 - Student-Initiated RAG Tutor (Priority: P2)

**Goal**: Students can pause video and ask voice questions; system queries ChromaDB and returns contextually-grounded answers with timestamp links.

**Independent Test**: Pause video, ask voice question "What is the difference between X and Y?", verify system returns answer sourced from lecture content with relevant timestamp links.

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Unit test for RAG response generation in `__tests__/lib/rag-tutor-response.test.js`
- [X] T028 [P] [US2] Integration test for askTutor flow in `__tests__/actions/rag-tutor.test.js`

### Models for User Story 2

- [X] T029 [US2] Create TutorInteraction model with indexes in `model/tutor-interaction.model.js`

### Libraries for User Story 2

- [X] T030 [US2] Implement grounded RAG response generation in `lib/rag/tutor-response.js`

### Server Actions for User Story 2

- [X] T031 [US2] Implement askTutor action with rate limiting in `app/actions/rag-tutor.js` (auth: verify student enrolled in course)

### API Routes for User Story 2

- [X] T032 [US2] Create RAG query API route for audio in `app/api/rag-tutor/query/route.js`

### UI Components for User Story 2

- [X] T033 [US2] Create RAG tutor chat panel in `app/[locale]/(main)/courses/[id]/lesson/_components/rag-tutor-panel.jsx`
- [X] T034 [US2] Add "Ask Tutor" button to lesson video controls in `app/[locale]/(main)/courses/[id]/lesson/_components/lesson-video.jsx`
- [X] T035 [US2] Add tutor panel state management to lesson page in `app/[locale]/(main)/courses/[id]/lesson/page.jsx`

**Checkpoint**: User Story 2 complete - students can ask tutor questions and receive grounded answers

---

## Phase 5: User Story 3 - Recite-Back Loop (Priority: P3)

**Goal**: After tutor explanations, students must orally recite back key points before continuing; failed articulations log concept gaps for review.

**Independent Test**: Trigger RAG tutor response, display recite-back prompt, evaluate recitation against explanation, verify concept gaps are logged when max attempts exhausted.

### Tests for User Story 3 ⚠️

- [X] T036 [P] [US3] Integration test for recite-back flow in `__tests__/actions/recite-back.test.js`
- [X] T037 [P] [US3] Unit test for concept gap logging in `__tests__/lib/concept-gap.test.js`

### Models for User Story 3

- [X] T038 [P] [US3] Create ReciteBackAttempt model with indexes in `model/recite-back-attempt.model.js`
- [X] T039 [P] [US3] Create ConceptGap model with indexes in `model/concept-gap.model.js`

### Server Actions for User Story 3

- [X] T040 [US3] Implement submitReciteBack action in `app/actions/rag-tutor.js` (auth: verify student owns interaction)
- [X] T041 [US3] Implement getConceptGapSummary action in `app/actions/oral-assessment.js` (auth: verify student enrolled in course)

### UI Components for User Story 3

- [X] T042 [US3] Create recite-back modal component in `app/[locale]/(main)/courses/[id]/lesson/_components/recite-back-modal.jsx`
- [X] T043 [US3] Add recite-back trigger to rag-tutor-panel.jsx in `app/[locale]/(main)/courses/[id]/lesson/_components/rag-tutor-panel.jsx`
- [X] T044 [US3] Create concept gap session summary component in `app/[locale]/(main)/courses/[id]/lesson/_components/concept-gap-summary.jsx`
- [X] T045 [US3] Add session summary display on lesson completion in `app/[locale]/(main)/courses/[id]/lesson/page.jsx`

**Checkpoint**: User Story 3 complete - recite-back loop reinforces learning and logs concept gaps

---

## Phase 6: Instructor Authoring (Enhancement)

**Purpose**: Instructor tools for creating and managing oral assessments

- [X] T046 [P] Implement triggerOralAssessmentGeneration action in `app/actions/oral-assessment.js`
- [X] T047 Create assessment management list in `app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/assessments/_components/assessment-list.jsx`
- [X] T048 Create assessment review form in `app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/assessments/_components/assessment-review-form.jsx`
- [X] T049 Create assessments dashboard page in `app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/assessments/page.jsx`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T050 [P] Add error boundary for audio recording failures with text fallback in `components/ui/AudioRecorder.jsx`
- [X] T051 [P] Add loading states and skeleton components for assessment panels
- [X] T052 Run quickstart.md validation - verify all test scenarios pass
- [X] T053 [P] Add analytics tracking for assessment completion rates
- [X] T054 Performance optimization - ensure transcription <30s, RAG response <5s
- [X] T055 Security review - verify role-based access control on all endpoints
- [X] T056 [P] Verify WCAG 2.1 AA compliance for oral-assessment-panel, rag-tutor-panel, recite-back-modal (keyboard nav, contrast, screen reader)
- [X] T057 E2E test covering full assessment → tutor → recite-back flow in `__tests__/e2e/rag-tutor-flow.test.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion; reuses transcription from US1
- **User Story 3 (Phase 5)**: Depends on Foundational + User Story 2 (RAG tutor interaction)
- **Instructor Authoring (Phase 6)**: Depends on User Story 1 models
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    │
    ▼
Phase 2: Foundational
    │
    ├─────────────────────┬─────────────────────┐
    ▼                     ▼                     │
Phase 3: US1 (P1)    Phase 4: US2 (P2)        │
    │                     │                     │
    │                     ▼                     │
    │              Phase 5: US3 (P3) ◄──────────┘
    │                     │
    ▼                     ▼
Phase 6: Instructor   Phase 7: Polish
```

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Models before services
3. Services/actions before API routes
4. API routes before UI components
5. Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (all parallel)**:
- T002, T003, T004, T005, T006, T007 (i18n files)

**Phase 2 (parallel after T008)**:
- T009, T010, T011, T012 (independent libs and components)

**Phase 3 - User Story 1**:
- T013, T014, T015 (tests - parallel)
- T016, T017 (models - parallel)
- T018-T021 (actions - sequential)
- T022, T023 (API routes - parallel)
- T024-T026 (UI - mostly sequential)

**Phase 4 - User Story 2**:
- T027, T028 (tests - parallel)
- T029, T030, T031 (sequential)
- T032 (API route)
- T033-T035 (UI - mostly sequential)

**Phase 5 - User Story 3**:
- T036, T037 (tests - parallel)
- T038, T039 (models - parallel)
- T040, T041 (actions)
- T042-T045 (UI)

---

## Parallel Example: User Story 1

```bash
# Launch all tests together (ensure they fail):
Task T013: "Unit test for semantic similarity in __tests__/lib/semantic-similarity.test.js"
Task T014: "Unit test for concept coverage in __tests__/lib/concept-coverage.test.js"
Task T015: "Integration test for oral assessment in __tests__/actions/oral-assessment.test.js"

# Launch all models together:
Task T016: "Create OralAssessment model in model/oral-assessment.model.js"
Task T017: "Create StudentResponse model in model/student-response.model.js"

# Launch API routes together:
Task T022: "Create audio upload API route in app/api/oral-assessment/[assessmentId]/submit/route.js"
Task T023: "Create assessment points GET route in app/api/oral-assessment/lesson/[lessonId]/route.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T012)
3. Complete Phase 3: User Story 1 (T013-T026)
4. **STOP and VALIDATE**: Test oral assessment flow independently
5. Deploy/demo if ready - students can answer oral questions during video

### Incremental Delivery

1. **Setup + Foundational** → Foundation ready
2. **Add User Story 1** → Test independently → Deploy (MVP!)
   - Value: Semantic assessment during video playback
3. **Add User Story 2** → Test independently → Deploy
   - Value: Students can ask tutor questions
4. **Add User Story 3** → Test independently → Deploy
   - Value: Recite-back reinforcement + concept gap tracking
5. **Add Instructor Authoring** → Deploy
   - Value: Instructors can manage assessments

### Parallel Team Strategy

With multiple developers after Foundational phase:

- **Developer A**: User Story 1 (assessment flow)
- **Developer B**: User Story 2 (RAG tutor)
- Then Developer B continues to User Story 3 (depends on US2)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (red-green-refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Audio recordings are deleted immediately after transcription (privacy)
- Rate limit of 10 tutor questions per lesson enforced server-side
