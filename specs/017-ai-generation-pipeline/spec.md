# Feature Specification: AI Generation & Vectorization Pipeline (Epic 1)

**Feature Branch**: `017-ai-generation-pipeline`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "As a System Administrator / Instructor, I want to automate the processing of course materials (Video + Word) to generate both written and oral questions, and construct a vectorized knowledge base, so that I can seamlessly feed the adaptive testing engine and the intelligent tutor without manual data entry."

## Clarifications

### Session 2026-03-16

- Q: Who can trigger the full AI generation pipeline for a lesson? → A: Course owner/primary instructor only (consistent with 015-auto-mcq-generation).
- Q: What is the maximum number of concurrent pipeline jobs the system should support? → A: 5 concurrent pipelines system-wide (consistent with 014 indexing job limit).
- Q: How should potential duplicate oral questions be handled? → A: Flag at 0.90+ semantic similarity for instructor review (higher threshold than MCQs due to open-ended nature).
- Q: Should MCQ and oral question generation run automatically in parallel after indexing completes? → A: Yes, both run in parallel automatically after indexing.
- Q: How should pipeline completion notifications be delivered? → A: In-app notification only (bell icon / toast).

## Overview

This Epic integrates multiple AI-powered pipelines into a unified workflow for processing lecture materials. It orchestrates existing capabilities (DOCX extraction, text-video synchronization, semantic embeddings, MCQ generation) and introduces **Automatic Oral Question Generation** as a new capability.

### Component Dependencies

This Epic builds upon and orchestrates the following specifications:

| Component | Spec | Description |
|-----------|------|-------------|
| DOCX Text Extraction | 012-docx-text-extraction | Extract 100% accurate text from Word documents |
| Text-Video Sync | 013-text-video-sync | Align extracted text with video timestamps via STT |
| Semantic Embeddings | 014-semantic-embeddings-pipeline | Chunk text, embed via Gemini, store in ChromaDB |
| MCQ Generation | 015-auto-mcq-generation | Generate MCQs with IRT b-value estimates |
| Oral Question Type | 010-add-oral-question | Oral question infrastructure with AI evaluation |

**New Capability**: Automatic generation of open-ended oral questions with reference answers from lecture content.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dual Input Upload and Synchronization (Priority: P1)

An instructor uploads a Word document alongside a lecture video. The system extracts text with 100% accuracy for medical/scientific terminology and synchronizes each paragraph with its corresponding video timestamp through speech-to-text alignment.

**Why this priority**: This is the foundational data pipeline. Without accurate text extraction and video synchronization, no downstream AI features (question generation, semantic search) can function correctly.

**Independent Test**: Upload a .docx file and video for a lesson, verify text extraction preserves all terminology exactly, verify each text block receives start/end timestamps from alignment process.

**Acceptance Scenarios**:

1. **Given** an instructor creates a new lesson, **When** they upload both a .docx file and a video file, **Then** the system processes both files and displays a unified processing status.

2. **Given** both files are uploaded, **When** text extraction completes, **Then** the system automatically queues the text-video alignment job.

3. **Given** the alignment job completes, **When** the instructor views the results, **Then** each paragraph shows its linked timestamp with a confidence score.

4. **Given** a document contains complex medical terminology (e.g., "ameloblastoma", "odontogenic keratocyst"), **When** extraction completes, **Then** all terms are preserved exactly as written in the source document.

---

### User Story 2 - Semantic Chunking and Knowledge Base Construction (Priority: P2)

After text extraction, the system parses content by structural headings, generates embeddings using Gemini, and stores them in ChromaDB. This creates a searchable semantic knowledge base that powers the intelligent tutor.

**Why this priority**: The vector database is the foundation for the intelligent tutor's semantic search capabilities. It must be built from extracted content before any AI-assisted learning features can work.

**Independent Test**: After document processing, query ChromaDB for chunks related to specific concepts; verify chunks are correctly stored with heading hierarchy metadata.

**Acceptance Scenarios**:

1. **Given** a lecture document with multiple headings (H1, H2, H3), **When** indexing completes, **Then** each heading section is stored as a separate chunk with its heading path preserved.

2. **Given** indexed lecture content, **When** the intelligent tutor performs a semantic search, **Then** it retrieves relevant chunks ranked by similarity score.

3. **Given** a student asks a question about course content, **When** the system searches ChromaDB, **Then** only content from courses the student is enrolled in is returned.

4. **Given** a document is re-uploaded, **When** re-indexing completes, **Then** old embeddings are fully replaced with no orphaned data.

---

### User Story 3 - MCQ Generation with IRT Calibration (Priority: P3)

The system automatically generates university-level multiple choice questions from the indexed text chunks. Each question receives an initial IRT b-value (difficulty parameter) estimate based on content complexity analysis.

**Why this priority**: MCQs are the primary question type for the adaptive testing engine. Automatic generation with difficulty estimates dramatically reduces instructor workload and enables immediate use in Block-Based Adaptive Testing (BAT).

