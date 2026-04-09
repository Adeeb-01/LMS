# Tasks: Adaptive IRT Testing

**Input**: Design documents from `/specs/016-adaptive-irt-testing/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/adaptive-quiz-api.md, research.md, quickstart.md

**Tests**: Included per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks grouped by user story. US1 and US2 (both P1) are combined as "Core Adaptive Quiz" since they are inseparable - dynamic difficulty requires termination logic and vice versa.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4) or combined (US1+2)
- Exact file paths included in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies and create directory structure

- [x] T001 Install mathjs dependency via `npm install mathjs`
- [x] T002 [P] Create IRT library directory structure at `lib/irt/`
- [x] T003 [P] Create IRT module index file at `lib/irt/index.js` with exports

---

## Phase 2: Foundational (IRT Library + Schema Extensions)

**Purpose**: Core IRT calculations and database schema that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### IRT Calculation Library

- [x] T004 [P] Create 3PL probability function in `lib/irt/probability.js` implementing P(θ) = c + (1-c) / (1 + e^(-a(θ-b)))
- [x] T005 [P] Create Fisher Information function in `lib/irt/information.js` implementing I(θ) = a²(P-c)² / ((1-c)²P(1-P))
- [x] T006 [P] Create EAP estimation function in `lib/irt/estimation.js` with numerical integration using mathjs (41 quadrature points over θ ∈ [-4, 4])
- [x] T007 [P] Create standard error calculation in `lib/irt/estimation.js` as SE(θ) = 1/√(ΣI(θ))
- [x] T008 Create Maximum Fisher Information selection in `lib/irt/selection.js` with content balancing support (depends on T005)
- [x] T009 [P] Create ability level mapping utility in `lib/irt/ability-display.js` (θ → "Novice"/"Developing"/"Proficient"/"Advanced"/"Expert" + percentile)

### Unit Tests for IRT Library

- [x] T010 [P] Unit test for probability function in `tests/unit/irt/probability.test.js` (test known values, edge cases)
- [x] T011 [P] Unit test for Fisher Information in `tests/unit/irt/information.test.js` (test high/low θ, edge cases)
- [x] T012 [P] Unit test for EAP estimation in `tests/unit/irt/estimation.test.js` (test response patterns, all-correct, all-incorrect)
- [x] T013 [P] Unit test for question selection in `tests/unit/irt/selection.test.js` (test MFI selection, pool exhaustion)

### Schema Extensions

- [x] T014 [P] Extend Quiz model with `adaptiveConfig` subdocument in `model/quizv2-model.js` per data-model.md
- [x] T015 [P] Extend Attempt model with `adaptive` subdocument in `model/attemptv2-model.js` per data-model.md
- [x] T016 [P] Extend answer schema with `selectionMetrics` in `model/attemptv2-model.js` per data-model.md
- [x] T017 [P] Add sparse index for concurrent session lookup on `(quizId, studentId, adaptive.activeDeviceId)` in `model/attemptv2-model.js`
- [x] T018 Add `adaptiveConfigSchema` and `adaptiveAnswerSchema` to `lib/validations.js` per data-model.md

### Schema Tests

- [x] T019 [P] Schema validation test for adaptive Quiz fields in `tests/schemas/quiz.schema.test.js`
- [x] T020 [P] Schema validation test for adaptive Attempt fields in `tests/schemas/adaptive-answer.schema.test.js`

**Checkpoint**: Foundation ready - IRT library functional, schemas extended, all unit tests passing

---

## Phase 3: User Story 1+2 - Core Adaptive Quiz (Priority: P1) 🎯 MVP

**Goal**: Students can take adaptive quizzes with dynamic difficulty adjustment that terminate efficiently when measurement precision is achieved

**Independent Test**: Start an adaptive quiz, answer questions, observe difficulty adapting to performance, quiz terminates early when SE threshold reached, view results with confidence interval

### Integration Test for Core Adaptive Flow

- [x] T021 [US1+2] Integration test for full adaptive quiz flow in `tests/integration/adaptive-quiz.test.js` covering: start attempt → answer questions → θ updates → termination → results

### Server Actions (Core)

- [x] T022 [US1+2] Implement `startAdaptiveAttempt` action in `app/actions/adaptive-quiz.js` per contract (quiz validation, session locking, first question selection)
- [x] T023 [US1+2] Implement `submitAdaptiveAnswer` action in `app/actions/adaptive-quiz.js` per contract (grade, update θ/SE, termination check, next question)
- [x] T024 [US1+2] Implement `getAdaptiveResult` action in `app/actions/adaptive-quiz.js` per contract (results with confidence interval, θ progression, question review)
- [x] T025 [US1+2] Add role-based access control to adaptive actions per FR-015 (student sees own θ, instructor sees all)

### Student UI Components

- [x] T026 [P] [US1+2] Create ability indicator component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/ability-indicator.jsx` (θ display as level + percentile, animated updates)
- [x] T027 [P] [US1+2] Create adaptive quiz wrapper in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/adaptive-quiz-wrapper.jsx` (deviceId management, session handling)
- [x] T028 [US1+2] Create adaptive quiz interface in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/adaptive-quiz-interface.jsx` (single question display, progress indicator, termination handling)
- [x] T029 [US1+2] Create adaptive results component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/adaptive-results.jsx` (θ with confidence, progression chart, question review)
- [x] T030 [US1+2] Integrate adaptive mode detection in quiz page at `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/page.jsx` (route to adaptive interface if quiz.adaptiveConfig.enabled)

### Edge Case Handling

- [x] T031 [US1+2] Handle pool exhaustion gracefully in `submitAdaptiveAnswer` (terminate with pool_exhausted reason)
- [x] T032 [US1+2] Handle concurrent device access (409 response with clear error message)
- [x] T033 [US1+2] Handle quiz resume after abandonment (restore θ, continue from last state)

**Checkpoint**: Core adaptive quiz fully functional - students can take adaptive quizzes, see dynamic difficulty, efficient termination works

---

## Phase 4: User Story 3 - Configure Adaptive Quizzes (Priority: P2)

**Goal**: Instructors can create and configure adaptive quizzes with custom parameters

**Independent Test**: Create a quiz, enable adaptive mode, set precision/min/max parameters, view question pool analysis, publish with validation warnings

### Tests for User Story 3

- [x] T034 [P] [US3] Integration test for adaptive config in `tests/integration/adaptive-config.test.js` (create, update, validate, pool analysis)

### Server Actions (Configuration)

- [x] T035 [US3] Implement `updateQuizAdaptiveConfig` action in `app/actions/quizv2.js` per contract (validation, warnings for insufficient pool)
- [x] T036 [US3] Implement `getQuizPoolAnalysis` action in `app/actions/quizv2.js` per contract (difficulty distribution, discrimination quality, recommendations)
- [x] T037 [US3] Add publish-time validation for adaptive quizzes in `app/actions/quizv2.js` (warn if pool < 3× maxQuestions)

### Instructor UI Components

- [x] T038 [US3] Create adaptive config form in `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/adaptive-config-form.jsx` (enable toggle, threshold slider, min/max inputs, content balancing)
- [x] T039 [US3] Create pool analysis display in `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/pool-analysis.jsx` (difficulty chart, discrimination quality, recommendations)
- [x] T040 [US3] Integrate adaptive config in quiz edit form at `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/quiz-edit-form.jsx`
- [x] T041 [US3] Add IRT parameter display to question list in `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/questions/_components/question-list.jsx` (show difficulty, discrimination, filter/sort)

**Checkpoint**: Instructors can fully configure adaptive quizzes

---

## Phase 5: User Story 4 - Adaptive Assessment Analytics (Priority: P3)

**Goal**: Instructors and admins can view analytics about adaptive quiz performance

**Independent Test**: After multiple students complete an adaptive quiz, view ability distribution, question usage, termination reasons, identify questions needing recalibration

### Tests for User Story 4

- [x] T042 [P] [US4] Integration test for analytics in `tests/integration/adaptive-analytics.test.js` (aggregate stats, question usage, drift detection)

### Server Actions (Analytics)

- [x] T043 [US4] Implement `getAdaptiveQuizAnalytics` action in `app/actions/adaptive-analytics.js` per contract (ability distribution, termination stats, question usage)
- [x] T044 [US4] Implement drift detection logic in `app/actions/adaptive-analytics.js` (flag questions where observed ≠ calibrated difficulty)

### Analytics UI Components

- [x] T045 [US4] Create analytics dashboard in `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/adaptive-analytics-dashboard.jsx` (overview stats, charts)
- [x] T046 [P] [US4] Create ability distribution chart in `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/ability-distribution-chart.jsx` (histogram of final θ values)
- [x] T047 [P] [US4] Create question usage table in `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/question-usage-table.jsx` (selection rate, observed vs calibrated difficulty, drift flag)
- [x] T048 [US4] Integrate analytics tab in quiz dashboard at `app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/page.jsx`

**Checkpoint**: Analytics fully functional - instructors can monitor adaptive quiz performance

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Internationalization, documentation, and validation

### Internationalization

- [x] T049 [P] Add adaptive testing translations to `messages/en.json` (ability levels, termination reasons, error messages per contracts/adaptive-quiz-api.md)
- [x] T050 [P] Add adaptive testing translations to `messages/ar.json` (Arabic equivalents)

### Documentation & Validation

- [x] T051 [P] Update README.md with adaptive testing feature documentation
- [x] T052 Run quickstart.md validation steps to verify complete implementation
- [x] T053 Performance validation: Ensure question selection completes in <500ms (SC-006)

### Accessibility

- [x] T056 [P] Verify WCAG 2.1 AA accessibility for adaptive UI components (keyboard navigation, screen reader labels, focus management, contrast ratios)

### Code Quality

- [x] T054 Run ESLint on all new files and fix any issues
- [x] T055 Add JSDoc comments to IRT library functions with mathematical formulas

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    │
    ▼
Phase 2: Foundational (IRT Library + Schema)
    │
    ├─────────────────────────────────────────────┐
    ▼                                             ▼
Phase 3: US1+2 Core Adaptive    ──────►    Phase 4: US3 Configure
    │                                             │
    └──────────────────┬──────────────────────────┘
                       ▼
               Phase 5: US4 Analytics
                       │
                       ▼
               Phase 6: Polish
```

