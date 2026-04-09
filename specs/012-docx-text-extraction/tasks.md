# Tasks: DOCX Text Extraction for Lecture Videos

**Input**: Design documents from `/specs/012-docx-text-extraction/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Test tasks included per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

## Path Conventions

Based on plan.md, this project uses Next.js 15 App Router structure:
- Models: `model/`
- Libs: `lib/`
- Server Actions: `app/actions/`
- API Routes: `app/api/`
- Dashboard pages: `app/[locale]/dashboard/...`
- Main pages: `app/[locale]/(main)/...`
- Shared components: `components/`
- Tests: `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create directory structure


- [x] T002 [P] Create directory `lib/docx/` for extraction utilities
- [x] T003 [P] Create directory `components/documents/` for shared document components
- [x] T004 [P] Create directory `app/api/lecture-documents/` for API routes
- [x] T005 [P] Create directory `app/api/lecture-documents/[id]/` for document-specific routes
- [x] T006 [P] Create directory `app/api/lecture-documents/[id]/download/` for download route
- [x] T007 [P] Create directory `app/api/lecture-documents/by-lesson/[lessonId]/` for lesson lookup

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create LectureDocument Mongoose model with ExtractedText embedded schema in `model/lecture-document.model.js`
- [x] T009 Extend Lesson model with optional `lectureDocumentId` reference in `model/lesson.model.js`
- [x] T010 [P] Add `lectureDocumentUploadSchema` Zod validation in `lib/validations.js`
- [x] T011 [P] Add `docxFileSchema` Zod validation for file validation in `lib/validations.js`
- [x] T012 Implement DOCX text extraction using mammoth in `lib/docx/extractor.js`
- [x] T013 [P] Create ExtractionStatus shared component showing 4-state progress in `components/documents/extraction-status.jsx`
- [x] T014 [P] Add i18n messages for document upload/extraction in `messages/en.json` and `messages/ar.json`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Upload DOCX Document (Priority: P1) 🎯 MVP

**Goal**: Instructor can upload a .docx file alongside lecture video, system extracts and stores text content

**Independent Test**: Upload a .docx with medical terminology, verify text is extracted and stored with lesson

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US1] Unit test for DOCX extractor in `tests/unit/docx-extractor.test.js`
- [x] T016 [P] [US1] Integration test for upload flow in `tests/integration/lecture-document-upload.test.js`

### Implementation for User Story 1

- [x] T017 [US1] Implement `uploadLectureDocument` Server Action in `app/actions/lecture-document.js`
- [x] T018 [US1] Implement POST `/api/lecture-documents` route for file upload in `app/api/lecture-documents/route.js`
- [x] T019 [US1] Create DocumentUpload component with file picker and progress in `app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/document/_components/document-upload.jsx`
- [x] T020 [US1] Create document upload page integrating upload component in `app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/document/page.jsx`
- [x] T021 [US1] Add "Upload Transcript" link to lesson edit page in `app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/page.jsx`
- [x] T022 [US1] Implement instructor authorization check in upload Server Action (course instructor only)
- [x] T023 [US1] Handle extraction errors with user-friendly messages (invalid file, corrupted, password-protected)

**Checkpoint**: User Story 1 complete - instructors can upload .docx files and text is extracted

---

## Phase 4: User Story 2 - View and Verify Extracted Text (Priority: P2)

**Goal**: Instructor can preview extracted text to verify accuracy before publishing

**Independent Test**: After upload, view preview and confirm all terminology and structure is preserved

### Tests for User Story 2 ⚠️

- [x] T024 [P] [US2] Integration test for document retrieval in `tests/integration/lecture-document-get.test.js`

### Implementation for User Story 2

- [x] T025 [US2] Implement `getLectureDocumentByLesson` Server Action in `app/actions/lecture-document.js`
- [x] T026 [US2] Implement `getLectureDocumentStatus` Server Action for polling status in `app/actions/lecture-document.js`
- [x] T027 [US2] Implement GET `/api/lecture-documents/[id]` route in `app/api/lecture-documents/[id]/route.js`
- [x] T028 [US2] Implement GET `/api/lecture-documents/by-lesson/[lessonId]` route in `app/api/lecture-documents/by-lesson/[lessonId]/route.js`
- [x] T029 [US2] Create DocumentPreview component showing structured content in `app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/document/_components/document-preview.jsx`
- [x] T030 [US2] Update document page to show preview when document exists in `app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/document/page.jsx`
- [x] T031 [US2] Implement course-scoped access control for GET endpoints (instructors + enrolled students)

**Checkpoint**: User Story 2 complete - instructors can view and verify extracted text

---

## Phase 5: User Story 3 - Replace Existing Document (Priority: P3)

**Goal**: Instructor can replace an existing document with a new version

**Independent Test**: Upload replacement document, confirm old text is replaced with new text

### Tests for User Story 3 ⚠️

- [x] T032 [P] [US3] Integration test for document replacement in `tests/integration/lecture-document-replace.test.js`

### Implementation for User Story 3

- [x] T033 [US3] Implement `replaceLectureDocument` Server Action in `app/actions/lecture-document.js`
- [x] T034 [US3] Implement `deleteLectureDocument` Server Action in `app/actions/lecture-document.js`
- [x] T035 [US3] Implement PUT `/api/lecture-documents/[id]` route for replacement in `app/api/lecture-documents/[id]/route.js`
- [x] T036 [US3] Implement DELETE `/api/lecture-documents/[id]` route in `app/api/lecture-documents/[id]/route.js`
- [x] T037 [US3] Add confirmation dialog for document replacement in document-upload.jsx
- [x] T038 [US3] Update DocumentUpload component to handle replacement mode (existing document detected)
- [x] T039 [US3] Implement cascade delete when lesson is deleted (remove associated LectureDocument)

