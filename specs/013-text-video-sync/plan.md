# Implementation Plan: Text-Video Timestamp Synchronization

**Branch**: `013-text-video-sync` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-text-video-sync/spec.md`

## Summary

Implement an AI pipeline that synchronizes extracted DOCX text (from 012-docx-text-extraction) with video audio timestamps. The pipeline extracts audio from lecture videos, generates word-level transcripts using speech-to-text, and aligns document text blocks with their spoken positions. Each paragraph/heading gets start/end timestamps, enabling students to click-to-seek and questions to link to explanations.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15 (App Router)  
**Primary Dependencies**: Mongoose 8, Zod 3, openai-whisper (via @xenova/transformers or whisper.cpp), ffmpeg (audio extraction), shadcn/ui, existing 012-docx-text-extraction  
**Storage**: MongoDB (alignment data, transcripts), local filesystem (video files from existing upload)  
**Testing**: Jest (existing test setup)  
**Target Platform**: Web application (server-side processing pipeline)  
**Project Type**: Web service (LMS platform extension)  
**Performance Goals**: Processing within 2x video duration (e.g., 20 min for 10-min video), <1s video seek on click  
**Constraints**: 2-hour max video duration, course-scoped access, 70% confidence threshold for review flagging  
**Scale/Scope**: Existing LMS user base, one alignment per lesson (tied to LectureDocument)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ PASS | FR-019 enforces course-scoped access; alignment restricted to instructors/enrolled students |
| II. Server-Side Authority | ✅ PASS | All alignment, STT, and timestamp logic server-side via Server Actions |
| III. Schema-Validated Data | ✅ PASS | Zod schemas for alignment data, Mongoose models for persistence |
| IV. Component Modularity | ✅ PASS | Reusable video-text sync components, alignment review UI in feature folder |
| V. Progressive Enhancement | ✅ PASS | P1/P2/P3/P4 user stories enable incremental delivery (core alignment → student UI → questions → instructor review) |
| VI. Code Quality | ✅ PASS | Will follow existing patterns from 012-docx-text-extraction |
| VII. Rigorous Testing | ✅ PASS | Unit tests for alignment algorithm, integration tests for pipeline flow |
| VIII. UX Consistency | ✅ PASS | shadcn/ui components, existing video player integration |
| IX. Performance Requirements | ✅ PASS | SC-001/SC-002 define measurable processing and UI targets |

**Gate Result**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/013-text-video-sync/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── alignment-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
model/
├── lecture-document.model.js  # EXTENDED: Add alignment reference
├── video-transcript.model.js  # NEW: STT transcript with word timestamps
└── alignment-job.model.js     # NEW: Processing job tracking

lib/
├── validations.js             # EXTENDED: Alignment schemas
└── alignment/
    ├── config.js              # NEW: ffmpeg path and alignment config
    ├── audio-extractor.js     # NEW: ffmpeg audio extraction
    ├── transcriber.js         # NEW: Whisper STT integration
    ├── text-aligner.js        # NEW: Document-to-transcript alignment
    ├── timestamp-lookup.js    # NEW: Helper for question timestamp propagation
    └── job-processor.js       # NEW: Background job runner

app/
├── actions/
│   └── alignment.js           # NEW: Server Actions for alignment
└── api/
    └── alignments/
        ├── lesson/
        │   └── [lessonId]/
        │       └── route.js   # NEW: Get alignment data for lesson
        └── job/
            └── [jobId]/
                └── route.js   # NEW: Job status polling

app/[locale]/dashboard/courses/[courseId]/
└── lessons/[lessonId]/
    └── alignment/
        └── _components/
            ├── alignment-status.jsx    # NEW: Processing status
            └── alignment-review.jsx    # NEW: Instructor review UI

app/[locale]/(main)/courses/[id]/lessons/[lessonId]/
└── _components/
    ├── study-materials.jsx    # EXTENDED: Add click-to-seek
    └── video-text-sync.jsx    # NEW: Synchronized playback view

components/
└── alignment/
    ├── timestamp-badge.jsx    # NEW: Timestamp display
    └── confidence-indicator.jsx # NEW: Confidence score UI

service/
└── alignment-queue.js         # NEW: Job queue management

tests/
├── unit/
│   ├── text-aligner.test.js
│   └── audio-extractor.test.js
└── integration/
    └── alignment-pipeline.test.js
```

**Structure Decision**: Follows existing Next.js 15 App Router conventions from 012-docx-text-extraction. Models in `/model`, alignment logic in `/lib/alignment`, actions in `/app/actions`, API routes in `/app/api`.

## Complexity Tracking

> No Constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
