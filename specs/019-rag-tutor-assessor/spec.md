# Feature Specification: Interactive RAG Tutor & Semantic Assessor

**Feature Branch**: `019-rag-tutor-assessor`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Interactive RAG Tutor & Semantic Assessor - combining system-directed oral assessments with a voice-enabled RAG tutor for deep comprehension of medical and scientific concepts during video lectures"

## Clarifications

### Session 2026-04-07

- Q: How long should the system retain audio recordings after transcription? → A: Delete audio after transcription completes; keep transcription text only.
- Q: Can students skip or bypass oral assessments? → A: Mandatory with bypass; student must attempt but can submit text response if voice fails.
- Q: Who creates the oral assessment questions? → A: Auto-generated from lecture content with instructor review/approval before activation.
- Q: Should there be limits on RAG tutor questions per session? → A: Soft limit of 10 questions per lesson with warning after threshold reached.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Directed Semantic Assessment (Priority: P1)

As the System, I prompt the student with a specific oral question during or after video segments, transcribe their voice response, and perform a semantic match against the reference answer to evaluate their conceptual understanding rather than exact word memorization.

**Why this priority**: This is the foundational assessment mechanism that validates whether students truly comprehend the material. Without semantic evaluation, the system cannot measure learning effectiveness. This enables the core value proposition: measuring deep understanding vs. rote memorization.

**Independent Test**: Can be fully tested by presenting a student with a pre-defined oral question, recording their voice response, transcribing it, and comparing the semantic similarity score against a reference answer. Delivers value by providing immediate feedback on conceptual understanding.

**Acceptance Scenarios**:

1. **Given** a student is watching a lecture video with an embedded assessment point, **When** the assessment point is reached, **Then** the video pauses and the system presents an oral question prompt (text + optional audio).

2. **Given** the system has prompted an oral question, **When** the student clicks the record button and speaks their answer, **Then** the system records audio for up to 2 minutes and provides visual feedback (recording indicator, time remaining).

3. **Given** a student has recorded their oral response, **When** the recording is submitted, **Then** the system transcribes the audio to text within 30 seconds.

4. **Given** a transcribed student response and a reference answer exist, **When** semantic matching is performed, **Then** the system generates a similarity score (0-100%) and identifies which key concepts were addressed/missing.

5. **Given** semantic matching is complete, **When** results are displayed, **Then** the student sees: their similarity score, which concepts they correctly explained, which concepts they missed, and optionally the reference answer for comparison.

6. **Given** a student scores below the passing threshold (configurable, default 60%), **When** results are displayed, **Then** the system suggests reviewing the relevant video segment before continuing.

---

### User Story 2 - Student-Initiated RAG Tutor (Priority: P2)

As a Student, I pause the video and ask the virtual tutor a voice question about an ambiguous point, so that the system queries the vector database and explains the concept strictly using the lecture's context.

**Why this priority**: Builds on the transcription infrastructure from P1 and adds interactive learning support. Enables students to resolve confusion in real-time without leaving the learning environment. Depends on existing ChromaDB embeddings from the lecture content.

**Independent Test**: Can be tested by having a student pause a video, ask a voice question like "What is the difference between X and Y mentioned at minute 5?", and verifying the system returns a contextually relevant answer sourced from the lecture content.

**Acceptance Scenarios**:

1. **Given** a student is watching a lecture video, **When** they click the "Ask Tutor" button, **Then** the video pauses and a voice recording interface appears.

2. **Given** the voice recording interface is active, **When** the student speaks their question and submits, **Then** the question is transcribed within 10 seconds.

3. **Given** a transcribed question, **When** the RAG query is performed, **Then** the system searches the lecture's embedded content (ChromaDB) and retrieves the most relevant chunks (top 3-5).

4. **Given** relevant context chunks are retrieved, **When** the answer is generated, **Then** the response strictly uses information from the lecture content without hallucinating external information.

