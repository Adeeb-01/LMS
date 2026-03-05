# Tasks: Quiz System Improvements

**Input**: Design documents from `/specs/001-improve-quiz-system/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Manual testing with acceptance scenarios (no automated test tasks - unit tests for timer logic are recommended but not mandated)

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- All file paths are relative to repository root (`D:\LMS-main`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add i18n keys and prepare shared utilities

- [x] T001 Add quiz improvement i18n keys to `messages/en.json` (timeRemaining, questionNavigator, reviewAnswers, etc. per quickstart.md)
- [x] T002 [P] Add quiz improvement i18n keys to `messages/ar.json` (Arabic translations)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared localStorage utility used by US1 (auto-save) and US4 (navigation persistence)

**⚠️ CRITICAL**: US1 and US4 depend on this phase

- [x] T003 Create localStorage helper module in `lib/quiz-storage.js` with saveAnswers, loadAnswers, clearAnswers, cleanupStale, hasNewerAnswers functions per contracts/server-actions.md

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Reliable Quiz Timer with Graceful Expiration (Priority: P1) 🎯 MVP

**Goal**: Students can take timed quizzes with accurate countdown, auto-submit on expiration, and answer persistence across page refresh/reconnection

**Independent Test**: Start a timed quiz, answer questions, refresh page (timer and answers restored), let timer expire (auto-submits with answers preserved)

### Implementation for User Story 1

- [x] T004 [P] [US1] Create isolated timer component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/quiz-timer.jsx` with ARIA live announcements at 5min/1min/30sec/10sec
- [x] T005 [P] [US1] Update autosave logic in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/quiz-taking-interface.jsx` to use quiz-storage.js for localStorage backup on every answer change
- [x] T006 [US1] Integrate quiz-timer.jsx into quiz-taking-interface.jsx, replacing inline timer code (lines 112-127)
- [x] T007 [US1] Implement timer restoration on page load in quiz-taking-interface.jsx - calculate remaining from server expiresAt, sync with localStorage
- [x] T008 [US1] Implement auto-submit when timer reaches zero in quiz-taking-interface.jsx - call submitAttempt with current answers
- [x] T009 [US1] Add localStorage sync on reconnection in quiz-taking-interface.jsx - compare timestamps, keep newer, sync to server
- [x] T010 [US1] Handle expired attempt gracefully in quiz-taking-interface.jsx - show clear message if attempt already expired on load
- [x] T011 [US1] Clear localStorage entry on successful submission in quiz-taking-interface.jsx

**Checkpoint**: User Story 1 complete - timed quizzes work reliably with auto-save and auto-submit

---

## Phase 4: User Story 2 - Clear Quiz Results with Answer Review (Priority: P2)

**Goal**: Students see clear results with score, pass/fail, and answer review based on showAnswersPolicy

**Independent Test**: Complete a quiz, view results with different showAnswersPolicy settings (never/after_submit/after_pass), verify correct information displayed

### Implementation for User Story 2

- [x] T012 [P] [US2] Implement getQuizResultWithReview server action in `app/actions/quizv2.js` per contracts/server-actions.md - enforce showAnswersPolicy server-side
- [x] T013 [P] [US2] Create answer review component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/results-review.jsx` - show questions, student answers, correct answers (if allowed), explanations
- [x] T014 [US2] Update results page in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/result/page.jsx` to use getQuizResultWithReview action
- [x] T015 [US2] Integrate results-review.jsx into result/page.jsx with conditional rendering based on showAnswersPolicy
- [x] T016 [US2] Add attempt history display to result/page.jsx - list all attempts with dates, scores, pass/fail status
- [x] T017 [US2] Add keyboard navigation and ARIA labels to results-review.jsx per NFR-001, NFR-002

**Checkpoint**: User Story 2 complete - results display correctly with policy-based answer review

---

## Phase 5: User Story 3 - Quiz Progress Integration with Course Completion (Priority: P2)

**Goal**: Required quizzes block certificate download until passed, progress shown in course UI

**Independent Test**: Set quiz as required, complete all lessons, verify certificate blocked until quiz passed

### Implementation for User Story 3

- [x] T018 [P] [US3] Implement checkCertificateEligibility server action in `app/actions/quizProgressv2.js` per contracts/server-actions.md
- [x] T019 [P] [US3] Implement getCourseQuizProgress server action in `app/actions/quizProgressv2.js` per contracts/server-actions.md
- [x] T020 [US3] Update certificate download logic to call checkCertificateEligibility before allowing download (locate existing certificate component/action)
- [x] T021 [US3] Display pending required quizzes when certificate is blocked with link to quiz
- [x] T022 [US3] Add required quiz status badges to course sidebar/progress UI using getCourseQuizProgress
- [x] T023 [US3] Update quiz list page `app/[locale]/(main)/courses/[id]/quizzes/page.jsx` to show required badge and completion status

**Checkpoint**: User Story 3 complete - certificate eligibility enforced, progress visible

---

## Phase 6: User Story 4 - Improved Quiz Question Navigation (Priority: P3)

**Goal**: Students can navigate between questions easily with visual progress indicators

**Independent Test**: Start multi-question quiz, use navigator to jump between questions, verify answers persist, see summary before submit

### Implementation for User Story 4

- [x] T024 [P] [US4] Create question navigator component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/question-navigator.jsx` with pills showing answered/unanswered/current status per quickstart.md
- [x] T025 [P] [US4] Create quiz summary component in `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/quiz-summary.jsx` showing all questions with answer status and submit button
- [x] T026 [US4] Integrate question-navigator.jsx into quiz-taking-interface.jsx - render above/beside question area
- [x] T027 [US4] Implement navigation via question-navigator - clicking pill jumps to that question with auto-save
- [x] T028 [US4] Show quiz-summary.jsx when user clicks "Next" on last question instead of immediately submitting
- [x] T029 [US4] Add keyboard navigation to question-navigator.jsx - arrow keys to move focus, enter to select per NFR-001
- [x] T030 [US4] Add ARIA labels and focus management to question-navigator.jsx per NFR-002, NFR-003

