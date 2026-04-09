# Implementation Plan: Semantic Embeddings Pipeline

**Branch**: `014-semantic-embeddings-pipeline` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-semantic-embeddings-pipeline/spec.md`

## Summary

Build a semantic embeddings pipeline that parses lecture document text by structural headings, generates embeddings using Gemini API, and stores them in ChromaDB for semantic search. Students can query course content using natural language and receive relevant chunks ranked by similarity. Extends existing 012-docx-text-extraction with heading-aware chunking and 011-configure-databases ChromaDB infrastructure.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15 (App Router)  
**Primary Dependencies**: Mongoose 8, Zod 3, @google/generative-ai (Gemini), chromadb (existing), shadcn/ui  
**Storage**: MongoDB (indexing jobs, chunk metadata), ChromaDB (vector embeddings)  
**Testing**: Jest (existing test setup)  
**Target Platform**: Web application (server-side processing, browser search UI)  
**Project Type**: Web service (LMS platform extension)  
**Performance Goals**: 60s indexing for 50-page documents, 2s search response  
**Constraints**: 5 concurrent indexing jobs, 0.7 relevance threshold, course-scoped access  
**Scale/Scope**: Existing LMS user base, extends 012-docx-text-extraction

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ Pass | FR-005: Students search only enrolled courses; indexing triggered by instructor uploads |
| II. Server-Side Authority | ✅ Pass | All embedding generation, search, and access control are server-side (Server Actions/API routes) |
| III. Schema-Validated Data | ✅ Pass | Zod schemas for search queries, Mongoose models for indexing jobs |
| IV. Component Modularity | ✅ Pass | Reusable search component, status indicators in feature folders |
| V. Progressive Enhancement | ✅ Pass | P1/P2/P3 user stories enable incremental delivery; graceful degradation if ChromaDB unavailable |
| VI. Code Quality | ✅ Pass | Follows existing patterns from 011/012; clear service separation |
| VII. Rigorous Testing | ✅ Pass | Unit tests for chunking, integration tests for pipeline |
| VIII. UX Consistency | ✅ Pass | shadcn/ui components, existing search patterns |
| IX. Performance Requirements | ✅ Pass | SC-001/SC-003 define measurable targets; job queue limits concurrency |

**Pre-Design Gate Status**: ✅ PASSED

### Post-Design Re-Check

| Principle | Status | Verification |
|-----------|--------|--------------|
| I. Role-Based Security | ✅ Pass | Search API validates enrollment before returning results |
| II. Server-Side Authority | ✅ Pass | All logic in `service/`, `lib/`, `app/api/`, `app/actions/` |
| III. Schema-Validated Data | ✅ Pass | Zod schemas in data-model.md for all inputs |
| IV. Component Modularity | ✅ Pass | Search UI component reusable, status badges from 012 |
| V. Progressive Enhancement | ✅ Pass | Indexing independent of search; status visibility P3 |
| VI. Code Quality | ✅ Pass | Single-responsibility services, JSDoc documented |
| VII. Rigorous Testing | ✅ Pass | Test plan: unit tests for chunker, integration for search |
| VIII. UX Consistency | ✅ Pass | Search results follow existing card patterns |
| IX. Performance Requirements | ✅ Pass | Job queue enforces concurrency, caching for embeddings |

**Post-Design Gate Status**: ✅ PASSED - Design complies with all nine principles

## Project Structure

### Documentation (this feature)

```text
specs/014-semantic-embeddings-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── semantic-search-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
lib/
├── embeddings/
│   ├── gemini.js            # NEW: Gemini embedding generation
│   └── chunker.js           # NEW: Heading-aware text chunking (extends 012)
├── validations.js           # Extended with search schemas

service/
├── chroma.js                # EXISTING: ChromaDB client (enhance)
├── embedding-queue.js       # NEW: Job queue for indexing (max 5 concurrent)
└── semantic-search.js       # NEW: Search service with enrollment check

model/
├── indexing-job.model.js    # NEW: IndexingJob tracking
└── lecture-document.model.js # EXISTING: Add embeddingStatus field

app/
├── actions/
│   ├── semantic-search.js   # NEW: Search Server Action
│   └── indexing.js          # NEW: Trigger/cancel indexing actions
└── api/
    └── semantic-search/
        └── route.js         # NEW: Search API endpoint

app/[locale]/(main)/courses/[id]/
└── _components/
    └── course-search.jsx    # NEW: Student search UI component

app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/
└── _components/
    └── embedding-status.jsx # NEW: Indexing status indicator

tests/
├── unit/
│   ├── heading-chunker.test.js
│   └── gemini-embeddings.test.js
└── integration/
    ├── embedding-pipeline.test.js
    └── semantic-search.test.js
```

**Structure Decision**: Follows existing Next.js 15 App Router conventions. New embedding utilities in `lib/embeddings/`, services in `service/`, search API in `app/api/`. Reuses patterns from 011-configure-databases and 012-docx-text-extraction.

## Complexity Tracking

> No Constitution violations requiring justification. Design follows existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
