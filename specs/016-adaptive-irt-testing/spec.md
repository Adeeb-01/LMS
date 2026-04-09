# Feature Specification: Adaptive IRT Testing

**Feature Branch**: `016-adaptive-irt-testing`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "As a University Director / System Administrator, I want the system to dynamically adjust test difficulty based on real-time student performance using Item Response Theory (IRT), so that we can accurately and efficiently measure the student's true ability (θ) with significantly fewer questions, reducing test anxiety and providing a highly personalized assessment."

## Clarifications

### Session 2026-03-14
- Q: Who can view a student's ability estimate (θ)? → A: Student + course instructors/admins only (not peers, not university-wide admins without course access).
- Q: Which ability estimation algorithm should be used (MLE or EAP)? → A: EAP (Expected A Posteriori) with standard normal prior, which handles extreme response patterns gracefully.
- Q: How should concurrent device access during an adaptive quiz be handled? → A: Allow only one active session; block second device with message.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Take an Adaptive Quiz with Dynamic Difficulty Adjustment (Priority: P1)

As a student, I want to take a quiz that automatically adapts to my ability level so that I am challenged appropriately without facing questions that are too easy (boring) or too hard (frustrating), making the assessment experience efficient and personalized.

**Why this priority**: This is the core user experience of adaptive testing. Without dynamic question selection based on real-time performance, the feature provides no value over traditional fixed-form quizzes.

**Independent Test**: Can be fully tested by having a student take an adaptive quiz and observing that after correct answers, harder questions appear, and after incorrect answers, easier questions appear, with a visible ability estimate updating throughout.

**Acceptance Scenarios**:

1. **Given** a student starts an adaptive quiz with an initial ability estimate of 0.0 (average), **When** they answer the first question correctly, **Then** the system presents a harder question (higher difficulty parameter) and their displayed ability estimate increases.

2. **Given** a student has answered several questions and their estimated ability is high (+1.5), **When** they answer a question incorrectly, **Then** the system presents an easier question and their ability estimate decreases.

3. **Given** a student is mid-quiz, **When** they view their progress indicator, **Then** they see their current ability estimate displayed in an understandable format (e.g., percentile or proficiency level) rather than raw θ values.

4. **Given** a student has a very high or very low ability, **When** the system selects questions, **Then** it prioritizes questions with difficulty levels that maximize information gain for that ability level.

---

### User Story 2 - Efficient Test Termination Based on Measurement Precision (Priority: P1)

As a student, I want the adaptive quiz to end when my ability has been measured with sufficient precision, so that I don't waste time answering unnecessary questions while still receiving an accurate assessment.

**Why this priority**: The primary value proposition of adaptive testing is efficiency—measuring ability with fewer questions. Without intelligent stopping rules, students might answer the same number of questions as a traditional quiz.

**Independent Test**: Can be fully tested by taking an adaptive quiz and verifying it terminates early when the standard error of the ability estimate falls below the configured threshold, displaying final results with confidence information.

**Acceptance Scenarios**:

1. **Given** an adaptive quiz is configured with a precision threshold (standard error ≤ 0.3), **When** a student's responses lead to a precise ability estimate (SE < 0.3), **Then** the quiz terminates even if fewer than the maximum questions have been answered.

2. **Given** an adaptive quiz with a minimum of 5 questions, **When** a student has only answered 3 questions, **Then** the quiz continues even if the precision threshold is met, ensuring face validity.

3. **Given** an adaptive quiz with a maximum of 20 questions, **When** a student reaches 20 questions without achieving the precision threshold, **Then** the quiz terminates with a note about measurement confidence.

4. **Given** a student completes an adaptive quiz, **When** they view their results, **Then** they see their ability estimate, the confidence level of that estimate, and how many questions were required to reach that conclusion.

---

### User Story 3 - Create and Configure Adaptive Quizzes (Priority: P2)

As an instructor, I want to create quizzes that use adaptive testing, so that my students receive efficient, personalized assessments that accurately measure their abilities.

**Why this priority**: Instructors must be able to configure adaptive quizzes for students to take them. This is a prerequisite for student-facing functionality but ranks below the core adaptive algorithm.

**Independent Test**: Can be fully tested by creating an adaptive quiz, configuring its parameters (precision threshold, min/max questions), assigning questions with IRT parameters, and publishing it for students.

**Acceptance Scenarios**:

1. **Given** an instructor is creating a new quiz, **When** they select "Adaptive Testing" mode, **Then** they see additional configuration options specific to adaptive testing (precision threshold, min/max questions, content balancing rules).

2. **Given** an instructor is configuring an adaptive quiz, **When** they set the precision threshold to 0.25, minimum questions to 10, and maximum questions to 30, **Then** these settings are saved and applied when students take the quiz.

3. **Given** an instructor views their quiz question pool, **When** questions are displayed, **Then** they see each question's IRT parameters (difficulty, discrimination) and can filter/sort by these values.

4. **Given** an instructor attempts to publish an adaptive quiz with fewer than 3x the minimum questions in the pool, **When** they click publish, **Then** they receive a warning that the question pool may be insufficient for accurate adaptive testing.

---

### User Story 4 - View Adaptive Assessment Analytics (Priority: P3)

As an instructor or administrator, I want to view analytics about adaptive quiz performance, so that I can understand how well the adaptive algorithm is working and identify questions that need calibration.

**Why this priority**: Analytics are valuable for continuous improvement but are not essential for the core adaptive testing functionality.