### User Story Dependencies

- **US1+2 (P1)**: Requires Foundational (Phase 2) complete - core adaptive experience
- **US3 (P2)**: Requires Foundational (Phase 2) - can run parallel with US1+2
- **US4 (P3)**: Requires US1+2 complete (needs completed attempts to analyze)

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- IRT functions: probability → information → estimation → selection (some parallel)
- Schema: models can be parallel, validations depend on model structure
- Actions before UI components
- Core components before integration

### Parallel Opportunities by Phase

**Phase 2 (Foundational)**:
```
Parallel batch 1: T004, T005, T006, T007, T009 (IRT functions)
Parallel batch 2: T010, T011, T012, T013 (IRT tests)
Parallel batch 3: T014, T015, T016, T017 (schema extensions)
Sequential: T008 (depends on T005), T018 (depends on models)
```

**Phase 3 (Core Adaptive)**:
```
Parallel: T026, T027 (independent UI components)
Sequential: T022 → T023 → T024 (action dependencies)
```

**Phase 4 (Configure)**:
```
Parallel: T038, T039 (independent UI components)
Sequential: T035 → T036 → T037 (action dependencies)
```

---

## Parallel Example: Phase 2 Foundational

```bash
# Batch 1: All IRT functions in parallel
Task: T004 "Create 3PL probability function in lib/irt/probability.js"
Task: T005 "Create Fisher Information function in lib/irt/information.js"
Task: T006 "Create EAP estimation function in lib/irt/estimation.js"
Task: T009 "Create ability level mapping in lib/irt/ability-display.js"

# Batch 2: All IRT tests in parallel (after functions complete)
Task: T010 "Unit test for probability in tests/unit/irt/probability.test.js"
Task: T011 "Unit test for information in tests/unit/irt/information.test.js"
Task: T012 "Unit test for estimation in tests/unit/irt/estimation.test.js"
Task: T013 "Unit test for selection in tests/unit/irt/selection.test.js"

# Batch 3: All schema extensions in parallel
Task: T014 "Extend Quiz model in model/quizv2-model.js"
Task: T015 "Extend Attempt model in model/attemptv2-model.js"
Task: T016 "Extend answer schema in model/attemptv2-model.js"
Task: T019 "Schema test for Quiz in tests/schemas/quiz.schema.test.js"
Task: T020 "Schema test for Attempt in tests/schemas/attempt.schema.test.js"
```

