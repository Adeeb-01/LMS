# Feature Specification: Automatic MCQ Generation

**Feature Branch**: `015-auto-mcq-generation`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "As an Instructor, I want Gemini to read the structural chunks and automatically generate university-level Multiple Choice Questions (MCQs), estimating their initial difficulty parameter (b-value), so that the generated questions are instantly injected into the system's test bank without me having to write a single question manually."

## Clarifications

### Session 2026-03-12

- Q: Who can trigger MCQ generation? → A: Only the course owner/primary instructor can generate MCQs.
- Q: How many questions per chunk? → A: 1-3 questions per chunk based on content richness.
- Q: What happens to metadata when a generated question is edited? → A: Keep source link for traceability, but reset b-value to default (content changed).
- Q: What if content changes during generation? → A: Cancel in-progress job and restart with new content.
- Q: What similarity threshold for duplicate detection? → A: 0.85+ similarity to flag potential duplicates.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Click MCQ Generation from Lecture Content (Priority: P1)

An instructor uploads a lecture document to a lesson. After the document is indexed into structural chunks, the instructor clicks a "Generate Questions" button. The system uses Gemini to analyze each chunk and generate university-level multiple choice questions with estimated difficulty levels. The generated questions appear in the lesson's quiz for the instructor to review.

**Why this priority**: This is the core value proposition. Without automatic generation, instructors must manually write every question, which is time-consuming and the primary pain point this feature addresses.

**Independent Test**: Can be fully tested by uploading a lecture document with clear conceptual content, triggering generation, and verifying MCQs appear in the quiz with appropriate difficulty estimates. Delivers immediate time savings to instructors.

**Acceptance Scenarios**:

1. **Given** a lesson with indexed lecture content (structural chunks), **When** the instructor clicks "Generate Questions", **Then** the system generates MCQs based on the content and adds them to the lesson's associated quiz.

2. **Given** a chunk containing factual information (definitions, concepts, processes), **When** questions are generated, **Then** each MCQ has one correct answer, 3-4 plausible distractors, and an estimated b-value between -3 and +3.

3. **Given** the generation process completes, **When** the instructor views the quiz, **Then** they see all generated questions with their estimated difficulty levels clearly indicated.

---

### User Story 2 - Difficulty Estimation Based on Content Complexity (Priority: P2)

When generating questions, Gemini analyzes the cognitive level required to answer each question and estimates an initial b-value (difficulty parameter) using factors like Bloom's taxonomy level, vocabulary complexity, and concept abstraction level.

**Why this priority**: Accurate initial difficulty estimates reduce the calibration time needed by the adaptive learning engine. This provides immediate value for question bank organization even before adaptive testing is implemented.

**Independent Test**: Can be tested by generating questions from content with varying complexity levels (basic definitions vs. complex analysis) and verifying that estimated b-values correlate with expected difficulty. Delivers better-organized question banks.

**Acceptance Scenarios**:

1. **Given** a chunk containing basic recall information (definitions, simple facts), **When** questions are generated, **Then** they receive lower b-values (easier, typically -1 to 0).

2. **Given** a chunk requiring analysis or application of concepts, **When** questions are generated, **Then** they receive higher b-values (harder, typically 0 to +2).

3. **Given** a generated question, **When** the instructor reviews it, **Then** they can see the estimated difficulty and the reasoning behind the estimate.

---

### User Story 3 - Batch Generation with Progress Tracking (Priority: P3)

When generating questions from a document with many chunks, the instructor sees real-time progress and can continue working while generation completes in the background.

**Why this priority**: Large documents may take time to process. Background processing with progress visibility improves user experience but is not blocking for core functionality.

**Independent Test**: Can be tested by triggering generation on a large document and observing progress updates. Delivers better UX for instructors working with extensive course materials.

**Acceptance Scenarios**:

1. **Given** a document with multiple chunks, **When** generation is triggered, **Then** the instructor sees a progress indicator showing chunks processed and questions generated.

2. **Given** generation is in progress, **When** the instructor navigates away, **Then** generation continues in the background and results are available when they return.

3. **Given** generation encounters an error on one chunk, **When** processing continues, **Then** other chunks are still processed and the error is reported without stopping the entire job.

---

### Edge Cases