**Checkpoint**: User Story 4 complete - question navigation fully functional with accessibility

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility verification, cleanup, documentation

- [x] T031 [P] Verify color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for large text) in all new components per NFR-005
- [x] T032 [P] Add any missing ARIA labels across all new components per NFR-002
- [x] T033 Verify focus indicators visible on all interactive elements per NFR-003
- [x] T034 [P] Update README.md if any new environment variables or setup steps required
- [x] T035 Run manual acceptance tests for all 4 user stories per spec.md acceptance scenarios
- [x] T036 Code cleanup - remove any console.log statements, unused imports

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────────┐
     │                                                        │
     ▼                                                        │
Phase 2 (Foundational) ──────────────────────────────────────┤
     │                                                        │
     ├──────────────────┬──────────────────┬─────────────────┤
     ▼                  ▼                  ▼                  │
Phase 3 (US1)    Phase 4 (US2)    Phase 5 (US3)              │
     │                  │                  │                  │
     └──────────────────┴─────────┬────────┘                  │
                                  ▼                           │
                           Phase 6 (US4) ────────────────────►│
                                  │                           │
                                  ▼                           │
                           Phase 7 (Polish) ◄─────────────────┘
```

### User Story Dependencies

| Story | Can Start After | Dependencies on Other Stories |
|-------|-----------------|-------------------------------|
| US1 (P1) | Phase 2 | None - fully independent |
| US2 (P2) | Phase 2 | None - fully independent |
| US3 (P2) | Phase 2 | None - fully independent |
| US4 (P3) | Phase 2 | Builds on US1 localStorage pattern but independently testable |

### Within Each User Story

1. [P] tasks can run in parallel
2. Server actions before UI components that use them
3. Core components before integration
4. Integration before accessibility polish

---

## Parallel Opportunities

### Phase 1 (Setup)
```
Parallel: T001, T002 (different locale files)
```

### Phase 3 (US1)
```
Parallel: T004, T005 (different files)
Then sequential: T006 → T007 → T008 → T009 → T010 → T011
```

### Phase 4 (US2)
```
Parallel: T012, T013 (action vs component)
Then sequential: T014 → T015 → T016 → T017
```

### Phase 5 (US3)
```
Parallel: T018, T019 (different actions)
Then sequential: T020 → T021 → T022 → T023
```

### Phase 6 (US4)
```
Parallel: T024, T025 (different components)
Then sequential: T026 → T027 → T028 → T029 → T030
```

### Across User Stories
```
After Phase 2 completes, these can run in parallel:
- US1 (Phase 3)
- US2 (Phase 4)
- US3 (Phase 5)

US4 (Phase 6) can start after Phase 2, but may benefit from US1 completion
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: User Story 1 (T004-T011)
4. **STOP and VALIDATE**: Test timer, auto-save, auto-submit, page refresh
5. Deploy/demo - reliable quiz timer is the most critical fix

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 | Reliable timed quizzes with no data loss |
| +1 | US1 + US2 | + Clear results with answer review |
| +2 | US1 + US2 + US3 | + Certificate eligibility enforcement |
| Full | All | + Enhanced navigation experience |

### Recommended Order

1. **US1 first** (P1) - Fixes critical timer/data loss issues
2. **US2 + US3 in parallel** (both P2) - Results and progress integration
3. **US4 last** (P3) - Navigation enhancement (nice-to-have)

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 36 |
| Setup Tasks | 2 |
| Foundational Tasks | 1 |
| US1 Tasks | 8 |
| US2 Tasks | 6 |
| US3 Tasks | 6 |
| US4 Tasks | 7 |
| Polish Tasks | 6 |
| Parallelizable Tasks | 14 (marked [P]) |

---

## Notes

- No schema migrations required - all features use existing model fields
- Existing server actions (`autosaveAttempt`, `submitAttempt`) are reused
- 3 new server actions: `getQuizResultWithReview`, `checkCertificateEligibility`, `getCourseQuizProgress`
- 4 new UI components: `quiz-timer.jsx`, `results-review.jsx`, `question-navigator.jsx`, `quiz-summary.jsx`
- 1 new utility: `lib/quiz-storage.js`
- All i18n keys documented in quickstart.md
