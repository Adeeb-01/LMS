# Feature Specification: Quiz System Improvements

**Feature Branch**: `001-improve-quiz-system`  
**Created**: 2026-03-05  
**Status**: Draft  
**Input**: User description: "Improve the quiz system and fix any problems"

## Clarifications

### Session 2026-03-05

- Q: When a student fails a quiz, can they immediately retry (if attempts remain), or should there be a cooldown period? → A: Immediate retry allowed (if attempts remain)
- Q: How robust should offline support be during quiz-taking? → A: Graceful reconnection only (localStorage backup, sync on reconnect)
- Q: Should these improvements include explicit accessibility compliance? → A: WCAG 2.1 AA essentials (keyboard nav, screen reader labels, focus management)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Quiz Timer with Graceful Expiration (Priority: P1)

Students taking timed quizzes need a reliable countdown timer that accurately reflects remaining time and handles expiration gracefully without losing their answers.

**Why this priority**: A broken or unreliable timer directly impacts assessment integrity and student experience. Lost answers due to timer issues create frustration and unfair grading.

**Independent Test**: Can be fully tested by starting a timed quiz, letting the timer count down, and verifying the quiz auto-submits with all answers preserved when time expires.

**Acceptance Scenarios**:

1. **Given** a student starts a quiz with a 10-minute time limit, **When** they answer questions and the timer reaches zero, **Then** the quiz auto-submits with all their current answers saved and they see their results.

2. **Given** a student is mid-quiz and refreshes the page, **When** the page reloads, **Then** the timer continues from the correct remaining time (not restarted) and all previous answers are restored.

3. **Given** a student loses internet connection during a quiz, **When** they reconnect within the time limit, **Then** their locally-saved answers are synced and they can continue.

4. **Given** a student's quiz expires while they're on the results page, **When** they try to modify answers, **Then** they see a clear message that the quiz has ended and cannot make changes.

---

### User Story 2 - Clear Quiz Results with Answer Review (Priority: P2)

After completing a quiz, students need to understand their performance through clear score display, pass/fail status, and access to correct answers (based on instructor settings).

**Why this priority**: Understanding what went wrong helps students learn. Without proper feedback, quizzes become assessment-only rather than learning tools.

**Independent Test**: Can be fully tested by completing a quiz and verifying all result components display correctly including score, pass/fail, and answer review based on the quiz's `showAnswersPolicy` setting.

**Acceptance Scenarios**:

1. **Given** a student submits a quiz with `showAnswersPolicy: "after_submit"`, **When** they view results, **Then** they see their score, pass/fail status, each question with their answer, the correct answer, and any explanation provided.

2. **Given** a student submits a quiz with `showAnswersPolicy: "after_pass"` and they failed, **When** they view results, **Then** they see their score and pass/fail status but NOT the correct answers.

3. **Given** a student submits a quiz with `showAnswersPolicy: "never"`, **When** they view results, **Then** they see only their score and pass/fail status with no answer details.

4. **Given** a student has multiple attempts on a quiz, **When** they view their attempt history, **Then** they see a list of all attempts with dates, scores, and pass/fail status for each.

---

### User Story 3 - Quiz Progress Integration with Course Completion (Priority: P2)

Required quizzes must be integrated into the course progress system so that students cannot receive certificates without passing required quizzes.

**Why this priority**: Course certificates must reflect actual competency. If required quizzes can be bypassed, certificates lose their value.

**Independent Test**: Can be fully tested by setting a quiz as "required", completing all lessons, and verifying the certificate download is blocked until the required quiz is passed.

**Acceptance Scenarios**:

1. **Given** a course has a required quiz and a student completes all lessons but not the quiz, **When** they try to download their certificate, **Then** they see a message indicating they must pass the required quiz first.

2. **Given** a student passes all required quizzes for a course, **When** they complete all lessons, **Then** the course shows 100% completion and the certificate becomes available.

3. **Given** a course has multiple required quizzes, **When** a student views the course sidebar, **Then** they see which quizzes are required and their completion status (not started / in progress / passed / failed).

---

### User Story 4 - Improved Quiz Question Navigation (Priority: P3)

Students need to easily navigate between quiz questions, see which questions they've answered, and jump to specific questions without losing their progress.

