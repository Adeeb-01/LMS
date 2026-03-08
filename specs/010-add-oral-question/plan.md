# Implementation Plan: Add Oral Question Type

**Branch**: `main` | **Date**: 2026-03-08 | **Spec**: `/specs/010-add-oral-question/spec.md`
**Input**: Feature specification from `/specs/010-add-oral-question/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement a new "oral" question type that allows instructors to define a `referenceAnswer`. Students provide spoken responses via the browser, which are uploaded to cloud storage. The backend handles transcription (OpenAI Whisper) and evaluation (OpenAI GPT) asynchronously against the reference answer.

## Technical Context

**Language/Version**: JavaScript/TypeScript (Next.js 15)
**Primary Dependencies**: Next.js App Router, `openai` Node SDK, Cloud Storage SDK (e.g., `@aws-sdk/client-s3`), React `MediaRecorder` hook/API
**Storage**: MongoDB (Mongoose 8) for metadata, Cloud Object Storage (e.g., AWS S3, Cloudflare R2) for raw audio
**Testing**: NEEDS CLARIFICATION (What testing framework is currently used for backend/frontend?)
**Target Platform**: Web browsers (for recording) and Next.js Node.js server
**Project Type**: Web application
**Performance Goals**: AI evaluation MUST be asynchronous to prevent request timeouts
**Constraints**: Requires browser microphone permissions (graceful fallback required), dependent on OpenAI API availability and latency
**Scale/Scope**: Depends on concurrent assessment takers; asynchronous evaluation queue handles scaling

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Role-Based Security First**: Creating oral questions restricted to Instructors; submitting answers restricted to enrolled Students.
- [x] **II. Server-Side Authority**: Audio uploading, Whisper transcription, and GPT evaluation will occur via secure Server Actions / API Routes.
- [x] **III. Schema-Validated Data**: Zod schemas for `Question` and `StudentAnswer` will be updated to support the new `oral` type, `referenceAnswer`, and cloud storage URLs.
- [x] **IV. Component Modularity**: A reusable `AudioRecorder` component will be built using shadcn/ui principles.
- [x] **V. Progressive Enhancement & MVP Delivery**: If the user denies microphone permission, the question is gracefully marked as unanswerable without blocking the assessment.
- [x] **VI. Code Quality & Maintainability**: Complex AI evaluation logic will be isolated in dedicated server services.
- [x] **VII. Rigorous Testing Standards**: Automated tests will be required for the evaluation logic and new Zod schemas.
- [x] **VIII. User Experience (UX) Consistency**: The new question UI will match the existing multiple-choice/text UI patterns.
- [x] **IX. Performance Requirements**: Asynchronous grading ensures the user is not blocked waiting for OpenAI APIs.

## Project Structure

### Documentation (this feature)

```text
specs/010-add-oral-question/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/ (or app/ based on Next.js conventions)
├── components/
│   ├── questions/
│   │   ├── OralQuestionForm.tsx       # Instructor creation UI
│   │   └── OralQuestionPlayer.tsx     # Student answering UI
│   └── ui/
│       └── AudioRecorder.tsx          # Generic audio recorder component
├── lib/
│   ├── ai/
│   │   ├── transcription.ts           # OpenAI Whisper integration
│   │   └── evaluation.ts              # OpenAI GPT integration
│   └── storage/
│       └── s3.ts                      # Cloud object storage integration
├── models/
│   ├── Question.ts                    # Updated Mongoose schema
│   └── Answer.ts                      # Updated Mongoose schema
├── schemas/
│   ├── question.schema.ts             # Updated Zod schemas
│   └── answer.schema.ts               # Updated Zod schemas
└── app/
    └── api/
        └── evaluate-oral/
            └── route.ts               # Async background processing trigger
```

**Structure Decision**: Integrated directly into the existing Next.js App Router application structure, adding specific AI and storage utilities to `lib/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |

