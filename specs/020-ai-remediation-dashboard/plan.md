# Implementation Plan: AI-Driven Remediation Dashboard

**Branch**: `020-ai-remediation-dashboard` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-ai-remediation-dashboard/spec.md`

## Summary

Build a smart remediation dashboard that aggregates student weaknesses from BAT assessments (Unit 1) and Oral recitations (Unit 2), queries the vector database for concept-to-timestamp mappings, and provides deep-linked video playback for targeted concept review. The dashboard displays a prioritized weakness list with "Review Concept" buttons that jump directly to relevant video segments.

## Technical Context

**Language/Version**: JavaScript (JSX/JS) via Node.js 22.x  
**Primary Dependencies**: Next.js 15 (App Router), React 18, NextAuth v5, Mongoose 8, Zod 3, shadcn/ui, next-intl, ChromaDB  
**Storage**: MongoDB (Mongoose 8), ChromaDB for vector embeddings  
**Testing**: Jest, React Testing Library  
**Target Platform**: Web application (desktop/mobile responsive)  
**Project Type**: Web service (LMS platform)  
**Performance Goals**: Dashboard load < 3 seconds, real-time weakness profile updates < 30 seconds  
**Constraints**: Must integrate with existing BAT (`Attempt.bat.missedConceptTags`) and Oral (`StudentResponse.conceptsMissing`) data structures  
**Scale/Scope**: Per-student weakness profiles, class-level aggregated analytics for instructors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ Pass | Student sees own profile only; Instructor sees anonymized aggregates (FR-013, FR-014) |
| II. Server-Side Authority | ✅ Pass | All aggregation logic in Server Actions; client displays only |
| III. Schema-Validated Data | ✅ Pass | Zod schemas for all API inputs; Mongoose for persistence |
| IV. Component Modularity | ✅ Pass | Reusable WeaknessCard, RemediationPlayer components |
| V. Progressive Enhancement | ✅ Pass | P1 (dashboard) → P2 (deep-link) → P3 (aggregation) → P4 (priority) |
| VI. Code Quality | ✅ Pass | Follows existing patterns in `app/actions/` |
| VII. Testing Standards | ✅ Pass | Unit tests for aggregation, integration tests for API |
| VIII. UX Consistency | ✅ Pass | shadcn/ui components, WCAG 2.1 AA compliance |
| IX. Performance Requirements | ✅ Pass | Paginated weakness list, indexed queries |

## Project Structure

### Documentation (this feature)

```text
specs/020-ai-remediation-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── actions/
│   └── remediation.js              # Server Actions for weakness aggregation & retrieval
├── api/
│   └── remediation/
│       └── aggregate/route.js      # Background job trigger endpoint
├── [locale]/(main)/
│   └── dashboard/
│       └── remediation/
│           ├── page.js             # Student remediation dashboard
│           └── _components/
│               ├── weakness-list.jsx
│               ├── weakness-card.jsx
│               ├── remediation-player.jsx
│               └── resolved-section.jsx

model/
├── weakness-profile.model.js       # New: Per-student weakness profile
└── remediation-session.model.js    # New: Tracks remediation video views

lib/
├── remediation/
│   ├── aggregator.js               # Weakness aggregation logic
│   ├── priority-scorer.js          # Priority calculation algorithm
│   └── timestamp-resolver.js       # Vector DB → timestamp mapping

service/
└── remediation-queue.js            # Background job for profile updates

__tests__/
├── lib/
│   └── remediation/
│       ├── aggregator.test.js
│       └── priority-scorer.test.js
└── actions/
    └── remediation.test.js
```

**Structure Decision**: Follows existing LMS patterns with Server Actions in `app/actions/`, services for background processing, and feature-scoped UI components.

## Complexity Tracking

> No Constitution violations requiring justification.

| Consideration | Decision | Rationale |
|--------------|----------|-----------|
| Separate WeaknessProfile model vs extending ConceptGap | New WeaknessProfile model | ConceptGap is lesson-scoped; we need course-wide aggregation with priority scores |
| Real-time vs batch aggregation | Near real-time (<30s) via background job | Balances user experience with system load |
| Vector DB query strategy | Query by concept tag, cache timestamp mappings | Avoid repeated queries for same concept |