5. **Given** the tutor has generated a response, **When** the answer is displayed, **Then** the student sees the explanation along with timestamp links to relevant video segments.

6. **Given** no relevant context is found in the lecture content, **When** the system cannot answer the question, **Then** it responds with "This topic is not covered in the current lecture" and suggests related topics that are covered.

---

### User Story 3 - Recite-Back Loop (Priority: P3)

As the AI Tutor, I require the student to orally "recite back" the explanation I just provided before they can resume the video, to eliminate passive learning and log concepts they fail to articulate.

**Why this priority**: This is a reinforcement mechanism that depends on both P1 (semantic assessment) and P2 (RAG tutor) being functional. It transforms passive Q&A into active recall, but is an enhancement rather than core functionality.

**Independent Test**: Can be tested by triggering a RAG tutor response, prompting the student to recite back the key points, evaluating their recitation against the tutor's explanation, and verifying the system logs any failed articulation attempts.

**Acceptance Scenarios**:

1. **Given** the RAG tutor has provided an explanation, **When** the explanation is dismissed, **Then** a "Recite Back" prompt appears asking the student to explain the concept in their own words.

2. **Given** the recite-back prompt is displayed, **When** the student records their recitation, **Then** the system transcribes and semantically compares it to the tutor's original explanation.

3. **Given** the recitation achieves sufficient semantic similarity (configurable, default 50%), **When** evaluation is complete, **Then** the student receives positive feedback and may resume the video.

4. **Given** the recitation fails to meet the similarity threshold, **When** evaluation is complete, **Then** the system highlights which concepts were missed and offers the option to try again or review the explanation.

5. **Given** a student fails the recite-back multiple times (configurable, default 3 attempts), **When** attempts are exhausted, **Then** the system logs this as a "concept gap", allows video resumption, and flags the topic for later review.

6. **Given** concept gaps are logged during a session, **When** the student completes the lecture, **Then** a summary shows all flagged concepts requiring additional study.

---

### Edge Cases

- What happens when audio recording fails (microphone permission denied, device unavailable)?
  - System displays clear error message with troubleshooting steps; offers text-input fallback.
  
- How does the system handle background noise or unclear speech in transcription?
  - If transcription confidence is below threshold, prompt student to re-record in a quieter environment.
  
- What happens if the student's internet connection drops during recording submission?
  - Audio is saved locally; automatic retry when connection restores; manual upload option available.
  
- How does the system handle very short or empty recordings?
  - Minimum recording duration of 3 seconds required; empty submissions prompt re-recording.
  
- What happens when the reference answer or lecture content has not been embedded?
  - System gracefully degrades: assessment points are skipped with notification; RAG tutor indicates "content not indexed yet".

- How does the system handle multiple languages or accents?
  - Transcription supports the configured course language; heavy accents may reduce accuracy but semantic matching is accent-agnostic.

## Requirements *(mandatory)*

### Functional Requirements

**Voice Recording & Transcription**
- **FR-001**: System MUST capture voice recordings up to 2 minutes in duration with clear start/stop controls.
- **FR-002**: System MUST transcribe recorded audio to text within 30 seconds for responses under 2 minutes.
- **FR-003**: System MUST provide visual feedback during recording (recording indicator, elapsed time, audio level meter).
- **FR-004**: System MUST support text input as fallback when voice recording is unavailable.
- **FR-005**: System MUST delete audio recordings immediately after successful transcription; only transcription text is retained.

**Assessment Authoring**
- **FR-006**: System MUST auto-generate oral assessment questions from embedded lecture content (extends 015-auto-mcq-generation pipeline).
- **FR-007**: System MUST require instructor review and explicit approval before auto-generated assessments become active for students.
- **FR-008**: System MUST support assessment states: draft (generated, pending review), approved (active for students), rejected (hidden).

