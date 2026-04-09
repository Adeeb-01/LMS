# Implementation Plan: AI Generation & Vectorization Pipeline (Epic 1)

**Branch**: `017-ai-generation-pipeline` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/017-ai-generation-pipeline/spec.md`

## Summary

This Epic orchestrates existing AI-powered pipelines (DOCX extraction, text-video sync, semantic embeddings, MCQ generation) into a unified workflow and introduces **Automatic Oral Question Generation** as a new capability. The implementation follows established patterns from 014/015 specs with a new PipelineJob orchestrator and OralGenerationJob processor.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15 (App Router)
**Primary Dependencies**: 
- Next.js 15 (App Router), React 18
- Mongoose 8 (MongoDB ODM)
- @google/generative-ai (Gemini API - existing)
- chromadb (vector database - existing)
- Zod 3 (validation)
- shadcn/ui + Tailwind CSS (UI components)
- next-intl (i18n)

**Storage**: MongoDB (job state, questions), ChromaDB (embeddings - existing)
**Testing**: Jest with React Testing Library
**Target Platform**: Web application (Node.js server, browser client)
**Project Type**: Web service (LMS platform feature extension)
**Performance Goals**: Pipeline completion within 1.5x video duration for 30-min lecture (SC-001)
**Constraints**: Max 5 concurrent pipeline jobs system-wide (FR-006b)
**Scale/Scope**: Course-level processing, targeting lessons with video + DOCX uploads

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ Pass | FR-006a restricts pipeline trigger to course owner only |
| II. Server-Side Authority | ✅ Pass | All generation logic in Server Actions and background processors |
| III. Schema-Validated Data | ✅ Pass | Zod schemas for all inputs; Mongoose models for persistence |
| IV. Component Modularity | ✅ Pass | Reuses existing UI patterns from 015; adds pipeline dashboard component |
| V. Progressive Enhancement | ✅ Pass | Epic builds on existing features; oral generation is independent increment |
| VI. Code Quality | ✅ Pass | Follows established patterns from 014/015 |
| VII. Rigorous Testing | ✅ Pass | Unit tests for generator, contract tests for API |
| VIII. UX Consistency | ✅ Pass | Uses existing shadcn/ui components, consistent with dashboard |
| IX. Performance Requirements | ✅ Pass | Background processing, polling pattern, no blocking operations |

## Project Structure

### Documentation (this feature)

```text
specs/017-ai-generation-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0: Technical decisions
├── data-model.md        # Phase 1: Entity schemas
├── quickstart.md        # Phase 1: Setup guide
├── contracts/           # Phase 1: API contracts
│   └── pipeline-api.md  # Pipeline orchestration endpoints
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (repository root)

```text
# Existing structure - additions marked with [NEW]

model/
├── generation-job.model.js        # Existing (MCQ generation)
├── pipeline-job.model.js          # [NEW] Pipeline orchestration
└── oral-generation-job.model.js   # [NEW] Oral question generation

service/
├── mcq-generation-queue.js        # Existing
├── oral-generation-queue.js       # [NEW] Oral question processor
└── pipeline-orchestrator.js       # [NEW] Pipeline coordination

lib/
├── mcq-generation/                # Existing
│   ├── generator.js
│   └── duplicate-detector.js
└── oral-generation/               # [NEW]
    ├── generator.js               # Gemini prompt for oral questions
    ├── duplicate-detector.js      # 0.90 threshold for oral
    └── reference-answer-builder.js

app/
├── actions/
│   ├── mcq-generation.js          # Existing
│   ├── oral-generation.js         # [NEW] Trigger oral generation
│   └── pipeline.js                # [NEW] Unified pipeline actions
├── api/
│   ├── mcq-generation/            # Existing
│   ├── oral-generation/           # [NEW]
│   │   └── [jobId]/route.js       # Job status endpoint
│   └── pipeline/                  # [NEW]
│       └── [lessonId]/
│           └── status/route.js    # Unified pipeline status
└── [locale]/dashboard/courses/[courseId]/lessons/[lessonId]/
    └── pipeline/                  # [NEW]
        └── _components/
            └── pipeline-dashboard.jsx

components/
└── pipeline/                      # [NEW]
    ├── stage-indicator.jsx
    ├── progress-summary.jsx
    └── retry-button.jsx
```

**Structure Decision**: Extends existing monolithic Next.js structure. New files follow established patterns from 014/015.

## Complexity Tracking

No constitution violations requiring justification. Feature follows established patterns.

## Phase 0: Research Summary

See [research.md](./research.md) for detailed decisions:
- Oral question prompt engineering strategy
- Reference answer structure
- Pipeline orchestration pattern
- Duplicate detection threshold rationale

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md) - PipelineJob, OralGenerationJob schemas
- [contracts/pipeline-api.md](./contracts/pipeline-api.md) - API endpoint specifications
- [quickstart.md](./quickstart.md) - Environment setup and testing guide
