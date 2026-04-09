# Feature Specification: Text-Video Timestamp Synchronization

**Feature Branch**: `013-text-video-sync`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "As a System Admin, I want the AI pipeline to synchronize the extracted text from the Word file with the video's audio timestamps, so that every generated question and textbook paragraph is permanently linked to the exact second it was explained in the video."

## Clarifications

### Session 2026-03-12

- Q: Who can access alignment data and video transcripts? → A: Course-scoped: instructors and enrolled students in the course.
- Q: What is the maximum video duration for alignment processing? → A: 2 hours maximum.
- Q: What is the retry policy for failed alignment processing? → A: Automatic retry once after 5 minutes; then require manual retry.
- Q: What confidence score threshold marks a text block as "low confidence" needing review? → A: Below 70% confidence.
- Q: Should the video transcript (STT output) be stored permanently or discarded after alignment? → A: Store permanently; delete only when video is deleted.

## Prerequisites

This feature depends on:
- **012-docx-text-extraction**: Provides extracted text content (`ExtractedText.structuredContent`) from uploaded Word documents

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Text-to-Video Alignment (Priority: P1)

When an instructor uploads a Word document for a lecture video (via 012-docx-text-extraction), the AI pipeline automatically processes the video's audio to identify when each paragraph/section was spoken. The system aligns the extracted text blocks with their corresponding timestamps in the video, creating permanent associations.

**Why this priority**: This is the core synchronization capability that enables all downstream features (jump-to-video, question linking). Without accurate alignment, no other functionality is possible.

**Independent Test**: Upload a DOCX with a lecture video, wait for processing to complete, then verify each text block has an associated timestamp range (start/end seconds) in the database.

**Acceptance Scenarios**:

1. **Given** an instructor has uploaded a .docx file for a lesson with an existing video, **When** the document extraction completes, **Then** the system automatically queues the video for audio-text alignment processing.

2. **Given** the alignment pipeline is processing a video, **When** the video audio matches text content, **Then** each structured content block (paragraph, heading) receives a start timestamp and end timestamp in seconds.

3. **Given** the alignment process completes successfully, **When** the results are stored, **Then** each text block's timestamp association persists indefinitely until the document is replaced.

4. **Given** a video contains spoken content that doesn't appear in the document (e.g., off-script remarks), **When** alignment runs, **Then** those sections are marked as "unmatched" without affecting matched content.

5. **Given** the document contains text not spoken in the video (e.g., supplementary notes), **When** alignment runs, **Then** those sections are marked as "not-spoken" with null timestamps.

---

### User Story 2 - Students Jump to Video from Text (Priority: P2)

Students viewing the extracted study materials (from 012) can click on any paragraph or section to jump directly to that moment in the lecture video. This creates a seamless connection between reading and watching.

**Why this priority**: This is the primary user-facing benefit of synchronization. Students gain the ability to quickly find video explanations of specific content.

**Independent Test**: As an enrolled student, view study materials, click a paragraph, verify the video player seeks to the correct timestamp.

**Acceptance Scenarios**:

1. **Given** an enrolled student is viewing study materials with synchronized timestamps, **When** they click on a paragraph, **Then** the video player jumps to the exact second that paragraph was explained.

2. **Given** a text block has no timestamp (marked "not-spoken"), **When** the student clicks it, **Then** the system displays a message indicating this content was not covered verbally in the video.

3. **Given** a student is watching the video, **When** they pause at any moment, **Then** they can see which text content corresponds to the current playback position (highlighted in the study materials panel).

---

### User Story 3 - Questions Inherit Video Timestamps (Priority: P3)

When the AI pipeline generates questions from the extracted text (future feature), each question automatically inherits the timestamp of the source paragraph. Students reviewing quiz results can jump to the exact video moment that explains the correct answer.

**Why this priority**: This creates a powerful learning feedback loop where incorrect answers lead directly to the relevant explanation. However, it depends on a future question generation feature.

**Independent Test**: Generate a question from a synchronized text block, verify the question record contains the inherited timestamp, click "Watch Explanation" from quiz results to verify video jump works.

**Acceptance Scenarios**:

1. **Given** a question is generated from a synchronized text block, **When** the question is saved, **Then** it permanently stores the source text block's start/end timestamps.

2. **Given** a student answers a question incorrectly, **When** they view the result, **Then** they see a "Watch Explanation" link that jumps to the video timestamp.

3. **Given** a question was generated from a "not-spoken" text block, **When** the student views the result, **Then** the "Watch Explanation" link is not shown (no video reference available).

---

### User Story 4 - Instructor Reviews Alignment Quality (Priority: P4)

Instructors can view the alignment results to verify synchronization quality. They see a side-by-side view of text blocks with their matched timestamps and can manually adjust misaligned sections.

**Why this priority**: Alignment algorithms are imperfect; instructors need visibility and control to ensure accuracy. This is secondary to automatic alignment working.

**Independent Test**: As an instructor, view alignment results for a processed document, verify text blocks show timestamps, manually adjust one timestamp, verify change persists.

**Acceptance Scenarios**:

1. **Given** an instructor opens the alignment review page for a processed document, **When** the page loads, **Then** they see each text block with its matched timestamp and a confidence score.