**Independent Test**: Trigger MCQ generation for a lesson with indexed content; verify questions are created with correct answers, plausible distractors, and b-value estimates within the valid range (-3 to +3).

**Acceptance Scenarios**:

1. **Given** a lesson with indexed lecture chunks, **When** the instructor clicks "Generate Questions", **Then** the system generates MCQs from each chunk with sufficient content.

2. **Given** generated MCQs, **When** the instructor reviews them, **Then** each question displays its estimated difficulty (b-value) and reasoning.

3. **Given** content of varying complexity, **When** questions are generated, **Then** basic recall questions receive lower b-values and analysis/application questions receive higher b-values.

4. **Given** generated questions, **When** they are added to a quiz, **Then** each question maintains a link to its source text block and associated video timestamp.

---

### User Story 4 - Oral Question Generation (Priority: P4)

The system automatically generates open-ended oral questions from lecture content, along with comprehensive reference answers. These questions and reference answers enable the AI evaluation system to assess student spoken responses.

**Why this priority**: Oral questions assess different competencies than MCQs (explanation, synthesis, verbal communication). Automatic generation with reference answers completes the question bank requirements for comprehensive adaptive assessment.

**Independent Test**: Trigger oral question generation for indexed content; verify questions are open-ended, reference answers capture key concepts, and questions link to source timestamps.

**Acceptance Scenarios**:

1. **Given** a lesson with indexed lecture chunks, **When** the instructor triggers oral question generation, **Then** the system generates open-ended questions suitable for spoken responses.

2. **Given** generated oral questions, **When** the instructor reviews them, **Then** each question has a detailed reference answer that captures key concepts from the source content.

3. **Given** an oral question generated from a synchronized text block, **When** a student reviews their evaluated response, **Then** they can click "Watch Explanation" to jump to the relevant video segment.

4. **Given** generated oral questions, **When** they are added to a quiz, **Then** they are stored with the "oral" question type and reference answer populated.

---

### User Story 5 - End-to-End Pipeline Orchestration (Priority: P5)

An instructor uploads course materials once, and the system automatically orchestrates the entire pipeline: extraction → synchronization → indexing → question generation. The instructor receives a summary when all processing completes.

**Why this priority**: The integrated experience is what delivers the "no manual data entry" promise. Individual features already exist; this story ensures they work together seamlessly.

**Independent Test**: Upload a complete lecture package (video + document), monitor pipeline progress, verify all stages complete successfully with a final summary report.

**Acceptance Scenarios**:

1. **Given** an instructor uploads a video and document, **When** all processing stages complete, **Then** the instructor receives a notification with a pipeline completion summary.

2. **Given** the pipeline is running, **When** the instructor views the lesson status, **Then** they see the current stage and overall progress across all pipeline components.

3. **Given** one pipeline stage fails (e.g., alignment), **When** the instructor views status, **Then** they see which stage failed, the error details, and can retry that specific stage.

4. **Given** completed pipeline processing, **When** the instructor reviews the summary, **Then** they see: chunks indexed, MCQs generated, oral questions generated, and alignment confidence statistics.

---

### Edge Cases

- What happens when video has no audio but document is uploaded? Text extraction succeeds, alignment is skipped with message "No audio detected", indexing and question generation proceed normally.
- What happens when document has no headings? System treats entire document as single chunk for indexing; question generation works with reduced context granularity.
- What happens if Gemini API quota is exhausted mid-pipeline? Current stage is queued for retry; pipeline resumes automatically when quota resets; instructor sees "waiting for API" status.
- What happens if document and video are in different languages? Alignment fails with language mismatch error; other pipeline stages (indexing, generation) proceed with document language.
- What happens when re-uploading a document while pipeline is running? In-progress jobs are cancelled; pipeline restarts from scratch with new content.
- What happens if MCQ generation produces duplicates of existing questions? Questions with 0.85+ semantic similarity are flagged for instructor review rather than auto-added.
- What happens if oral question content is too brief for meaningful questions? Chunks under 100 words are skipped for oral question generation with a logged reason.

## Requirements *(mandatory)*

### Functional Requirements

#### Pipeline Orchestration

- **FR-001**: System MUST automatically trigger the next pipeline stage when the previous stage completes successfully.
- **FR-002**: System MUST track overall pipeline status across all stages (extraction → alignment → indexing → MCQ generation → oral generation).
- **FR-003**: System MUST allow instructors to view a unified progress dashboard showing all pipeline stages and their current status.
- **FR-004**: System MUST send an in-app notification (bell icon / toast) to the instructor when all pipeline stages complete.
- **FR-005**: System MUST allow instructors to manually retry any failed pipeline stage without affecting completed stages.
- **FR-006**: System MUST cancel all in-progress pipeline jobs when source content (document or video) is re-uploaded.
- **FR-006a**: System MUST restrict pipeline trigger access to the course owner/primary instructor only; co-instructors and TAs cannot initiate pipeline processing.
- **FR-006b**: System MUST limit concurrent pipeline jobs to a maximum of 5 system-wide, queuing additional requests until capacity is available.

