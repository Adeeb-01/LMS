# Feature Specification: Add Oral Question Type

**Feature Branch**: `main`  
**Created**: 2026-03-07  
**Status**: Draft  
**Input**: User description: "I want to add a new question type called oral and a referenceAnswer text field so that the AI judge has a standard text to compare the student's spoken answer against , donot create a new barach , work in main branch"

## Clarifications

### Session 2026-03-07

- Q: Which AI provider/service should be used for the audio transcription and text evaluation? → A: OpenAI (Whisper for STT, GPT for evaluation)
- Q: Where and how should the raw audio files be stored before/after transcription? → A: Cloud Object Storage (e.g., AWS S3, Cloudflare R2) with CDN
- Q: How should the system handle the scenario where the student denies microphone permission or has no working microphone? → A: Mark the specific question as unanswerable/0 points, allow rest of assessment
- Q: Should the AI evaluation occur synchronously or asynchronously? → A: Asynchronous (background processing, user sees "Grading Pending" status)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an Oral Question (Priority: P1)

As an instructor, I want to create an "oral" question type and provide a standard `referenceAnswer` text so that I can evaluate students' spoken answers against a baseline.

**Why this priority**: Creating the question is the foundational step for this feature. Without it, students cannot answer oral questions, and AI cannot evaluate them.

**Independent Test**: Can be fully tested by creating a new question in the system with type "oral" and a populated `referenceAnswer` field, and verifying it saves correctly to the database.

**Acceptance Scenarios**:

1. **Given** I am creating a new question, **When** I select the "oral" question type, **Then** a text area for `referenceAnswer` should appear.
2. **Given** I have filled out the "oral" question details including `referenceAnswer`, **When** I save the question, **Then** the question is saved successfully with the correct type and reference text.

---

### User Story 2 - Answer an Oral Question (Priority: P2)

As a student taking an assessment, I want to be presented with an oral question and be able to provide my spoken response, so that I can be evaluated on my speaking skills.

**Why this priority**: Students need to be able to interact with the new question type to make it useful.

**Independent Test**: Can be tested by rendering an oral question in an assessment interface and submitting a response.

**Acceptance Scenarios**:

1. **Given** I am taking an assessment with an oral question, **When** I reach the oral question, **Then** I see the question prompt and an interface to provide my spoken answer.
2. **Given** I have provided my spoken answer, **When** I submit the assessment, **Then** my answer is saved successfully.

---

### User Story 3 - AI Evaluation of Oral Answer (Priority: P3)

As a system, I want to compare the student's spoken answer (transcribed to text or audio) against the instructor's `referenceAnswer` using an AI judge, so that the student receives an accurate automated grade.

**Why this priority**: This provides the automated grading value of the oral question type.

**Independent Test**: Can be tested by mocking a student's answer and triggering the AI evaluation process to compare it against the `referenceAnswer`.

**Acceptance Scenarios**:

1. **Given** a submitted student answer for an oral question, **When** the AI evaluation is triggered, **Then** the AI judge compares the student's answer against the `referenceAnswer` and assigns a score.

### Edge Cases

- What happens when the instructor leaves the `referenceAnswer` empty for an oral question?
- How does system handle very long or very short student spoken answers?
- What happens if the AI judge service is unavailable during evaluation?
- **Handling Microphone Issues**: If the student denies microphone permission or has no working microphone, the specific oral question is marked as unanswerable (0 points), but they are allowed to continue the rest of the assessment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support a new question type called `oral`.
- **FR-002**: System MUST allow instructors to input a `referenceAnswer` (text) when creating or editing an `oral` question.
- **FR-003**: System MUST store the `referenceAnswer` securely as part of the question data.
- **FR-004**: System MUST present the oral question properly in the assessment taking interface.
- **FR-005**: System MUST provide the `referenceAnswer` to OpenAI (GPT) when evaluating a student's transcribed answer to an oral question.
- **FR-006**: System MUST capture the student's raw audio response and the backend MUST handle the transcription via OpenAI (Whisper).
- **FR-007**: System MUST perform the AI evaluation asynchronously and display a "Grading Pending" status to the user until complete.

### Key Entities

- **Question**: Needs a new type (`oral`) and a new attribute (`referenceAnswer`).
- **Student Answer**: Needs to store the spoken response (as a cloud storage URL reference to the raw audio file and its corresponding transcribed text).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Instructors can successfully create and save an oral question with a `referenceAnswer` 100% of the time.
- **SC-002**: AI judge successfully receives the `referenceAnswer` and student answer for comparison during grading.
- **SC-003**: The oral question type integrates seamlessly without breaking existing question types (multiple choice, etc.).
