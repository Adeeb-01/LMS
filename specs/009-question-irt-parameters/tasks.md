# Tasks: Question IRT Parameters

**Input**: Design documents from `/specs/009-question-irt-parameters/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: The examples below include test tasks. Tests are MANDATORY for all new features as per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize test suite setup for Question model and service if not already present

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

*(No purely foundational prerequisites found outside of the core user story, as this is a targeted schema update)*

---

## Phase 3: User Story 1 - Support Item Response Theory (IRT) Parameters for Questions (Priority: P1) 🎯 MVP

**Goal**: Update the Question schema to include IRT parameters ($a$, $b$, $c$) and ensure they reset to defaults when question content is modified.

**Independent Test**: Can be fully tested by creating and retrieving a question with valid $a$, $b$, and $c$ parameters through the system's data layer, confirming the values are accurately persisted and validated. It also requires modifying a question's text and verifying the IRT parameters reset to defaults.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T002 [P] [US1] Create unit test for Zod schema validation in `tests/models/question.schema.test.js` (or similar schema test file) checking valid and invalid bounds for $a$ and $c$.
- [ ] T003 [P] [US1] Create unit test for Mongoose model creation/defaults in `tests/models/question.model.test.js` checking default values ($a=1.0, b=0.0, c=0.0$) when missing.
- [ ] T004 [P] [US1] Create unit test for Service/Middleware reset logic in `tests/services/question.test.js` verifying that updating `content` or `options` resets the IRT parameters.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Update Question Zod schema in `backend/src/schemas/question.js` to include the `irt` object with bounds validation (`a>0`, `0<=c<=1`).
- [ ] T006 [US1] Update Question Mongoose model in `backend/src/models/question.js` to include the embedded `irt` object with default values. (Depends on T005 logic understanding).
- [ ] T007 [US1] Implement IRT reset logic either as a `pre('save')` hook in `backend/src/models/question.js` or in the update function in `backend/src/services/question.js` when content/options change. (Depends on T006).

**Checkpoint**: At this point, the Question schema and reset logic should be fully functional and passing all tests.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T008 [P] Documentation updates (ensure README or developer docs reflect the new schema fields and reset behavior).
- [ ] T009 Code cleanup and linting verification.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Stories (Phase 3+)**: Depend on Setup phase
- **Polish (Final Phase)**: Depends on User Story 1 completion

### User Story Dependencies

- **User Story 1 (P1)**: Only dependent on setup.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Zod schema before Mongoose model
- Mongoose model before Service logic (reset logic)

### Parallel Opportunities

- All test creation tasks (T002, T003, T004) can run in parallel
- Zod schema update (T005) can run in parallel with test creation

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: T002 "Create unit test for Zod schema validation..."
Task: T003 "Create unit test for Mongoose model creation..."
Task: T004 "Create unit test for Service/Middleware reset logic..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: Test User Story 1 independently via automated tests.
4. Deploy/demo if ready

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
