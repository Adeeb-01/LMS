# Tasks: AI-Driven Remediation Dashboard

**Input**: Design documents from `/specs/020-ai-remediation-dashboard/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/server-actions.md, research.md, quickstart.md

**Tests**: Included per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths follow existing LMS conventions (app/, model/, lib/, service/)

---

## Phase 1: Setup

**Purpose**: Project initialization and directory structure

- [X] T001 Create `lib/remediation/` directory structure
- [X] T002 Create `app/[locale]/dashboard/remediation/_components/` directory structure
- [X] T003 [P] Add remediation feature translations to `messages/en.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create WeaknessProfile Mongoose model in `model/weakness-profile.model.js`
- [X] T005 [P] Create RemediationSession Mongoose model in `model/remediation-session.model.js`
- [X] T006 [P] Create Zod validation schemas in `lib/validations/remediation.js`
- [X] T007 Create base Server Action file with auth helpers in `app/actions/remediation.js`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Personalized Weakness Dashboard (Priority: P1) 🎯 MVP

**Goal**: Students see a prioritized list of conceptual weaknesses aggregated from BAT and Oral assessments

**Independent Test**: Student with completed assessments views dashboard and sees list of concepts they struggled with, sorted by priority

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Unit test for getWeaknessProfile action in `__tests__/actions/remediation.test.js`
- [X] T009 [P] [US1] Unit test for basic aggregator logic in `__tests__/lib/remediation/aggregator.test.js`

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement `aggregateWeaknessesForStudent()` in `lib/remediation/aggregator.js` (BAT source, include tag normalization: lowercase + trim)
- [X] T011 [US1] Extend `aggregateWeaknessesForStudent()` to include Oral assessment source in `lib/remediation/aggregator.js`
- [X] T012 [US1] Implement `getWeaknessProfile` Server Action in `app/actions/remediation.js`
- [X] T013 [US1] Implement `triggerProfileAggregation` Server Action in `app/actions/remediation.js`
- [X] T014 [P] [US1] Create WeaknessCard component in `app/[locale]/dashboard/remediation/_components/weakness-card.jsx` (include source badges: BAT/Oral icons per FR-011)
- [X] T015 [P] [US1] Create WeaknessList component in `app/[locale]/dashboard/remediation/_components/weakness-list.jsx`
- [X] T016 [P] [US1] Create ResolvedSection component in `app/[locale]/dashboard/remediation/_components/resolved-section.jsx`
- [X] T017 [US1] Create remediation dashboard page in `app/[locale]/dashboard/remediation/page.js`
- [X] T018 [US1] Add empty state handling for students with no assessment history
- [X] T019 [US1] Add pagination support for large weakness lists (50+ items)

**Checkpoint**: User Story 1 complete - students can view their weakness dashboard with prioritized list

---

## Phase 4: User Story 2 - Deep-Link to Video at Exact Timestamp (Priority: P2)

**Goal**: Students click "Review Concept" and video player opens at exact timestamp where concept is explained

**Independent Test**: Click "Review Concept" on any weakness item, verify video player starts at correct timestamp

### Tests for User Story 2 ⚠️

- [X] T020 [P] [US2] Unit test for timestamp-resolver in `__tests__/lib/remediation/timestamp-resolver.test.js`
- [X] T021 [P] [US2] Unit test for markWeaknessViewed action in `__tests__/actions/remediation.test.js`

### Implementation for User Story 2

- [X] T022 [US2] Implement `resolveTimestampForConcept()` in `lib/remediation/timestamp-resolver.js` (ChromaDB query)
- [X] T023 [US2] Implement `markWeaknessViewed` Server Action in `app/actions/remediation.js`
- [X] T024 [US2] Implement `startRemediationSession` Server Action in `app/actions/remediation.js`
- [X] T025 [US2] Implement `endRemediationSession` Server Action in `app/actions/remediation.js`
- [X] T026 [US2] Create RemediationPlayer component in `app/[locale]/dashboard/remediation/_components/remediation-player.jsx`
- [X] T027 [US2] Add "Review Concept" button to WeaknessCard with deep-link navigation
- [X] T028 [US2] Add viewed indicator to WeaknessCard for concepts already reviewed
- [X] T029 [US2] Handle edge case: weakness with no video timestamp (disabled "Review Concept" button + tooltip: "No video segment available for this concept")

**Checkpoint**: User Story 2 complete - students can deep-link to video segments for remediation

---

## Phase 5: User Story 3 - Cross-Assessment Weakness Aggregation (Priority: P3)

**Goal**: System automatically aggregates weaknesses from BAT and Oral assessments within 30 seconds of submission

**Independent Test**: Student completes BAT and Oral assessments, weakness profile merges data from both sources correctly

### Tests for User Story 3 ⚠️

- [X] T030 [P] [US3] Unit test for remediation queue job in `__tests__/service/remediation-queue.test.js`
- [X] T031 [P] [US3] Integration test for aggregation trigger in `__tests__/actions/remediation.test.js`

### Implementation for User Story 3

- [X] T032 [US3] Create background job service in `service/remediation-queue.js`
- [X] T033 [US3] Create API route for job trigger in `app/api/remediation/aggregate/route.js`
- [X] T034 [US3] Add aggregation trigger hook to BAT submission in `app/actions/bat-quiz.js` (after submitBatBlock)
- [X] T035 [US3] Add aggregation trigger hook to Oral submission in `app/actions/oral-assessment.js` (after submitOralResponse)
- [X] T036 [US3] Implement weakness merging logic (same concept from multiple sources)
- [X] T037 [US3] Implement weakness resolution detection (concept passed in subsequent assessment)
- [X] T038 [US3] Add `lastAggregatedAt` timestamp tracking and display