**Why this priority**: Good navigation reduces cognitive load and helps students manage their time effectively during timed quizzes.

**Independent Test**: Can be fully tested by starting a multi-question quiz and using navigation controls to move between questions while verifying answers persist.

**Acceptance Scenarios**:

1. **Given** a student is taking a 10-question quiz, **When** they view the quiz interface, **Then** they see a question navigator showing all question numbers with visual indicators for answered/unanswered/current.

2. **Given** a student has answered question 3 and clicks on question 7 in the navigator, **When** question 7 loads, **Then** their answer to question 3 is preserved and auto-saved.

3. **Given** a student is on the last question, **When** they click "Next", **Then** they see a summary view showing all questions with answered/unanswered status and a "Submit Quiz" button.

---

### Edge Cases

- What happens when a student's session expires mid-quiz? (Auto-save should preserve answers; student must re-authenticate to continue if time remains)
- How does the system handle simultaneous quiz attempts from different devices? (Only one active attempt allowed; second device shows warning)
- What happens if a question is deleted from a quiz that has in-progress attempts? (In-progress attempts continue with existing questions; deleted question is skipped in grading)
- How are partially completed quizzes handled when a student is un-enrolled? (Attempt is marked as abandoned; no grade recorded)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a real-time countdown timer for timed quizzes that syncs with server time.
- **FR-002**: System MUST auto-save student answers every 30 seconds during quiz-taking (server-side) with localStorage backup (client-side).
- **FR-003**: System MUST auto-submit quizzes when the time limit expires, preserving all answers entered up to that point.
- **FR-004**: System MUST restore quiz progress (answers and remaining time) when a student refreshes or returns to an in-progress quiz.
- **FR-005**: System MUST display quiz results according to the `showAnswersPolicy` setting (never/after_submit/after_pass).
- **FR-006**: System MUST block certificate download for courses with unmet required quiz requirements.
- **FR-007**: System MUST display required quiz status in the course progress indicators.
- **FR-008**: System MUST provide a question navigator showing answered/unanswered/current status.
- **FR-009**: System MUST display a quiz summary before final submission showing all questions and their answer status.
- **FR-010**: System MUST handle expired attempts gracefully with clear messaging to the student.
- **FR-011**: System MUST prevent duplicate active quiz attempts from the same student.
- **FR-012**: System MUST allow immediate quiz retry after a failed attempt (no cooldown), provided the student has remaining attempts.
- **FR-013**: System MUST sync localStorage-cached answers to server upon network reconnection (graceful reconnection, not full offline-first).

### Non-Functional Requirements (Accessibility)

- **NFR-001**: Quiz interface MUST be fully navigable via keyboard (Tab, Enter, Arrow keys).
- **NFR-002**: All interactive elements MUST have appropriate ARIA labels for screen readers.
- **NFR-003**: Focus MUST be visually indicated and managed correctly during question navigation.
- **NFR-004**: Timer announcements MUST be accessible to screen readers (aria-live regions for critical time warnings).
- **NFR-005**: Color contrast MUST meet WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text).

### Key Entities

- **Quiz**: Assessment unit with title, time limit, pass percentage, max attempts, required flag, and answer display policy
- **Question**: Individual quiz question with type (single/multi/true_false), options, correct answers, points, and explanation
- **Attempt**: Student's quiz attempt with status (in_progress/submitted/expired), answers, score, and timestamps
- **Course Progress**: Student's overall course completion that must integrate quiz requirements

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can complete a timed quiz from start to finish with accurate timer display (deviation < 2 seconds from server time)
- **SC-002**: Zero data loss incidents during quiz-taking due to page refresh, network issues, or session timeout
- **SC-003**: 100% of required quiz requirements enforced for certificate eligibility
- **SC-004**: Quiz results page loads in under 2 seconds after submission
- **SC-005**: Students can navigate between all quiz questions without losing any previously entered answers
- **SC-006**: Auto-save operates silently without interrupting the student's quiz-taking flow

## Assumptions

- The existing quiz models (Quiz, Question, Attempt) provide a sufficient data structure for these improvements
- Auto-save will use the existing `autosaveAttempt` server action
- Timer synchronization will use the `expiresAt` field already present in attempts
- Certificate eligibility logic can be extended without breaking existing certificate generation
