# Feature Specification: Block-Based Adaptive Testing Engine (BAT)

**Feature Branch**: `018-block-adaptive-testing`  
**Created**: 2026-03-30  
**Status**: Draft  
**Input**: User description: "Epic 2: Block-Based Adaptive Testing Engine - BAT"

## Overview

The Block-Based Adaptive Testing (BAT) engine enhances the existing adaptive testing system by grouping questions into "blocks" rather than presenting them individually. Each block contains two questions of the same difficulty level, and ability estimation (θ) is recalculated only after a complete block is submitted. This approach reduces server load, provides psychological stability for students (no jarring difficulty shifts between consecutive questions), and delivers precise ability measurement in exactly 10 questions (5 blocks).

## Clarifications

### Session 2026-03-30

- Q: What is the initial ability (θ) value used to select the first block? → A: θ = 0.0 (average ability), following standard IRT practice.
- Q: What are the definitive difficulty band boundaries? → A: 3 bands — Easy (b < -1), Medium (-1 ≤ b ≤ 1), Hard (b > 1).
- Q: What is the minimum question pool requirement per difficulty band for BAT mode? → A: Minimum 4 questions per band (12 total).
- Q: How should concurrent sessions (same quiz, same student, multiple tabs/devices) be handled? → A: Single active session — new session invalidates/pauses existing session.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Block-Based Question Presentation (Priority: P1)

As a Student taking an adaptive test, I want to see two questions of the same difficulty level displayed together on a single screen, so that I can answer them as a cohesive unit without experiencing disorienting difficulty jumps between consecutive questions.

**Why this priority**: This is the core user-facing differentiator of BAT. Without block-based presentation, the entire feature's value proposition (psychological stability, cohesive assessment experience) is lost.

**Independent Test**: Can be fully tested by starting an adaptive quiz and verifying that exactly 2 questions appear per screen, both visually grouped and sharing the same difficulty band. Delivers immediate value by improving test-taking experience.

**Acceptance Scenarios**:

1. **Given** a student starts a BAT-enabled adaptive quiz, **When** the first block loads, **Then** exactly 2 questions are displayed on a single screen with a clear visual grouping indicating they belong together.
2. **Given** a block is displayed, **When** the student views the questions, **Then** both questions are from the same difficulty band (e.g., both "medium" or both "hard").
3. **Given** a student is viewing a block, **When** they answer one question but not the other, **Then** they cannot submit the block until both questions are answered.
4. **Given** a student has answered both questions in a block, **When** they click "Submit Block", **Then** both answers are submitted together as a single unit.

---

### User Story 2 - Staged Ability Estimation (Priority: P1)

As the Assessment Engine, I want to delay the recalculation of the student's ability (θ) until an entire block is submitted, and then select the next block based on the combined result, so that the adaptation is mathematically stable and server requests are minimized.

**Why this priority**: This is the technical foundation that enables all other BAT benefits—without staged estimation, we cannot achieve reduced query loads or stable adaptation.

**Independent Test**: Can be tested by completing a block and verifying that θ recalculation occurs only once per block (not per question), and that the next block's difficulty is determined by the updated θ value.

**Acceptance Scenarios**:

1. **Given** a student answers the first question in a block, **When** the answer is recorded, **Then** no ability recalculation occurs until the entire block is submitted.
2. **Given** a student submits a complete block (2 answered questions), **When** the submission is processed, **Then** the ability (θ) is recalculated using both responses together.
3. **Given** the ability has been recalculated after a block submission, **When** the next block is selected, **Then** the questions are chosen from a difficulty band matching the updated θ value.
4. **Given** the student answers both questions in a block correctly, **When** the next block is selected, **Then** the difficulty increases appropriately based on the improved θ estimate.
5. **Given** the student answers both questions in a block incorrectly, **When** the next block is selected, **Then** the difficulty decreases appropriately based on the lowered θ estimate.

---

### User Story 3 - Fixed-Length Test Termination (Priority: P1)

As the System, I want to automatically terminate the adaptive test after exactly 10 questions (5 blocks) are answered, so that I can provide a consistent, predictable assessment experience and finalize the student's score.