---

## Implementation Strategy

### MVP First (Phase 1-3 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T020)
3. Complete Phase 3: US1+2 Core Adaptive (T021-T033)
4. **STOP and VALIDATE**: Test full adaptive quiz flow
5. Deploy - students can now take adaptive quizzes!

**MVP Scope**: 33 tasks for fully functional adaptive testing

### Incremental Delivery

1. **MVP**: Setup + Foundational + Core Adaptive → Students can take adaptive quizzes
2. **+US3**: Add Configuration → Instructors can configure adaptive quizzes
3. **+US4**: Add Analytics → Instructors can analyze performance
4. **+Polish**: i18n, documentation → Production ready

### Task Summary

| Phase | Tasks | Parallel | Description |
|-------|-------|----------|-------------|
| 1. Setup | 3 | 2 | Dependencies, directory structure |
| 2. Foundational | 17 | 14 | IRT library, schema, tests |
| 3. US1+2 (P1) | 13 | 3 | Core adaptive quiz experience |
| 4. US3 (P2) | 8 | 1 | Instructor configuration |
| 5. US4 (P3) | 7 | 3 | Analytics dashboard |
| 6. Polish | 8 | 5 | i18n, docs, validation, accessibility |
| **Total** | **56** | **28** | |

---

## Notes

- [P] tasks = different files, no dependencies within that batch
- [US1+2] = combined user stories (inseparable core functionality)
- All IRT functions include JSDoc with mathematical formulas
- deviceId stored in localStorage for session persistence across page refreshes
- Clamp probability to [0.001, 0.999] to avoid NaN in Fisher Information
- Tests verify < 500ms for question selection (SC-006)
