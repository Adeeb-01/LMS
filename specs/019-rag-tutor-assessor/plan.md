# Implementation Plan: Interactive RAG Tutor & Semantic Assessor

**Branch**: `019-rag-tutor-assessor` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-rag-tutor-assessor/spec.md`

## Summary

This feature adds an interactive learning system combining system-directed oral assessments with a voice-enabled RAG tutor. Students watching lecture videos will be prompted with oral questions at specific timestamps, their responses transcribed via Whisper and semantically evaluated against reference answers. Students can also ask the tutor questions, receiving contextually-grounded answers from ChromaDB-indexed lecture content. A recite-back loop reinforces learning by requiring students to articulate tutor explanations before continuing.

**Technical Approach**: Extend existing oral question infrastructure (`lib/ai/transcription.js`, `lib/ai/evaluation.js`) with new assessment point triggering in the video player, semantic similarity scoring via Gemini embeddings, and RAG query generation using existing `searchCourse` service.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15 (App Router)  
**Primary Dependencies**: Next.js 15, React 18, Mongoose 8, Zod 3, OpenAI (Whisper), @google/generative-ai (Gemini), chromadb, shadcn/ui, next-intl  
**Storage**: MongoDB (assessment data, interactions, concept gaps), ChromaDB (lecture embeddings - existing)  
**Testing**: Jest + React Testing Library  
**Target Platform**: Web (desktop/mobile browsers with microphone access)  
**Project Type**: Web application (LMS)  
**Performance Goals**: Transcription <30s, RAG response <5s, semantic scoring <3s  
**Constraints**: Audio deleted after transcription; soft limit 10 tutor questions/lesson  
**Scale/Scope**: Existing LMS user base; ~50-100 concurrent lesson sessions expected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ Pass | Student role required for assessments; Instructor role for authoring/approval |
| II. Server-Side Authority | ✅ Pass | All transcription, evaluation, RAG queries via Server Actions |
| III. Schema-Validated Data | ✅ Pass | Zod schemas for all inputs; Mongoose models for persistence |
| IV. Component Modularity | ✅ Pass | Reusable AudioRecorder, AssessmentPanel, TutorChat components |
| V. Progressive Enhancement | ✅ Pass | P1→P2→P3 prioritization enables incremental delivery |
| VI. Code Quality | ✅ Pass | Extends existing patterns in lib/ai/, app/actions/ |
| VII. Rigorous Testing | ✅ Pass | Unit tests for semantic scoring, integration tests for assessment flow |
| VIII. UX Consistency | ✅ Pass | shadcn/ui components; text fallback for accessibility |
| IX. Performance | ✅ Pass | Audio deleted after transcription; rate limiting on tutor queries |

## Project Structure

### Documentation (this feature)

```text
specs/019-rag-tutor-assessor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-routes.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Existing structure extended
app/
├── [locale]/(main)/courses/[id]/lesson/
│   └── _components/
│       ├── lesson-video.jsx              # MODIFY: Add assessment point triggers
│       ├── oral-assessment-panel.jsx     # NEW: Assessment UI overlay
│       ├── rag-tutor-panel.jsx           # NEW: Tutor chat interface
│       └── recite-back-modal.jsx         # NEW: Recite-back prompt
├── actions/
│   ├── oral-assessment.js                # NEW: Assessment submission/evaluation
│   └── rag-tutor.js                      # NEW: RAG query handling
└── api/
    ├── oral-assessment/
    │   └── [assessmentId]/
    │       └── submit/route.js           # NEW: Audio upload + evaluation
    └── rag-tutor/
        └── query/route.js                # NEW: RAG query endpoint

lib/
├── ai/
│   ├── transcription.js                  # EXISTING: Whisper transcription
│   ├── evaluation.js                     # EXISTING: GPT evaluation
│   ├── semantic-similarity.js            # NEW: Embedding-based similarity
│   └── concept-coverage.js               # NEW: Concept extraction and coverage analysis
└── rag/
    └── tutor-response.js                 # NEW: Grounded response generation

model/
├── oral-assessment.model.js              # NEW: Assessment points entity
├── student-response.model.js             # NEW: Student answers entity
├── tutor-interaction.model.js            # NEW: RAG interactions entity
├── recite-back-attempt.model.js          # NEW: Recite-back tracking
└── concept-gap.model.js                  # NEW: Learning gaps entity

components/
├── ui/AudioRecorder.jsx                  # EXISTING: Voice recording
└── assessment/
    ├── assessment-prompt.jsx             # NEW: Question display
    ├── similarity-result.jsx             # NEW: Score visualization
    └── concept-coverage.jsx              # NEW: Concept hit/miss display

__tests__/
├── lib/semantic-similarity.test.js       # NEW: Similarity scoring tests
├── lib/concept-coverage.test.js          # NEW: Concept coverage tests
├── actions/oral-assessment.test.js       # NEW: Assessment flow tests
├── actions/rag-tutor.test.js             # NEW: RAG query tests
└── e2e/rag-tutor-flow.test.js            # NEW: Full flow E2E test
```

**Structure Decision**: Extends existing Next.js App Router structure. New models follow established `model/*.model.js` pattern. Server Actions in `app/actions/` for business logic. Reusable UI components in `components/`.

## Complexity Tracking

> No Constitution violations requiring justification. Feature follows established patterns.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Semantic Similarity | Embedding cosine similarity via Gemini | Reuses existing `lib/embeddings/gemini.js` infrastructure |
| RAG Response | Extend `searchCourse` + Gemini generation | Builds on 014-semantic-embeddings-pipeline |
| Audio Handling | Immediate deletion post-transcription | Privacy compliance per clarification |