#### Oral Question Generation (New Capability)

- **FR-007**: System MUST allow the course owner/primary instructor to trigger oral question generation for any lesson with indexed lecture content.
- **FR-008**: System MUST use Gemini to analyze structural chunks and generate open-ended questions suitable for spoken responses.
- **FR-009**: System MUST generate a comprehensive reference answer for each oral question, capturing key concepts, expected terminology, and acceptable variations.
- **FR-010**: System MUST store generated oral questions with question type "oral" and the referenceAnswer field populated.
- **FR-011**: System MUST link each generated oral question to its source chunk and inherited video timestamp.
- **FR-012**: System MUST provide "Watch Explanation" functionality for oral questions that have associated video timestamps.
- **FR-013**: System MUST skip chunks with insufficient content (under 100 words) for oral question generation.
- **FR-014**: System MUST generate questions that assess higher-order thinking: explanation, comparison, analysis, or synthesis.
- **FR-015**: System MUST estimate difficulty level for oral questions based on cognitive complexity (stored as b-value for IRT compatibility).
- **FR-016**: System MUST allow instructors to regenerate oral questions for specific chunks if initial results are unsatisfactory.
- **FR-017**: System MUST add generated oral questions in "draft" status, requiring instructor activation before students can see them.
- **FR-017a**: System MUST detect and flag potential duplicate oral questions (0.90+ semantic similarity with existing questions) for instructor review before adding them.

#### Integration Requirements

- **FR-018**: System MUST propagate video timestamps from alignment data to both MCQ and oral questions generated from synchronized content.
- **FR-019**: System MUST ensure generated questions are searchable via the semantic search system for duplicate detection.
- **FR-020**: System MUST automatically trigger both MCQ and oral question generation in parallel once indexing completes, without requiring separate instructor actions.
- **FR-021**: System MUST maintain source traceability from any generated question back to its original chunk, heading path, and document.

### Key Entities

- **PipelineJob**: Orchestrates the end-to-end processing workflow for a lesson. Contains references to child jobs (extraction, alignment, indexing, MCQ generation, oral generation), overall status, and completion timestamps.
- **OralQuestion**: Extension of Question entity for oral type. Contains the question prompt, referenceAnswer (comprehensive expected response), source chunk reference, video timestamp link, estimated b-value, and draft status.
- **OralGenerationJob**: Tracks the oral question generation process for a lesson. Contains status, progress (chunks processed), questions generated count, and error details.
- **ReferenceAnswer**: The expected response content for an oral question. Contains key concepts, required terminology, acceptable variations, and grading criteria hints for the AI evaluator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Instructors can upload a lecture package (video + document) and have the complete pipeline finish within 1.5x the video duration for a typical 30-minute lecture.
- **SC-002**: Generated oral questions receive instructor approval (not deleted) at least 75% of the time.
- **SC-003**: Reference answers enable the AI evaluator to grade student responses within ±0.5 points of instructor manual grades (on a 10-point scale).
- **SC-004**: The pipeline dashboard accurately reflects current status within 5 seconds of any stage change.
- **SC-005**: At least 90% of instructor-uploaded materials complete all pipeline stages without requiring manual intervention.
- **SC-006**: Questions generated from synchronized content successfully link to video timestamps at least 85% of the time.
- **SC-007**: Oral questions assess higher-order thinking (application, analysis, synthesis) in at least 70% of generated questions (as verified by instructor review).
- **SC-008**: The intelligent tutor's semantic search returns relevant content from indexed materials with 90% precision.

## Assumptions

- All component specifications (012, 013, 014, 015, 010) have been implemented and are functional.
- ChromaDB is configured and operational per spec 011-configure-databases.
- Gemini API credentials are available with sufficient quota for both embedding generation and question generation workloads.
- Instructors upload both video and document files; partial uploads (video-only or document-only) are supported but result in reduced pipeline functionality.
- The oral question type and referenceAnswer field exist per spec 010-add-oral-question.
- Lectures are primarily single-speaker educational content where the speaker follows the document content.
- Reference answers should provide comprehensive coverage allowing for variations in student phrasing and approach.

## Dependencies

- **012-docx-text-extraction**: Provides text extraction with preserved terminology
- **013-text-video-sync**: Provides audio-text alignment and timestamp assignment
- **014-semantic-embeddings-pipeline**: Provides text chunking, embedding generation, and ChromaDB storage
- **015-auto-mcq-generation**: Provides MCQ generation with IRT parameter estimation
- **010-add-oral-question**: Provides oral question type infrastructure and AI evaluation capability
- **011-configure-databases**: Provides ChromaDB configuration
- **009-question-irt-parameters**: Provides IRT parameter schema for difficulty storage
