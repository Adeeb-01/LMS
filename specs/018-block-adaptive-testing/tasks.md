# Tasks: Block-Based Adaptive Testing Engine (BAT)

**Input**: Design documents from `/specs/018-block-adaptive-testing/`  
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅, research.md ✅

**Tests**: Unit and integration tests are included per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Models**: `model/` at repository root
- **Library**: `lib/` at repository root  
- **Actions**: `app/actions/` at repository root
- **Components**: `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/`
- **Dashboard**: `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/`
- **Tests**: `tests/unit/` and `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new files and directory structure for BAT feature

- [X] T001 Create `lib/irt/difficulty-bands.js` with empty module exports
- [X] T002 Create `lib/irt/block-selection.js` with empty module exports
- [X] T003 Create `app/actions/bat-quiz.js` with "use server" directive and empty exports
- [X] T004 [P] Create `tests/unit/irt/difficulty-bands.test.js` with Jest setup
- [X] T005 [P] Create `tests/unit/irt/block-selection.test.js` with Jest setup
- [X] T006 [P] Create `tests/integration/bat-quiz.test.js` with Jest setup

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Model Extensions

- [X] T007 Add `batConfig` subdocument to Quiz schema in `model/quizv2-model.js` per data-model.md
- [X] T008 Add `bat` subdocument to Attempt schema in `model/attemptv2-model.js` per data-model.md
- [X] T009 Add `conceptTags` field and index to Question schema in `model/questionv2-model.js`
- [X] T010 Add BAT session lookup index to Attempt schema in `model/attemptv2-model.js`

### Library Extensions

- [X] T011 Implement `getDifficultyBand(b)` function in `lib/irt/difficulty-bands.js`
- [X] T012 Implement `getTargetBandForTheta(theta)` function in `lib/irt/difficulty-bands.js`
- [X] T013 Implement `validateBatPool(questions)` function in `lib/irt/difficulty-bands.js`
- [X] T014 Implement `selectBlock(theta, pool, usedIds)` function in `lib/irt/block-selection.js`
- [X] T015 Update `lib/irt/index.js` to export difficulty-bands and block-selection modules

### Validation Schemas

- [X] T016 Add `batConfigSchema` Zod schema to `lib/validations.js`
- [X] T017 Add `blockAnswerSchema` and `submitBatBlockSchema` Zod schemas to `lib/validations.js`

### Unit Tests for Foundational

- [X] T018 [P] Write unit tests for `getDifficultyBand()` in `tests/unit/irt/difficulty-bands.test.js`
- [X] T019 [P] Write unit tests for `getTargetBandForTheta()` in `tests/unit/irt/difficulty-bands.test.js`
- [X] T020 [P] Write unit tests for `validateBatPool()` in `tests/unit/irt/difficulty-bands.test.js`
- [X] T021 [P] Write unit tests for `selectBlock()` in `tests/unit/irt/block-selection.test.js`

**Checkpoint**: Foundation ready - all IRT functions tested, models extended, Zod schemas in place

---

## Phase 3: User Story 1 - Block-Based Question Presentation (Priority: P1) 🎯 MVP

**Goal**: Display 2 questions from the same difficulty band on a single screen as a cohesive block

**Independent Test**: Start a BAT quiz and verify exactly 2 questions appear per screen, both from the same difficulty band, with a "Submit Block" button that requires both answers

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T022 [P] [US1] Write integration test for block display in `tests/integration/bat-quiz.test.js`: verify 2 questions returned per block
- [X] T023 [P] [US1] Write integration test for same-band requirement in `tests/integration/bat-quiz.test.js`: verify both questions share difficulty band

### Implementation for User Story 1

- [X] T024 [US1] Implement `startBatAttempt(quizId, sessionId)` in `app/actions/bat-quiz.js` - create attempt and return first block
- [X] T025 [P] [US1] Create `BlockProgressIndicator` component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/block-progress-indicator.jsx`
- [X] T026 [US1] Create `BatQuizInterface` component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/bat-quiz-interface.jsx`
- [X] T027 [US1] Add block answer state management to `BatQuizInterface` - track answers for both questions
- [X] T028 [US1] Add submit button validation to `BatQuizInterface` - disable until both questions answered
- [X] T029 [US1] Extend `adaptive-quiz-wrapper.jsx` to route to BAT or standard adaptive based on `batConfig.enabled`

**Checkpoint**: User Story 1 complete - students see 2 questions per block, can't submit until both answered

---

## Phase 4: User Story 2 - Staged Ability Estimation (Priority: P1)

**Goal**: Recalculate θ only after complete block submission, then select next block based on updated θ

**Independent Test**: Complete a block and verify θ recalculation occurs once (not per question), and next block difficulty matches updated θ

### Tests for User Story 2 ⚠️

- [X] T030 [P] [US2] Write integration test for staged θ update in `tests/integration/bat-quiz.test.js`: verify θ only changes after block submission
- [X] T031 [P] [US2] Write integration test for adaptive selection in `tests/integration/bat-quiz.test.js`: verify next block band matches new θ

### Implementation for User Story 2

- [X] T032 [US2] Implement `submitBatBlock(attemptId, answers, sessionId)` core logic in `app/actions/bat-quiz.js` - grade answers, update block
- [X] T033 [US2] Add θ estimation to `submitBatBlock` - call `estimateAbilityEAP()` with all block responses after submission
- [X] T034 [US2] Add θ history tracking to `submitBatBlock` - store in `bat.thetaHistory[]`
- [X] T035 [US2] Add next block selection to `submitBatBlock` - use updated θ to select next block via `selectBlock()`
- [X] T036 [US2] Update `BatQuizInterface` to handle `submitBatBlock` response - display new block or redirect to results

**Checkpoint**: User Story 2 complete - θ recalculates per block, next block adapts to new θ

---

## Phase 5: User Story 3 - Fixed-Length Test Termination (Priority: P1)

**Goal**: Automatically terminate after exactly 5 blocks (10 questions) and display final results

**Independent Test**: Complete 5 blocks and verify test terminates automatically with final θ and performance summary

### Tests for User Story 3 ⚠️

- [X] T037 [P] [US3] Write integration test for 5-block termination in `tests/integration/bat-quiz.test.js`: verify status='completed' after 5th block
- [X] T038 [P] [US3] Write integration test for final results in `tests/integration/bat-quiz.test.js`: verify finalTheta, summary in response
- [X] T038b [P] [US3] Write integration test verifying 50% reduction in server requests (5 selection calls vs 10) per SC-002

### Implementation for User Story 3

- [X] T039 [US3] Add termination check to `submitBatBlock` - detect when currentBlockIndex >= totalBlocks - 1
- [X] T040 [US3] Add completion logic to `submitBatBlock` - set terminationReason, status, calculate final score
- [X] T041 [US3] Implement `getBatResult(attemptId)` in `app/actions/bat-quiz.js` - return full results with block breakdown
- [X] T042 [P] [US3] Create `BatResults` component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/bat-results.jsx`
- [X] T043 [US3] Add θ progression chart to `BatResults` - visualize θ changes across 5 blocks
- [X] T044 [US3] Update quiz result page to use `BatResults` for BAT attempts in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/result/page.jsx`

**Checkpoint**: User Story 3 complete - test terminates after 5 blocks, shows final θ and performance summary

---

## Phase 6: User Story 4 - Concept Tag Export for Missed Questions (Priority: P2)

**Goal**: Record concept tags from incorrectly answered questions and make them accessible to instructors

**Independent Test**: Complete a BAT quiz with some wrong answers, verify missed concept tags are recorded and viewable by instructor

### Tests for User Story 4 ⚠️

- [X] T045 [P] [US4] Write integration test for concept tag recording in `tests/integration/bat-quiz.test.js`: verify missedConceptTags populated on completion
- [X] T046 [P] [US4] Write unit test for concept tag extraction logic in `tests/unit/irt/concept-tags.test.js`

### Implementation for User Story 4

- [X] T047 [US4] Add missed concept tag computation to `submitBatBlock` completion logic - extract tags from incorrect answers
- [X] T048 [US4] Store `missedConceptTags` in attempt.bat subdocument on completion
- [X] T049 [US4] Add `missedConceptTags` to `getBatResult` response
- [X] T050 [US4] Display missed concept tags in `BatResults` component - show list of concept areas needing improvement
- [X] T051 [US4] Implement `getConceptGapAnalysis(quizId, options)` in `app/actions/bat-quiz.js` - aggregate missed concepts
- [X] T052 [P] [US4] Create `ConceptGapAnalysis` component in `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/concept-gap-analysis.jsx`

**Checkpoint**: User Story 4 complete - instructors can see missed concept tags per student and aggregated

---

## Phase 7: User Story 5 - BAT Quiz Configuration (Priority: P2)

**Goal**: Allow instructors to enable BAT mode when configuring a quiz, with pool validation

**Independent Test**: Enable BAT mode on a quiz, verify validation checks pool requirements, and students see block-based interface

### Tests for User Story 5 ⚠️

- [X] T053 [P] [US5] Write integration test for pool validation in `tests/integration/bat-quiz.test.js`: verify error when pool has <4 questions per band
- [X] T054 [P] [US5] Write integration test for BAT activation in `tests/integration/bat-quiz.test.js`: verify batConfig.enabled persists
- [X] T055 [US5] Implement `validateBatPool(quizId)` in `app/actions/bat-quiz.js` - check 4+ questions per band
- [X] T056 [US5] Extend `adaptive-config-form.jsx` with BAT mode toggle in `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/adaptive-config-form.jsx`
- [X] T057 [US5] Add pool validation feedback to config form - show band counts and warnings
- [X] T058 [US5] Add mutual exclusion logic - disable standard adaptive when BAT enabled and vice versa
- [X] T059 [US5] Update quiz save action to persist `batConfig` settings

**Checkpoint**: User Story 5 complete - instructors can enable BAT mode with validation

---

## Phase 8: Session Management & Edge Cases

**Purpose**: Handle session conflicts, interruptions, and edge cases from spec (FR-012, FR-015)

- [X] T060 [Edge] Add session validation to `startBatAttempt` in `app/actions/bat-quiz.js` - detect existing session, invalidate if different
- [X] T061 [Edge] Add session conflict handling to `submitBatBlock` in `app/actions/bat-quiz.js` - reject if session mismatch
- [X] T062 [Edge] Add resume logic to `startBatAttempt` in `app/actions/bat-quiz.js` - load existing in-progress attempt and current block
- [X] T063 [Edge] Add navigation warning to `BatQuizInterface` in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/bat-quiz-interface.jsx` - prompt before leaving mid-block
- [X] T064 [Edge] Add local answer persistence to `BatQuizInterface` - store answers in localStorage until confirmed

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T065 [P] Add i18n translations for BAT UI strings in `messages/en.json` and `messages/ar.json`
- [X] T066 [P] Add loading states to `BatQuizInterface` and `BatResults` components
- [X] T067 [P] Add error handling and toast notifications for all BAT server actions
- [X] T068 Code cleanup - remove console.logs, add JSDoc comments to server actions
- [X] T069 Run manual validation of quickstart.md scenarios
- [X] T070 Update README if BAT feature adds new setup requirements

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1, US2, US3 (P1) should be done sequentially - they share server action logic
  - US4, US5 (P2) can start after US3 completes