**Checkpoint**: User Story 3 complete - weakness profiles auto-update within 30 seconds of assessment completion

---

## Phase 6: User Story 4 - Weakness Priority Scoring (Priority: P4)

**Goal**: Weaknesses ranked by severity (frequency, recency, source diversity) so students focus on most impactful concepts

**Independent Test**: Student with multiple weaknesses sees them sorted by priority, with repeated/recent failures ranked higher

### Tests for User Story 4 ⚠️

- [X] T039 [P] [US4] Unit test for priority scoring algorithm in `__tests__/lib/remediation/priority-scorer.test.js`

### Implementation for User Story 4

- [X] T040 [US4] Implement `calculatePriorityScore()` in `lib/remediation/priority-scorer.js`
- [X] T041 [US4] Integrate priority scoring into aggregator (recalculate on each update)
- [X] T042 [US4] Add priority score display to WeaknessCard (visual indicator)
- [X] T043 [US4] Ensure weakness list is sorted by priority score descending

**Checkpoint**: User Story 4 complete - weaknesses sorted by intelligent priority scoring

---

## Phase 7: Instructor Analytics (Cross-Cutting)

**Purpose**: Anonymized class-level weakness patterns for instructors

- [X] T044 [P] Unit test for getClassWeaknessAggregation in `__tests__/actions/remediation.test.js`
- [X] T045 Implement `getClassWeaknessAggregation` Server Action in `app/actions/remediation.js`
- [X] T046 Create instructor analytics component (optional - can be added to existing instructor dashboard)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T047 [P] Add loading states to all async components
- [X] T048 [P] Add error boundary and error handling to dashboard page
- [X] T049 [P] Ensure WCAG 2.1 AA accessibility compliance for all components
- [X] T050 [P] Add responsive design for mobile view
- [X] T051 Performance optimization: ensure dashboard loads < 3 seconds
- [X] T052 Run quickstart.md validation scenarios
- [X] T053 Update existing dashboard navigation to include remediation link

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
- **Instructor Analytics (Phase 7)**: Depends on US1 and US3 models/actions
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Depends On | Can Run After |
|-------|------------|---------------|
| US1 (P1) | Foundational | Phase 2 complete |
| US2 (P2) | US1 components | Phase 3 complete |
| US3 (P3) | Foundational + models | Phase 2 complete (parallel with US1) |
| US4 (P4) | US1 + US3 aggregator | Phase 3 + Phase 5 complete |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Library functions before Server Actions
3. Server Actions before UI components
4. Core implementation before edge case handling
5. Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T004, T005, T006 can all run in parallel (different files)

**Phase 3 (US1)**:
- T008, T009 tests can run in parallel
- T010, T011 aggregator work MUST be sequential (same file `aggregator.js`)
- T014, T015, T016 components can all run in parallel

**Phase 4 (US2)**:
- T020, T021 tests can run in parallel
- T026, T027, T028 UI work sequential (component dependencies)

**Phase 5 (US3)**:
- T030, T031 tests can run in parallel
- T034, T035 trigger hooks can run in parallel (different files)

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tasks together:
Task: "Create WeaknessProfile Mongoose model in model/weakness-profile.model.js"
Task: "Create RemediationSession Mongoose model in model/remediation-session.model.js"
Task: "Create Zod validation schemas in lib/validations/remediation.js"
```

## Parallel Example: User Story 1 Components

```bash
# Launch all US1 components together:
Task: "Create WeaknessCard component in app/[locale]/dashboard/remediation/_components/weakness-card.jsx"
Task: "Create WeaknessList component in app/[locale]/dashboard/remediation/_components/weakness-list.jsx"
Task: "Create ResolvedSection component in app/[locale]/dashboard/remediation/_components/resolved-section.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently
5. Deploy/demo if ready - students can view weakness dashboard

### Incremental Delivery

| Milestone | Stories Complete | User Value |
|-----------|-----------------|------------|
| MVP | US1 | Students see their weaknesses |
| v1.1 | US1 + US2 | Students can deep-link to video content |
| v1.2 | US1 + US2 + US3 | Real-time aggregation from assessments |
| v1.3 | All | Intelligent priority ranking |

### Suggested MVP Scope

**Phase 1 + Phase 2 + Phase 3 (User Story 1)**

This delivers:
- ✅ WeaknessProfile and RemediationSession models
- ✅ getWeaknessProfile Server Action
- ✅ Dashboard page with weakness list
- ✅ Empty state handling
- ✅ Pagination support

Students can immediately see their aggregated weaknesses from BAT and Oral assessments.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing BAT/Oral code modifications (T034, T035) should be minimal trigger hooks only

---

## Task Summary

| Phase | Task Count | Parallel Tasks |
|-------|------------|----------------|
| Setup | 3 | 1 |
| Foundational | 4 | 3 |
| US1 (P1) - MVP | 12 | 6 |
| US2 (P2) | 10 | 2 |
| US3 (P3) | 9 | 2 |
| US4 (P4) | 5 | 1 |
| Instructor Analytics | 3 | 1 |
| Polish | 7 | 4 |
| **Total** | **53** | **20** |
