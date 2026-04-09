# Implementation Plan: Automatic MCQ Generation

**Branch**: `015-auto-mcq-generation` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)

## Summary

Enable instructors to automatically generate university-level MCQs from indexed lecture content using Gemini AI. The system analyzes structural chunks (from 014-semantic-embeddings-pipeline), generates 1-3 questions per chunk with estimated IRT difficulty parameters (b-values), and injects them into the quiz system in draft status for instructor review.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15 (App Router)  
**Primary Dependencies**: Next.js 15, React 18, Mongoose 8, Zod 3, @google/generative-ai (Gemini), shadcn/ui, next-intl  
**Storage**: MongoDB (generation jobs, questions), ChromaDB (chunk retrieval for duplicate detection)  
**Testing**: Jest with jest.setup.js, integration tests in tests/integration/  
**Target Platform**: Web application (server-rendered + client components)  
**Project Type**: Web service (LMS platform)  
**Performance Goals**: Generate MCQs for 20-30 page lecture within 2 minutes  
**Constraints**: Gemini API rate limits, background processing for large documents  
**Scale/Scope**: Per-lesson generation, ~20-60 questions per typical lecture document

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ PASS | Only course owner/primary instructor can trigger generation (clarified in spec) |
| II. Server-Side Authority | ✅ PASS | Generation logic in Server Actions, Gemini calls server-side only |
| III. Schema-Validated Data | ✅ PASS | Zod validation for trigger requests, generated question output |
| IV. Component Modularity | ✅ PASS | Generation UI in dashboard feature folder, shared components in components/ |
| V. Progressive Enhancement | ✅ PASS | P1 (generation) → P2 (difficulty) → P3 (progress) ordered by value |
| VI. Code Quality | ✅ PASS | Follow existing patterns from quizv2.js actions |
| VII. Rigorous Testing | ✅ PASS | Unit tests for generation logic, integration tests for API |
| VIII. UX Consistency | ✅ PASS | Use existing shadcn/ui patterns, status indicators match IndexingJob pattern |
| IX. Performance | ✅ PASS | Background processing, progress tracking, chunked API calls |

## Project Structure

### Documentation (this feature)

```text
specs/015-auto-mcq-generation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── generation-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── actions/
│   └── mcq-generation.js          # Server actions for triggering/managing generation
├── api/
│   └── mcq-generation/
│       ├── route.js               # Trigger generation endpoint
│       ├── [jobId]/
│       │   └── route.js           # Job status polling
│       └── job/[jobId]/
│           └── route.js           # Job processor webhook
├── [locale]/dashboard/courses/[courseId]/lessons/[lessonId]/
│   └── generate-questions/
│       ├── page.jsx               # Generation UI page
│       └── _components/
│           ├── generation-trigger.jsx
│           ├── generation-progress.jsx
│           └── generated-questions-preview.jsx

components/
├── mcq-generation/
│   ├── difficulty-badge.jsx       # B-value display component
│   └── generation-status.jsx      # Status indicator

lib/
├── mcq-generation/
│   ├── generator.js               # Gemini prompt engineering for MCQ generation
│   ├── difficulty-estimator.js    # B-value estimation logic
│   ├── duplicate-detector.js      # Semantic similarity checking
│   └── question-validator.js      # Quality validation for generated questions

model/
└── generation-job.model.js        # MCQ generation job tracking

service/
└── mcq-generation-queue.js        # Background job processing

tests/
├── unit/
│   ├── mcq-generator.test.js
│   ├── difficulty-estimator.test.js
│   └── duplicate-detector.test.js
└── integration/
    └── mcq-generation.test.js
```

**Structure Decision**: Follows existing LMS patterns - Server Actions in `app/actions/`, models in `model/`, services in `service/`, feature UI in dashboard routes.

## Complexity Tracking

> No Constitution violations requiring justification.

| Decision | Rationale |
|----------|-----------|
| Separate GenerationJob model | Mirrors IndexingJob pattern from 014; enables background processing with progress tracking |
| Extend Question model | Add source metadata fields rather than creating new entity; maintains quiz system compatibility |
| Gemini generative model | Use gemini-1.5-flash for generation (fast, cost-effective) vs text-embedding-004 for embeddings |
