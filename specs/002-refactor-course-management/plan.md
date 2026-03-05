# Implementation Plan: Refactor Course Management

**Branch**: `002-refactor-course-management` | **Date**: 2026-03-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-refactor-course-management/spec.md`

## Summary

Refactor the course, module, and lesson management UI/UX to provide a streamlined course creation flow, comprehensive editing interface, and clear publishing workflow. The refactoring focuses on consolidating scattered form components into cohesive views, adding soft-delete for courses with enrollments, implementing upload retry logic, and improving publish status visibility—all while preserving existing data models and authorization patterns.

## Technical Context

**Language/Version**: JavaScript (JSX/JS) via Node.js / Next.js 15 (App Router)  
**Primary Dependencies**: React 18, NextAuth v5, Mongoose 8, Zod 3, React Hook Form, @hello-pangea/dnd, shadcn/ui, next-intl  
**Storage**: MongoDB via Mongoose 8  
**Testing**: None currently configured (manual testing workflow)  
**Target Platform**: Web (modern browsers)  
**Project Type**: Web application (LMS)  
**Performance Goals**: Drag-and-drop < 1s, form validation < 500ms, page load optimized  
**Constraints**: Backward compatible with existing courses, no data model schema changes (only add fields)  
**Scale/Scope**: Existing instructor dashboard, ~10 form components to refactor, ~5 server actions to enhance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ Pass | All server actions use `getLoggedInUser()` + `assertInstructorOwns*` helpers; no changes to authorization model |
| II. Server-Side Authority | ✅ Pass | All mutations remain in Server Actions (`app/actions/`); client components handle presentation only |
| III. Schema-Validated Data | ✅ Pass | Zod schemas in `lib/validations.js` for all entities; will extend for new fields (soft-delete) |
| IV. Component Modularity | ✅ Pass | Refactoring improves modularity by consolidating duplicate form patterns into reusable components |
| V. Progressive Enhancement | ✅ Pass | Feature is independently deliverable; core learner journey unchanged; incremental UI improvements |

**Gate Result**: PASS — No violations. Proceed to Phase 0.

### Post-Phase 1 Re-check

| Principle | Status | Design Validation |
|-----------|--------|-------------------|
| I. Role-Based Security | ✅ Pass | Server actions contract maintains all `assertInstructorOwns*` checks; `restoreCourse` is Admin-only |
| II. Server-Side Authority | ✅ Pass | All new logic (soft-delete, publish validation) in server actions; no client-side business logic |
| III. Schema-Validated Data | ✅ Pass | `courseDeleteSchema` added; `validatePublishRequirements` helper defined |
| IV. Component Modularity | ✅ Pass | New components (`PublishBadge`, section wrappers) are reusable; existing atomic forms preserved |
| V. Progressive Enhancement | ✅ Pass | Each user story is independently testable; no breaking changes to existing functionality |

**Post-Design Gate Result**: PASS — Design artifacts comply with all Constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/002-refactor-course-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── server-actions.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── [locale]/
│   └── dashboard/
│       └── courses/
│           ├── add/
│           │   └── page.jsx           # Refactor: unified creation form
│           └── [courseId]/
│               ├── page.jsx           # Refactor: organized edit sections
│               ├── _components/       # Refactor: consolidate form components
│               │   ├── course-form.jsx        # NEW: unified course form
│               │   ├── course-info-section.jsx # NEW: grouped metadata
│               │   ├── publish-status-badge.jsx # NEW: status indicator
│               │   └── ... (existing components)
│               └── modules/
│                   └── [moduleId]/
│                       ├── page.jsx
│                       └── _components/
│                           ├── video-upload-field.jsx # Enhance: retry logic
│                           └── ... (existing components)
├── actions/
│   ├── course.js        # Enhance: soft-delete, publish validation
│   ├── module.js        # Enhance: cascade awareness
│   └── lesson.js        # Minor enhancements
└── api/
    └── upload/
        └── video/
            └── route.js  # No changes needed

lib/
├── validations.js       # Extend: add deletedAt field validation
└── authorization.js     # No changes needed

model/
├── course-model.js      # Extend: add deletedAt, deletedBy fields
├── module.model.js      # No changes needed
└── lesson.model.js      # No changes needed

components/
└── ui/                  # Potential new shared components
    └── publish-badge.jsx # NEW: reusable publish indicator
```

**Structure Decision**: Next.js App Router structure with feature-based component organization. New components co-located with their feature pages. Shared UI components in `components/ui/`.

## Complexity Tracking

> No Constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | — | — |
