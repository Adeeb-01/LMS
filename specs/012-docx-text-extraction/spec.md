# Feature Specification: DOCX Text Extraction for Lecture Videos

**Feature Branch**: `012-docx-text-extraction`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "As an Instructor, I want to upload a Word document (.docx) alongside the lecture video, so that the system can extract 100% accurate text and complex terminology (e.g., Oral Pathology terms), completely bypassing potential speech-to-text transcription errors."

## Clarifications

### Session 2026-03-11

- Q: Who can access the extracted text content? → A: Course-scoped access - all instructors and enrolled students in the course can access.
- Q: What are the valid document processing states? → A: 4-state model: Uploading → Processing → Ready → Failed.
- Q: How do students access extracted text as study materials? → A: Both - view inline on lecture page AND download as file.
- Q: How should search integration work? → A: Unified search - extracted text appears in existing LMS search results alongside videos/courses.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload DOCX Document with Lecture Video (Priority: P1)

An instructor is creating a new lecture in the LMS. They have prepared a Word document containing the complete lecture transcript with accurate medical terminology (e.g., Oral Pathology terms like "ameloblastoma," "odontogenic keratocyst," "periapical granuloma"). Instead of relying on automated speech-to-text which frequently mangles these specialized terms, the instructor uploads their .docx file alongside the video. The system extracts the text content and associates it with the lecture video.

**Why this priority**: This is the core feature that directly addresses the problem of inaccurate transcriptions. Without this, the entire feature has no value.

**Independent Test**: Can be fully tested by uploading a .docx file with a lecture video and verifying the extracted text is stored and associated correctly.

**Acceptance Scenarios**:

1. **Given** an instructor is on the lecture creation/edit page, **When** they select a .docx file from their computer, **Then** the system accepts the file and shows upload progress and confirmation.

2. **Given** an instructor has uploaded a .docx file, **When** the upload completes, **Then** the system extracts all text content from the document and stores it associated with the lecture video.

3. **Given** an instructor uploads a .docx containing complex medical terminology, **When** extraction completes, **Then** all terminology is preserved exactly as written (no transcription errors).

4. **Given** an instructor uploads an invalid file (e.g., .pdf, .txt, corrupted .docx), **When** the system processes the file, **Then** a clear error message is displayed explaining the issue.

---

### User Story 2 - View and Verify Extracted Text (Priority: P2)

After uploading a .docx document, the instructor wants to view the extracted text to verify it was processed correctly. They can preview the full extracted content and confirm all terminology and formatting was preserved before publishing the lecture.

**Why this priority**: Instructors need confidence that their content was extracted accurately. This verification step prevents publishing lectures with missing or corrupted text.

**Independent Test**: Can be tested by viewing the extracted text preview after upload and verifying it matches the original document content.

**Acceptance Scenarios**:

1. **Given** an instructor has uploaded a .docx file, **When** they click to preview the extracted content, **Then** they see the full text content in a readable format.

2. **Given** the extracted text is displayed, **When** the instructor reviews it, **Then** paragraph structure and basic formatting (bold, italic, headers) are preserved.

3. **Given** the instructor notices an issue with the extracted text, **When** they want to fix it, **Then** they can re-upload a corrected .docx file to replace the previous one.

---

### User Story 3 - Replace Existing Document (Priority: P3)

An instructor who previously uploaded a .docx file discovers errors or wants to update the content. They upload a new version of the document, which replaces the previously extracted text.

**Why this priority**: Content updates are common but secondary to initial upload functionality.

**Independent Test**: Can be tested by uploading a replacement document and verifying the old content is replaced with new content.

**Acceptance Scenarios**:

1. **Given** a lecture already has an associated .docx document, **When** the instructor uploads a new .docx file, **Then** the system prompts for confirmation before replacing.

2. **Given** the instructor confirms replacement, **When** the new file is processed, **Then** the old extracted text is replaced with the newly extracted text.

---

### User Story 4 - Student Access to Study Materials (Priority: P4)

Enrolled students want to access the extracted lecture text as study materials. They can view the content inline on the lesson page and download it as a file for offline study.

**Why this priority**: Students are the ultimate consumers of this content. However, this depends on instructors first uploading and verifying documents (US1-US2).

