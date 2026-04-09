# Implementation Plan: DOCX Text Extraction for Lecture Videos

**Branch**: `012-docx-text-extraction` | **Date**: 2026-03-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-docx-text-extraction/spec.md`

## Summary

Enable instructors to upload Word documents (.docx) alongside lecture videos, extracting 100% accurate text content including complex medical/scientific terminology. The extracted text serves three purposes: unified search indexing (via existing ChromaDB), quiz/question generation (AI integration), and student study materials (inline view + download). This bypasses speech-to-text transcription errors for specialized terminology.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15 (App Router)  
**Primary Dependencies**: Mongoose 8, Zod 3, mammoth (DOCX parsing), chromadb (existing), shadcn/ui  
**Storage**: MongoDB (document metadata + extracted text), ChromaDB (search embeddings), local filesystem or S3 (uploaded .docx files)  
**Testing**: Jest (existing test setup)  
**Target Platform**: Web application (browser upload, server-side processing)  
**Project Type**: Web service (LMS platform extension)  
**Performance Goals**: 30 seconds extraction for 10-page documents, 50 concurrent uploads  
**Constraints**: 50 MB max file size, course-scoped access control  
**Scale/Scope**: Existing LMS user base, one document per lecture (1:1 relationship)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ PASS | FR-013 enforces course-scoped access; upload restricted to instructors |
| II. Server-Side Authority | ✅ PASS | Extraction, validation, access control all server-side via Server Actions |
| III. Schema-Validated Data | ✅ PASS | Zod schemas for upload, Mongoose models for persistence |
| IV. Component Modularity | ✅ PASS | Reusable upload component, preview component in feature folder |
| V. Progressive Enhancement | ✅ PASS | P1/P2/P3 user stories enable incremental delivery |
| VI. Code Quality | ✅ PASS | Will follow existing patterns in codebase |
| VII. Rigorous Testing | ✅ PASS | Unit tests for extraction, integration tests for upload flow |
| VIII. UX Consistency | ✅ PASS | shadcn/ui components, existing upload patterns |
| IX. Performance Requirements | ✅ PASS | SC-001/SC-006 define measurable targets |

**Gate Result**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/012-docx-text-extraction/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── lecture-document-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
model/
├── lesson.model.js           # Extended with lectureDocument reference
└── lecture-document.model.js # NEW: LectureDocument + ExtractedText

lib/
├── validations.js            # Extended with lectureDocument schemas
└── docx/
    └── extractor.js          # NEW: DOCX text extraction logic

app/
├── actions/
│   └── lecture-document.js   # NEW: Server Actions for upload/extract
└── api/
    └── lecture-documents/
        ├── route.js          # NEW: Upload endpoint
        └── [id]/
            ├── route.js      # NEW: Get/delete document
            └── download/
                └── route.js  # NEW: Download extracted text

app/[locale]/dashboard/courses/[courseId]/
└── lessons/[lessonId]/
    └── document/
        └── _components/
            ├── document-upload.jsx   # NEW: Upload UI
            └── document-preview.jsx  # NEW: Preview extracted text

app/[locale]/(main)/courses/[id]/lessons/[lessonId]/
└── _components/
    └── study-materials.jsx   # NEW: Student view/download

components/
└── documents/
    └── extraction-status.jsx # NEW: Processing state indicator

tests/
├── unit/
│   └── docx-extractor.test.js
└── integration/
    └── lecture-document.test.js
```

**Structure Decision**: Follows existing Next.js 15 App Router conventions. Models in `/model`, actions in `/app/actions`, API routes in `/app/api`, feature components co-located with pages.

## Complexity Tracking

> No Constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