**Why this priority**: A defined termination point is essential for a complete assessment flow. Without it, tests would run indefinitely or require manual intervention.

**Independent Test**: Can be tested by completing 5 blocks (10 questions) and verifying the test automatically ends and produces a final score.

**Acceptance Scenarios**:

1. **Given** a student has completed 4 blocks (8 questions), **When** they submit the 5th block, **Then** the test automatically terminates and no further questions are presented.
2. **Given** a test has terminated after 5 blocks, **When** the final results are calculated, **Then** the student's final ability estimate (θ) is displayed.
3. **Given** a test has terminated, **When** results are shown, **Then** the student sees a summary of their performance across all 5 blocks.
4. **Given** a student is on block 3 of 5, **When** they view the progress indicator, **Then** it clearly shows "Block 3 of 5" or equivalent progress information.

---

### User Story 4 - Concept Tag Export for Missed Questions (Priority: P2)

As an Academic Decision Maker, I want the system to export the concept tags associated with incorrectly answered questions after test completion, so that I can identify knowledge gaps and inform remediation strategies.

**Why this priority**: This delivers actionable insights from the assessment but depends on the core assessment flow (P1 stories) being complete first.

**Independent Test**: Can be tested by completing a BAT quiz with some incorrect answers and verifying that concept tags for missed questions are captured and exportable.

**Acceptance Scenarios**:

1. **Given** a student has completed a BAT quiz with some incorrect answers, **When** the test terminates, **Then** the concept tags associated with each incorrectly answered question are recorded.
2. **Given** test results include missed concept tags, **When** an instructor views the results, **Then** they can see a list of concept areas where the student struggled.
3. **Given** a student answered all questions correctly, **When** the test terminates, **Then** the missed concept tags list is empty.
4. **Given** multiple students have completed BAT quizzes, **When** an instructor views aggregate data, **Then** they can identify commonly missed concepts across the class.

---

### User Story 5 - BAT Quiz Configuration (Priority: P2)

As an Instructor, I want to configure a quiz to use Block-Based Adaptive Testing mode, so that my students benefit from the improved assessment experience.

**Why this priority**: Instructors need a way to enable BAT mode, but this is configuration rather than core functionality.

**Independent Test**: Can be tested by creating/editing a quiz and enabling BAT mode, then verifying the quiz behaves as a block-based adaptive test.

**Acceptance Scenarios**:

1. **Given** an instructor is creating or editing a quiz, **When** they view quiz settings, **Then** they see an option to enable "Block-Based Adaptive Testing" mode.
2. **Given** BAT mode is enabled for a quiz, **When** the quiz configuration is saved, **Then** the quiz is marked as a BAT-enabled assessment.
3. **Given** a quiz has BAT mode enabled, **When** a student starts the quiz, **Then** questions are presented in blocks of 2 rather than individually.
4. **Given** a quiz has insufficient questions to form 5 complete blocks per difficulty band, **When** an instructor tries to enable BAT mode, **Then** they receive a warning about question pool requirements.

---

### Edge Cases

