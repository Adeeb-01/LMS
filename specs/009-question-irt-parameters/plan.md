# Implementation Plan: Question IRT Parameters

**Branch**: `009-question-irt-parameters` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-question-irt-parameters/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Update the `Question` database schema to include Item Response Theory (IRT) parameters ($a$, $b$, $c$) so that the adaptive engine can mathematically calculate question difficulty and student ability later. This requires schema updates and automated reset logic when a question is modified, but no new UI components.

## Technical Context

**Language/Version**: JavaScript/TypeScript (Node.js)
**Primary Dependencies**: Next.js 15 (App Router), Mongoose 8, Zod 3
**Storage**: MongoDB (via Mongoose)
**Testing**: Jest / React Testing Library (for utility functions/models)
**Target Platform**: Web (Backend focus)
**Project Type**: Next.js Web Application
**Performance Goals**: Minimal overhead when fetching/updating questions
**Constraints**: Schema changes MUST be backward-compatible (existing questions without IRT params must gracefully fall back to defaults).
**Scale/Scope**: Impacts all `Question` entities in the database.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/009-question-irt-parameters/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── question.js  # Mongoose model to be updated
│   ├── schemas/
│   │   └── question.js  # Zod schema to be updated
│   └── services/
│       └── question.js  # Service layer handling question updates (to trigger reset logic)
└── tests/
    └── models/
        └── question.test.js # New tests for IRT parameters
```

**Structure Decision**: Selected the Web application (backend) structure, focusing purely on the model, schema, and service layers that handle data validation and mutation.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*(No violations - all Constitution principles successfully adhered to)*