- **Session Management (Phase 8)**: Depends on US1-US3 being complete
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
    │
    ├── US1: Block-Based Presentation (Phase 3)
    │       │
    │       └── US2: Staged θ Estimation (Phase 4)
    │               │
    │               └── US3: Fixed-Length Termination (Phase 5)
    │                       │
    │                       ├── US4: Concept Tag Export (Phase 6) [P2]
    │                       │
    │                       └── US5: BAT Quiz Configuration (Phase 7) [P2]
    │
    └── Session Management (Phase 8) [after US3]
            │
            └── Polish (Phase 9)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Server action logic before UI components
- Core implementation before integration
- Story complete before moving to next

### Parallel Opportunities

- T004, T005, T006: All test file creation can run in parallel
- T018, T019, T020, T021: All unit tests can run in parallel
- T022, T023: US1 tests can run in parallel
- T025: BlockProgressIndicator can be built parallel to server actions
- T045, T046: US4 tests can run in parallel
- T065, T066, T067: Polish tasks can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all model extensions together (different files):
Task T007: "Add batConfig to Quiz schema in model/quizv2-model.js"
Task T008: "Add bat subdocument to Attempt schema in model/attemptv2-model.js"
Task T009: "Add conceptTags to Question schema in model/questionv2-model.js"