**Checkpoint**: User Story 3 complete - instructors can replace and delete documents

---

## Phase 6: User Story 4 - Student Access to Study Materials (Priority: P4)

**Goal**: Enrolled students can view extracted text inline and download as file

**Independent Test**: As enrolled student, view lecture and see study materials tab with view/download options

### Tests for User Story 4 ⚠️

- [x] T040 [P] [US4] Integration test for student download in `tests/integration/lecture-document-download.test.js`

### Implementation for User Story 4

- [x] T041 [US4] Implement GET `/api/lecture-documents/[id]/download` route with format param (txt/html) in `app/api/lecture-documents/[id]/download/route.js`
- [x] T042 [US4] Create StudyMaterials component for student view in `app/[locale]/(main)/courses/[id]/lessons/[lessonId]/_components/study-materials.jsx`
- [x] T043 [US4] Add StudyMaterials tab/section to student lesson page in `app/[locale]/(main)/courses/[id]/lessons/[lessonId]/page.jsx`
- [x] T044 [US4] Implement enrollment verification for student access (enrolled students only)
- [x] T045 [US4] Add download buttons for txt and html formats in StudyMaterials component

**Checkpoint**: User Story 4 complete - students can view and download study materials

---

## Phase 7: Search Integration (FR-016)

**Goal**: Extracted text is indexed in unified search alongside videos/courses

- [x] T046 Create text chunking utility for embedding generation in `lib/docx/chunker.js`
- [x] T047 Implement ChromaDB indexing service for lecture documents in `service/lecture-document-search.js`
- [x] T048 Add search indexing call after successful text extraction in upload Server Action
- [x] T049 Add search index cleanup on document deletion
- [x] T050 [P] Integration test for search indexing in `tests/integration/lecture-document-search.test.js`

**Checkpoint**: Search integration complete - extracted text appears in LMS search results

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T051 [P] Add loading skeletons to DocumentPreview and StudyMaterials components
- [x] T052 [P] Add error boundaries with retry options for upload failures
- [x] T053 Verify all error messages use i18n translations
- [x] T054 [P] Add aria labels and keyboard navigation to upload component (accessibility)
- [x] T055 Run quickstart.md validation - verify all setup steps work
- [x] T056 [P] Update README with feature documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 → US2 → US3 is recommended order (each builds on previous)
  - US4 can start after US2 (needs GET endpoint)
- **Search Integration (Phase 7)**: Depends on US1 completion (needs extraction working)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Upload) | Foundational | Phase 2 complete |
| US2 (Preview) | US1 (needs document to preview) | T023 complete |
| US3 (Replace) | US1 (needs existing document) | T023 complete |
| US4 (Student Access) | US2 (needs GET endpoint) | T031 complete |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Server Actions before API routes (Server Actions can call extraction directly)
3. API routes before UI components
4. Core implementation before polish

### Parallel Opportunities

**Phase 1 (all parallel):**
```
T002, T003, T004, T005, T006, T007 - directory creation
```

**Phase 2:**
```
T010, T011 - Zod schemas (parallel)
T013, T014 - Status component + i18n (parallel)
```

**Phase 3 (US1 tests parallel):**
```
T015, T016 - unit test + integration test
```

**Phase 4-6:**
```
Tests within each phase are parallelizable
```

---

## Parallel Example: Foundational Phase

```bash
# After T008, T009 (models) complete, launch these in parallel:
Task T010: "Add lectureDocumentUploadSchema Zod validation in lib/validations.js"
Task T011: "Add docxFileSchema Zod validation in lib/validations.js"
Task T013: "Create ExtractionStatus shared component in components/documents/extraction-status.jsx"
Task T014: "Add i18n messages in messages/en.json and messages/ar.json"
```

## Parallel Example: User Story 1 Tests

```bash
# Launch both tests in parallel before implementation:
Task T015: "Unit test for DOCX extractor in tests/unit/docx-extractor.test.js"
Task T016: "Integration test for upload flow in tests/integration/lecture-document-upload.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (~5 min)
2. Complete Phase 2: Foundational (~2-3 hours)
3. Complete Phase 3: User Story 1 (~3-4 hours)
4. **STOP and VALIDATE**: Upload a .docx, verify extraction works
5. Deploy MVP - instructors can upload documents

### Incremental Delivery

| Milestone | Stories Complete | User Value |
|-----------|------------------|------------|
| MVP | US1 | Instructors can upload documents |
| v1.1 | US1 + US2 | Instructors can verify extraction |
| v1.2 | US1-3 | Instructors can update documents |
| v1.3 | US1-4 | Students can access study materials |
| v2.0 | All + Search | Full feature with unified search |

### Estimated Task Counts

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Setup | 7 | 6 |
| Foundational | 7 | 4 |
| US1 (Upload) | 9 | 2 |
| US2 (Preview) | 8 | 1 |
| US3 (Replace) | 8 | 1 |
| US4 (Student) | 6 | 1 |
| Search | 5 | 1 |
| Polish | 6 | 4 |
| **Total** | **56** | **20** |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