**Semantic Assessment**
- **FR-009**: System MUST require students to submit a response (voice or text) before resuming video playback; assessments cannot be dismissed without an attempt.
- **FR-010**: System MUST compute semantic similarity between student responses and reference answers.
- **FR-011**: System MUST identify and report which key concepts from the reference answer were addressed.
- **FR-012**: System MUST identify and report which key concepts from the reference answer were missing.
- **FR-013**: System MUST support configurable passing thresholds for semantic matching (default 60%).
- **FR-014**: System MUST store assessment results including: question, transcribed response, similarity score, concept coverage, timestamp.

**RAG Tutor**
- **FR-015**: System MUST query the vector database using semantically embedded lecture content.
- **FR-016**: System MUST generate responses strictly grounded in retrieved lecture context (no hallucination).
- **FR-017**: System MUST include timestamp references to relevant video segments in tutor responses.
- **FR-018**: System MUST gracefully handle queries with no relevant context in the lecture.
- **FR-019**: System MUST enforce a soft limit of 10 tutor questions per lesson; display warning when limit approached and allow continued use with advisory message.

**Recite-Back Loop**
- **FR-020**: System MUST prompt recite-back after RAG tutor responses (configurable on/off per course).
- **FR-021**: System MUST allow configurable attempt limits for recite-back (default 3).
- **FR-022**: System MUST log concept gaps when students fail to articulate explanations.
- **FR-023**: System MUST provide end-of-session summary of all flagged concept gaps.

**Integration**
- **FR-024**: System MUST integrate with existing video player to pause at assessment points.
- **FR-025**: System MUST utilize existing ChromaDB embeddings from lecture content (depends on 014-semantic-embeddings-pipeline).
- **FR-026**: System MUST utilize existing Whisper transcription (depends on 013-text-video-sync).

### Key Entities

- **OralAssessment**: Represents a system-directed oral question at a specific video timestamp; includes question text, reference answer, key concepts, passing threshold.

- **StudentResponse**: Captures a student's oral answer attempt; includes audio recording reference, transcription, similarity score, concept coverage, attempt timestamp, assessment reference.

- **TutorInteraction**: Records a student-initiated RAG query; includes transcribed question, retrieved context chunks, generated response, timestamp links, student satisfaction rating (optional).

- **ReciteBackAttempt**: Tracks recite-back performance; includes original explanation reference, student recitation transcription, similarity score, attempt number, pass/fail status.

- **ConceptGap**: Logs concepts a student failed to articulate; includes concept identifier, source (assessment or recite-back), failure count, flagged for review status, lesson reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can complete an oral assessment (record, submit, receive feedback) within 90 seconds after the question is presented.

- **SC-002**: Semantic matching accurately distinguishes between conceptually correct answers and memorized/incorrect responses with at least 85% agreement with expert human evaluation.

- **SC-003**: RAG tutor responses are grounded in lecture content 95% of the time (no hallucinated information).

- **SC-004**: Students who engage with the recite-back loop demonstrate 30% better concept retention on follow-up assessments compared to passive learners.

- **SC-005**: System provides transcription results within 30 seconds for 95% of recordings under 2 minutes.

- **SC-006**: 80% of students report the interactive tutor helps clarify confusing concepts (measured via post-session survey).

- **SC-007**: Concept gap logging captures at least 90% of topics where students demonstrate poor articulation.

- **SC-008**: Video timestamp references in tutor responses correctly point to relevant content 90% of the time.

## Assumptions

- The course already has lecture content indexed in ChromaDB via the semantic embeddings pipeline (014-semantic-embeddings-pipeline).
- Whisper transcription service is available and configured (existing infrastructure from 010-add-oral-question or 013-text-video-sync).
- Reference answers and key concepts for oral assessments are auto-generated from lecture content and reviewed/approved by instructors before activation.
- Students have access to a microphone-enabled device and grant browser permissions.
- The primary use case is English-language content; other languages may work but with reduced transcription accuracy.
- Semantic similarity is computed using embedding-based comparison (cosine similarity) rather than exact text matching.
