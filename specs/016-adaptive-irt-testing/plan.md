# Implementation Plan: Adaptive IRT Testing

**Branch**: `016-adaptive-irt-testing` | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/016-adaptive-irt-testing/spec.md`

## Summary

Implement Computerized Adaptive Testing (CAT) using the 3-Parameter Logistic IRT model. The system will dynamically select questions based on Maximum Fisher Information criterion, estimate student ability (θ) using EAP estimation after each response, and terminate when measurement precision reaches a configurable threshold. This extends the existing Quiz and Attempt models without breaking fixed-form quizzes.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15 (App Router)  
**Primary Dependencies**: Next.js 15, React 18, Mongoose 8, Zod 3, shadcn/ui, next-intl (existing); mathjs (new - for numerical integration in EAP)  
**Storage**: MongoDB via Mongoose 8 (extends existing Quiz, Attempt, Question models)  
**Testing**: Jest (existing setup in `jest.config.mjs`)  
**Target Platform**: Web application (browser-based)  
**Project Type**: Web service (LMS platform)  
**Performance Goals**: Question selection completes in <500ms (SC-006)  
**Constraints**: Single active session per student per quiz; offline not supported  
**Scale/Scope**: Existing LMS scale; question pools 30-100 items per adaptive quiz

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ Pass | FR-015 defines θ visibility by role; server-side enforcement |
| II. Server-Side Authority | ✅ Pass | All IRT calculations, question selection, and θ estimation in Server Actions |
| III. Schema-Validated Data | ✅ Pass | Zod schemas for adaptive config; Mongoose for persistence |
| IV. Component Modularity | ✅ Pass | Adaptive UI extends existing quiz components; reusable ability display |
| V. Progressive Enhancement | ✅ Pass | P1 stories (core CAT) deliverable independently; analytics (P3) deferred |
| VI. Code Quality | ✅ Pass | IRT math functions documented with formulas; single-responsibility modules |
| VII. Rigorous Testing | ✅ Pass | Unit tests for IRT calculations; integration tests for adaptive flow |
| VIII. UX Consistency | ✅ Pass | Uses existing shadcn/ui; ability display follows design system |
| IX. Performance | ✅ Pass | 500ms target; Fisher Info calculation is O(n) on question pool |

## Project Structure

### Documentation (this feature)

```text
specs/016-adaptive-irt-testing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── adaptive-quiz-api.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Existing structure with adaptive extensions

model/
├── quizv2-model.js          # EXTEND: Add adaptive config fields
├── attemptv2-model.js       # EXTEND: Add θ, SE, history, termination reason
└── questionv2-model.js      # EXISTING: IRT params (a, b, c) from spec 009

lib/
├── validations.js           # EXTEND: Add adaptive quiz Zod schemas
└── irt/                     # NEW: IRT calculation module
    ├── probability.js       # 3PL probability function
    ├── estimation.js        # EAP θ estimation
    ├── information.js       # Fisher Information calculation
    └── selection.js         # Maximum Information question selection

app/actions/
├── quizv2.js                # EXTEND: Adaptive quiz CRUD
└── adaptive-quiz.js         # NEW: Adaptive attempt flow (start, answer, select next)

app/[locale]/(main)/courses/[id]/quizzes/[quizId]/
└── _components/
    ├── adaptive-quiz-interface.jsx  # NEW: Adaptive quiz taking UI
    ├── ability-indicator.jsx        # NEW: θ display component
    └── adaptive-results.jsx         # NEW: Results with confidence

app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/
└── _components/
    └── adaptive-config-form.jsx     # NEW: Instructor config UI

tests/
├── unit/
│   └── irt/                 # NEW: Unit tests for IRT functions
│       ├── probability.test.js
│       ├── information.test.js
│       ├── estimation.test.js
│       └── selection.test.js
└── integration/
    └── adaptive-quiz.test.js  # NEW: End-to-end adaptive flow
```

**Structure Decision**: Extends existing LMS structure. IRT calculations isolated in `lib/irt/` for testability and reuse. Adaptive UI components colocated with existing quiz components.

## Complexity Tracking

> No Constitution violations requiring justification. Feature aligns with all nine principles.

| Consideration | Decision | Rationale |
|--------------|----------|-----------|
| IRT library vs custom | Custom implementation | mathjs for numerical integration only; full IRT libraries (e.g., catsim) are Python; JS equivalents are sparse/unmaintained |
| EAP vs MLE | EAP with standard normal prior | Handles all-correct/all-incorrect patterns without fallback logic (clarified in spec) |
| Session locking | Mongoose optimistic locking | Existing pattern in attemptv2-model; prevents concurrent device issues |