**Independent Test**: As an enrolled student, navigate to a lesson with uploaded document, view study materials tab, and download content.

**Acceptance Scenarios**:

1. **Given** a lesson has an uploaded .docx document with status "ready", **When** an enrolled student views the lesson, **Then** they see a "Study Materials" section with the extracted text.

2. **Given** a student is viewing the study materials, **When** they click download, **Then** they can save the content as a text or HTML file.

3. **Given** a student is NOT enrolled in the course, **When** they try to access the study materials, **Then** access is denied with an appropriate message.

---

### Edge Cases

- What happens when a .docx file contains only images and no text? System displays a warning that no text content was found.
- How does the system handle very large documents (e.g., 100+ pages)? System processes the full document with progress indication; maximum file size limit applies.
- What happens if the .docx contains complex formatting like tables, equations, or embedded objects? Tables are converted to plain text representation; equations are preserved as text where possible; embedded objects are skipped with a note in the extraction log.
- What happens if upload is interrupted mid-way? System discards partial upload and notifies instructor to retry.
- What if the .docx file is password-protected? System displays an error message asking the instructor to remove password protection before uploading.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow instructors to upload a .docx file when creating or editing a lecture video.
- **FR-002**: System MUST validate that uploaded files are valid .docx format before processing.
- **FR-003**: System MUST extract all text content from the uploaded .docx document.
- **FR-004**: System MUST preserve the exact spelling of all text including specialized terminology during extraction.
- **FR-005**: System MUST associate the extracted text with the corresponding lecture video.
- **FR-006**: System MUST preserve basic document structure (paragraphs, headings, lists) during extraction.
- **FR-007**: System MUST allow instructors to preview the extracted text content.
- **FR-008**: System MUST allow instructors to replace an existing document with a new upload.
- **FR-009**: System MUST display clear error messages for invalid, corrupted, or password-protected files.
- **FR-010**: System MUST support documents up to 50 MB in size.
- **FR-011**: System MUST delete the extracted text when the associated lecture video is deleted.
- **FR-012**: System MUST provide the extracted text for multiple purposes: searchable lecture content (indexed for search), student study materials (viewable/downloadable lecture notes), and quiz/question generation (text available via API for future AI-powered assessment features).
- **FR-013**: System MUST restrict access to extracted text to course instructors and enrolled students only (course-scoped access control).
- **FR-014**: System MUST allow enrolled students to view extracted text inline on the lecture page.
- **FR-015**: System MUST allow enrolled students to download extracted text as a file.
- **FR-016**: System MUST index extracted text for the existing LMS search, displaying results alongside other content types (videos, courses).

### Key Entities

- **LectureDocument**: Represents an uploaded .docx file associated with a lecture. Contains original filename, upload date, file size, processing status (Uploading → Processing → Ready → Failed), and reference to the lecture video.
- **ExtractedText**: Represents the text content extracted from a LectureDocument. Contains the full text content, extraction date, and structured content (paragraphs, headings, lists).
- **Lecture**: Existing entity representing a lecture video. Extended to have an optional association with a LectureDocument.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Instructors can upload a .docx file and see the extracted text within 30 seconds for documents under 10 pages.
- **SC-002**: 100% of text content from uploaded documents is extracted without character loss or corruption.
- **SC-003**: All specialized terminology (medical, scientific, technical) is preserved exactly as written in the original document.
- **SC-004**: Instructors can complete the document upload process in under 2 minutes for typical documents (under 20 pages).
- **SC-005**: 95% of instructors successfully upload a document on their first attempt without encountering confusing errors.
- **SC-006**: System handles 50 concurrent document uploads without performance degradation.

## Assumptions

- The LMS already has an existing lecture/video management system that this feature extends.
- Instructors have access to create/edit lectures through the existing dashboard.
- One .docx document per lecture video (one-to-one relationship).
- Standard web file upload approach is appropriate for this use case.
- Document retention follows existing content retention policies in the LMS.
- UTF-8 encoding is sufficient for all supported languages and special characters.
- In this specification, "lecture" and "lesson" are used interchangeably. The codebase entity is `Lesson` (in `model/lesson.model.js`); "LectureDocument" is the new entity name chosen to distinguish uploaded transcript documents from the lesson video itself.