2. **Given** a text block has confidence score below 70%, **When** the instructor views it, **Then** the block is visually highlighted as needing review.

3. **Given** an instructor wants to correct a timestamp, **When** they click on a text block and select a new timestamp from the video, **Then** the association is updated and marked as "manually verified."

4. **Given** an instructor has manually verified a timestamp, **When** re-alignment is triggered (e.g., after document replacement), **Then** manually verified timestamps are preserved unless the text content changed.

---

### Edge Cases

- What happens when video has no audio or is completely silent? System marks all text blocks as "unable-to-align" with an appropriate message explaining audio is required.
- What happens when document text is in a different language than video audio? Alignment fails with an error indicating language mismatch.
- What happens when the speaker talks much faster or slower than normal? Alignment algorithm accounts for speech rate variations; confidence scores may be lower for extreme variations.
- What happens when multiple speakers alternate in the video? System attempts alignment regardless of speaker changes; speaker transitions may affect confidence.
- What happens when the document is replaced with an updated version? Previous alignments are deleted; fresh alignment runs on new text content.
- What happens when the video is replaced but document stays the same? Previous alignments are deleted; fresh alignment runs using new video audio.
- What happens if alignment processing fails midway? System automatically retries once after 5 minutes; if retry also fails, status is marked as "failed" with error details and instructor can manually trigger retry or proceed without timestamps.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically trigger audio-text alignment when a document extraction completes for a lesson that has an associated video.
- **FR-002**: System MUST extract audio from the lesson video for speech analysis.
- **FR-003**: System MUST generate a transcript with word-level timestamps from the video audio.
- **FR-004**: System MUST align each structured content block from the extracted document with the corresponding segment in the audio transcript.
- **FR-005**: System MUST store start timestamp (in seconds) and end timestamp (in seconds) for each aligned text block.
- **FR-006**: System MUST persist timestamp associations until the document or video is replaced.
- **FR-007**: System MUST mark text blocks that don't appear in the video audio as "not-spoken" with null timestamps.
- **FR-008**: System MUST mark audio segments that don't match document text as "unmatched."
- **FR-009**: System MUST calculate and store a confidence score (0-100) for each text block alignment.
- **FR-010**: System MUST allow enrolled students to click on study material text to jump to the corresponding video timestamp.
- **FR-011**: System MUST highlight the current text block in study materials based on video playback position.
- **FR-012**: System MUST allow instructors to view alignment results with confidence indicators.
- **FR-013**: System MUST allow instructors to manually adjust text-to-timestamp associations.
- **FR-014**: System MUST preserve manually verified alignments during re-processing unless the source text changed.
- **FR-015**: System MUST propagate timestamps to generated questions when questions are created from synchronized text blocks.
- **FR-016**: System MUST provide a "Watch Explanation" link for questions that have associated timestamps.
- **FR-017**: System MUST track alignment processing status (queued, processing, completed, failed) for monitoring.
- **FR-018**: System MUST delete all alignment data when the associated document or video is deleted.
- **FR-019**: System MUST restrict access to video transcripts and alignment data to course instructors and enrolled students only (course-scoped access control, consistent with 012-docx-text-extraction).
- **FR-020**: System MUST reject alignment requests for videos exceeding 2 hours in duration with a clear error message.
- **FR-021**: System MUST automatically retry failed alignment processing once after 5 minutes; subsequent retries require manual instructor action.
- **FR-022**: System MUST visually highlight text blocks with confidence scores below 70% as "low confidence" needing instructor review.
- **FR-023**: System MUST store the video transcript permanently; transcript is deleted only when the associated video is deleted.

### Key Entities

- **TextBlockTimestamp**: Represents the synchronization link between a text block (from ExtractedText.structuredContent) and a video time range. Contains start second, end second, confidence score, alignment status, and manual verification flag.
- **AlignmentJob**: Represents a queued or in-progress alignment task. Contains processing status, error messages, and job metadata.
- **VideoTranscript**: Represents the speech-to-text output from the video audio. Contains word-level timestamps used for alignment matching. Stored permanently and deleted only when the associated video is deleted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 85% of text blocks are aligned with correct timestamps (within ±3 seconds of actual spoken moment) without manual intervention.
- **SC-002**: Alignment processing completes within 2x the video duration (e.g., 10-minute video processes in under 20 minutes).
- **SC-003**: Students can jump from text to video within 1 second of clicking a synchronized paragraph.
- **SC-004**: 90% of students using synchronized materials report the feature helpful for understanding content (survey metric).
- **SC-005**: Instructors can review and correct alignments in under 5 minutes for a 30-minute lecture.
- **SC-006**: Questions with timestamp links show 30% higher "watched explanation" engagement compared to questions without links.

## Assumptions

- Lecture videos contain spoken audio that corresponds to the document content (not silent videos or unrelated audio).
- Video files are in a format that allows audio extraction (standard video formats like MP4, WebM).
- Primary use case is single-speaker lectures where the speaker follows the document content reasonably closely.
- The existing video player component supports programmatic seeking to specific timestamps.
- A speech-to-text service or API is available for generating video transcripts (e.g., cloud service, local Whisper model).
- Document text and video audio are in the same language.
- Alignment quality is acceptable when the speaker paraphrases or reorders content slightly, though confidence scores may vary.