- What happens if a chunk has insufficient content for a meaningful question? The system skips that chunk and logs it as "insufficient content" without generating low-quality questions.
- How does the system handle very short chunks (under 50 words)? Short chunks are combined with adjacent chunks sharing the same heading context before generation.
- What happens if Gemini API is unavailable or rate-limited? Generation is queued and retried with exponential backoff; progress shows "waiting for API availability".
- What happens if the instructor re-triggers generation for the same content? The system warns that questions already exist and asks for confirmation before generating additional questions.
- How are duplicate or near-duplicate questions handled? Before adding to the quiz, the system checks for semantic similarity with existing questions and marks potential duplicates for instructor review.
- What if the document contains non-educational content (tables of contents, references)? The system uses content classification to skip non-instructional sections like TOC, bibliography, and appendices.
- What if the lecture document is re-uploaded during generation? The in-progress generation job is cancelled and a new job starts with the updated content to ensure questions match current material.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the course owner/primary instructor to trigger MCQ generation for any lesson with indexed lecture content.
- **FR-002**: System MUST use Gemini to analyze structural chunks and generate contextually relevant multiple choice questions.
- **FR-003**: System MUST generate questions with one correct answer and 3-4 plausible distractor options.
- **FR-004**: System MUST estimate an initial b-value (difficulty parameter) for each generated question using content complexity analysis.
- **FR-005**: System MUST provide a difficulty reasoning explanation for each estimated b-value to help instructors understand the assessment.
- **FR-006**: System MUST add generated questions to the lesson's quiz in a "draft" status, requiring instructor activation before students can see them.
- **FR-007**: System MUST include an explanation for each generated question that clarifies why the correct answer is right.
- **FR-008**: System MUST track generation progress and allow instructors to view status (pending, generating, completed, failed).
- **FR-009**: System MUST link each generated question to its source chunk, enabling "watch explanation" functionality for video-synced content.
- **FR-010**: System MUST skip chunks that lack sufficient educational content (under 50 words after combining with context).
- **FR-011**: System MUST detect and flag potential duplicate questions (0.85+ semantic similarity with existing questions) before adding them to the quiz.
- **FR-012**: System MUST validate generated questions against quality criteria (clear question stem, distinct options, single unambiguous correct answer).
- **FR-013**: System MUST allow instructors to regenerate questions for specific chunks if the initial generation is unsatisfactory.
- **FR-014**: System MUST generate 1-3 questions per chunk based on content richness, with Gemini determining the appropriate count for each chunk.
- **FR-015**: System MUST preserve the source chunk link when a generated question is edited, but reset the b-value to default (a=1.0, b=0.0, c=0.0) per IRT parameter reset rules.

### Key Entities

- **GenerationJob**: Tracks the MCQ generation process for a lesson/document, including status, progress (chunks processed), questions generated count, and any errors encountered.
- **GeneratedQuestion**: A question produced by Gemini with additional metadata: source chunk reference, estimated b-value, difficulty reasoning, and draft status. Extends the existing Question entity.
- **DifficultyEstimate**: The b-value assigned to a question with its reasoning (Bloom's level, complexity factors, vocabulary level).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Instructors can generate a full set of MCQs for a typical lecture (20-30 pages) within 2 minutes of triggering generation.
- **SC-002**: At least 80% of generated questions are accepted by instructors without modification (measured by questions activated vs. deleted).
- **SC-003**: Estimated b-values correlate with actual student performance within ±0.5 after 50 student responses per question.
- **SC-004**: Generated questions cover at least 70% of key concepts identified in the source content (verified through instructor review).
- **SC-005**: Instructors report at least 80% reduction in time spent creating quiz questions compared to manual authoring.
- **SC-006**: Less than 5% of generated questions are flagged as duplicates of existing questions.

## Assumptions

- The semantic embeddings pipeline (spec 014) has successfully indexed the lecture content into structural chunks with heading hierarchy.
- Gemini API credentials are available and have sufficient quota for question generation workloads.
- Each lesson has an associated quiz where generated questions can be added.
- The existing Question model supports the "draft" status and b-value storage (from spec 009-question-irt-parameters).
- Instructors understand IRT difficulty parameters or can be educated through UI explanations.
- University-level content implies undergraduate academic standards for question complexity and vocabulary.

## Dependencies

- **014-semantic-embeddings-pipeline**: Provides the structural chunks with heading hierarchy that serve as input for question generation.
- **009-question-irt-parameters**: Provides the IRT parameter schema (a, b, c values) for storing estimated difficulty.
- **001-improve-quiz-system**: Provides the quiz and question management infrastructure.