**Independent Test**: Can be fully tested by reviewing analytics for an adaptive quiz after multiple students have completed it, verifying statistics on question usage, ability distributions, and test efficiency.

**Acceptance Scenarios**:

1. **Given** multiple students have completed an adaptive quiz, **When** an instructor views quiz analytics, **Then** they see the distribution of final ability estimates across students, average number of questions to termination, and average test duration.

2. **Given** an instructor views question-level analytics, **When** examining individual questions, **Then** they see how often each question was selected, its observed difficulty compared to the calibrated IRT parameter, and discrimination effectiveness.

3. **Given** questions have significant drift between calibrated and observed difficulty, **When** reviewing analytics, **Then** the system highlights these questions for re-calibration.

---

### Edge Cases

- What happens when the question pool is exhausted before termination criteria are met? (Quiz terminates with available questions, results include a note about limited question pool)
- How does the system handle a student who answers randomly? (Algorithm will converge to a low ability estimate; random response patterns are detectable through response time analysis but not blocked)
- What happens if all remaining questions have already been seen by the student in previous attempts? (System selects least-recently-seen questions or allows repeated questions with warning to instructor)
- How does the system handle students with disabilities who need extended time? (Adaptive mode focuses on question selection, not timing; standard accommodation settings apply)
- What happens if a student abandons an adaptive quiz mid-session? (Progress is saved; upon return, ability estimate continues from last state)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST implement the 3-Parameter Logistic (3PL) IRT model for probability calculation: P(θ) = c + (1-c) / (1 + e^(-a(θ-b))), where a=discrimination, b=difficulty, c=guessing parameter.
- **FR-002**: System MUST update the student's ability estimate (θ) after each question response using Expected A Posteriori (EAP) estimation with a standard normal prior distribution (mean=0, SD=1).
- **FR-003**: System MUST select the next question using Maximum Fisher Information criterion to maximize measurement precision at the current ability estimate.
- **FR-004**: System MUST support configurable stopping rules including: precision threshold (standard error), minimum questions, and maximum questions.
- **FR-005**: System MUST initialize each student's ability estimate at θ = 0.0 (population average) at the start of an adaptive quiz.
- **FR-006**: System MUST display the student's current ability estimate in a user-friendly format (e.g., "Advanced", "Intermediate", "Novice" or percentile rank).
- **FR-007**: System MUST prevent question repetition within a single adaptive quiz attempt.
- **FR-008**: System MUST calculate and store the standard error of the ability estimate after each response.
- **FR-009**: System MUST allow instructors to configure adaptive quiz parameters: precision threshold (default 0.30), minimum questions (default 5), maximum questions (default 30).
- **FR-010**: System MUST validate that an adaptive quiz has a sufficient question pool (minimum 3x the maximum question setting) before allowing publication.
- **FR-011**: System MUST support content balancing constraints to ensure questions from different topics/modules are represented proportionally.
- **FR-012**: System MUST display final results including: ability estimate, confidence interval, number of questions answered, and comparison to course benchmarks.
- **FR-013**: System MUST log all question selections, responses, and ability estimate updates for analytics and audit purposes.
- **FR-014**: System MUST handle edge cases where Fisher Information cannot be computed (e.g., all questions exhausted) by gracefully terminating the quiz.
- **FR-015**: System MUST restrict visibility of ability estimates (θ) to the student (their own results only) and course instructors/administrators; ability estimates MUST NOT be visible to peers or university-wide admins without course-level access.
- **FR-016**: System MUST allow only one active adaptive quiz session per student per quiz; if a student attempts to access the same in-progress adaptive quiz from a second device, the system MUST block the second session with a clear message indicating an active session exists elsewhere.

### Key Entities

- **Adaptive Quiz Configuration**: Extension of Quiz entity with adaptive-specific settings (precision threshold, min/max questions, content balancing rules, algorithm type).
- **Adaptive Attempt**: Extension of Attempt entity with ability estimate (θ), standard error, ability estimate history (per-question snapshots), and termination reason.
- **Question IRT Parameters**: Already exists from spec 009 - discrimination (a), difficulty (b), guessing (c) parameters stored with each Question.
- **Question Selection Log**: Records which questions were considered, their Fisher Information values, and why the selected question was chosen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Adaptive quizzes accurately estimate student ability (correlation ≥ 0.85 with full-length traditional quiz scores on the same content).
- **SC-002**: Students complete adaptive quizzes using 40-60% fewer questions than equivalent fixed-form quizzes while maintaining measurement precision.
- **SC-003**: 90% of adaptive quiz attempts terminate via precision threshold rather than reaching maximum questions (indicating efficient question pools).
- **SC-004**: Students report reduced test anxiety compared to traditional quizzes (measured via post-quiz survey, target: 25% reduction in reported anxiety).
- **SC-005**: Ability estimates have standard errors below the configured threshold for 95% of completed attempts.
- **SC-006**: Question selection completes in under 500ms to maintain a seamless testing experience.

## Assumptions

- IRT parameters (a, b, c) are available for all questions in adaptive quiz pools (per spec 009-question-irt-parameters).
- Question pools are pre-calibrated with accurate IRT parameters; initial calibration is outside the scope of this feature.
- The existing Quiz and Attempt models can be extended without breaking existing non-adaptive quizzes.
- Students taking adaptive quizzes have stable internet connections; full offline adaptive testing is not supported.
- The population mean ability is 0.0 with standard deviation 1.0 (standard IRT scale).