# Launch all unit tests together (different test files):
Task T018: "Unit tests for getDifficultyBand() in tests/unit/irt/difficulty-bands.test.js"
Task T019: "Unit tests for getTargetBandForTheta() in tests/unit/irt/difficulty-bands.test.js"
Task T020: "Unit tests for validateBatPool() in tests/unit/irt/difficulty-bands.test.js"
Task T021: "Unit tests for selectBlock() in tests/unit/irt/block-selection.test.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1 - Block-Based Presentation
4. Complete Phase 4: US2 - Staged θ Estimation
5. Complete Phase 5: US3 - Fixed-Length Termination
6. **STOP and VALIDATE**: Test complete BAT flow end-to-end
7. Deploy/demo if ready (MVP complete!)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1-US3 (P1) → Test independently → Deploy/Demo (MVP!)
3. Add US4 (P2) → Concept tag insights available
4. Add US5 (P2) → Instructors can configure BAT mode
5. Add Session Management → Production-ready
6. Polish → Release

### Effort Estimates

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Setup | 6 | Low |
| Foundational | 15 | Medium |
| US1 (P1) | 8 | Medium |
| US2 (P1) | 7 | Medium |
| US3 (P1) | 9 | Medium |
| US4 (P2) | 8 | Low |
| US5 (P2) | 7 | Low |
| Session Mgmt | 5 | Medium |
| Polish | 6 | Low |
| **Total** | **71** | |

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- US1, US2, US3 are tightly coupled (share server actions) but independently testable
- US4 and US5 can proceed in parallel after US3
- All BAT logic is additive - existing adaptive testing (016) remains unchanged
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