- What happens when a student's session is interrupted mid-block? (Block progress should be saved; student resumes at the same block)
- What happens if the question pool lacks sufficient questions for a required difficulty band? (System selects from the nearest available difficulty band and logs the deviation)
- How does the system handle a tie in block performance (1 correct, 1 incorrect)? (θ adjustment is proportional to expected performance; slight adjustment based on question parameters)
- What happens if a student attempts to navigate away mid-test? (Warning prompt; incomplete blocks are not scored until submitted)
- What if network connectivity is lost during block submission? (Client retries submission; answers are preserved locally until confirmed)
- What if a student opens the same quiz in multiple tabs/devices? (Single active session enforced; new session invalidates existing session, preserving progress up to last submitted block)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present exactly 2 questions per block on a single screen during a BAT-enabled quiz.
- **FR-002**: System MUST ensure both questions within a block belong to the same difficulty band.
- **FR-003**: System MUST require both questions in a block to be answered before allowing block submission.
- **FR-004**: System MUST recalculate student ability (θ) only after a complete block is submitted, using both responses together.
- **FR-005**: System MUST select the next block's difficulty based on the most recently calculated θ value.
- **FR-006**: System MUST terminate the BAT quiz after exactly 5 blocks (10 questions) are completed.
- **FR-007**: System MUST display a progress indicator showing current block number out of total blocks (e.g., "Block 2 of 5").
- **FR-008**: System MUST record concept tags associated with incorrectly answered questions upon test completion.
- **FR-009**: System MUST provide instructors with access to missed concept tags for individual students and aggregate class data.
- **FR-010**: System MUST allow instructors to enable or disable BAT mode when configuring a quiz.
- **FR-011**: System MUST validate that a quiz has at least 4 questions per difficulty band (minimum 12 total) before allowing BAT mode activation.
- **FR-012**: System MUST preserve block progress if a student's session is interrupted, allowing resumption from the same block.
- **FR-013**: System MUST prevent partial block submissions (both questions must be answered).
- **FR-014**: System MUST display a final ability estimate and performance summary upon test completion.
- **FR-015**: System MUST enforce single active session per attempt — opening a new session invalidates/pauses any existing session for the same quiz attempt, preserving progress up to the last submitted block.

### Key Entities

- **Block**: A grouped unit of 2 questions sharing the same difficulty band, presented together and submitted as a single unit. Tracks individual question IDs, responses, and submission status.
- **BAT Attempt**: An adaptive test session using block-based presentation. Extends the existing Attempt entity with block-specific tracking (current block number, block history, θ history per block).
- **Difficulty Band**: A categorization of questions into three discrete difficulty levels based on IRT difficulty parameter (b): Easy (b < -1), Medium (-1 ≤ b ≤ 1), Hard (b > 1). Each band contains questions within its defined range.
- **Concept Tag**: A label identifying the knowledge area or learning objective that a question assesses. Used for diagnostic feedback on missed questions.
- **Block Result**: The outcome of a submitted block, including individual question responses, combined scoring, and the resulting θ adjustment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students complete BAT assessments in 5 blocks (10 questions) with 100% consistency—no tests terminate early or extend beyond the fixed length.
- **SC-002**: Server requests for adaptive question selection are reduced by at least 50% compared to per-question adaptation (5 selection calls vs. 10).
- **SC-003**: Student ability estimates (θ) at test completion show equivalent or improved precision compared to item-by-item adaptive testing with the same number of questions.
- **SC-004**: 90% of students report the block-based experience as "less stressful" or "more manageable" compared to item-by-item adaptation in post-assessment surveys.
- **SC-005**: Instructors can identify at least 3 specific concept areas where a student needs improvement based on missed concept tag data.
- **SC-006**: System handles session interruptions gracefully—students can resume interrupted tests within 24 hours without data loss.
- **SC-007**: Quiz configuration for BAT mode can be completed by an instructor in under 2 minutes.

## Assumptions

- The existing IRT-based adaptive testing infrastructure (from feature 016-adaptive-irt-testing) is available and functioning.
- Questions in the question pool have associated IRT parameters (difficulty, discrimination) and concept tags.
- The system uses a 3PL (Three-Parameter Logistic) or 2PL IRT model for ability estimation.
- Initial ability estimate (θ) for all students is set to 0.0 (average ability) at test start, following standard IRT convention.
- Block size is fixed at 2 questions; future iterations may allow configurable block sizes.
- Total test length is fixed at 10 questions (5 blocks); future iterations may allow configurable lengths.
- Difficulty bands are defined as: Easy (b < -1), Medium (-1 ≤ b ≤ 1), Hard (b > 1), based on the IRT difficulty parameter (b).
- Standard web session timeout policies apply; "session interruption" refers to browser closure or network loss, not deliberate navigation away from the test.

## Out of Scope

- Configurable block sizes (blocks are fixed at 2 questions for this iteration)
- Configurable test lengths (tests are fixed at 10 questions / 5 blocks)
- Real-time proctoring or anti-cheating measures
- Integration with external Learning Management Systems (LMS) for concept tag export
- Gamification elements (badges, leaderboards) for test completion
- Mobile-specific UI optimizations (responsive web design is assumed sufficient)
