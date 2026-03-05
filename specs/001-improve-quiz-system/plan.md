# Implementation Plan: Quiz System Improvements

**Branch**: `001-improve-quiz-system` | **Date**: 2026-03-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-improve-quiz-system/spec.md`

## Summary

Improve the quiz system with reliable timer synchronization, graceful auto-submit on expiration, localStorage-backed answer persistence, comprehensive results display with answer review, question navigation, and integration with course completion for certificate eligibility. All improvements must comply with WCAG 2.1 AA accessibility standards.

## Technical Context

**Language/Version**: JavaScript (JSX/JS) via Next.js 15 (App Router)  
**Primary Dependencies**: React 18, NextAuth v5, Mongoose 8, Zod 3, shadcn/ui, next-intl  
**Storage**: MongoDB (existing Quiz, Question, Attempt models)  
**Testing**: Manual testing with acceptance scenarios (unit tests recommended for timer logic)  
**Target Platform**: Web browsers (modern Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (Learning Management System)  
**Performance Goals**: Quiz results page < 2s load time, timer deviation < 2s from server  
**Constraints**: Graceful reconnection only (no service workers), WCAG 2.1 AA compliance  
**Scale/Scope**: Existing LMS user base, quizzes with 1-50 questions typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ PASS | Existing server actions (`quizv2.js`) enforce RBAC via `getLoggedInUser()`, `assertInstructorOwnsCourse()`. New features will follow same pattern. |
| II. Server-Side Authority | ✅ PASS | All quiz logic (grading, attempt management) in Server Actions. Timer expiration check is server-authoritative via `expiresAt` field. Client timer is display-only. |
| III. Schema-Validated Data | ✅ PASS | Existing `quizSchema`, `questionSchema` enforce validation. New answer sync will use existing validation patterns. |
| IV. Component Modularity | ✅ PASS | Quiz components in feature folder (`app/[locale]/(main)/courses/[id]/quizzes/`). New components (navigator, results) follow same structure. |
| V. Progressive Enhancement & MVP | ✅ PASS | Feature broken into 4 independent user stories (P1→P3). Each story is testable in isolation. Timer (P1) ships first. |
| Accessibility Baseline | ✅ PASS | NFR-001 to NFR-005 mandate WCAG 2.1 AA. All new components will use shadcn/ui primitives with ARIA labels. |
| Internationalisation | ✅ PASS | Existing quiz interface uses `useTranslations("Quiz")`. New strings will be added to `messages/en.json`. |

**Gate Result**: ✅ All principles satisfied. Proceed to Phase 0.

### Post-Design Re-Check (Phase 1 Complete)

| Principle | Status | Verification |
|-----------|--------|--------------|
| I. Role-Based Security First | ✅ PASS | New actions (`getQuizResultWithReview`, `checkCertificateEligibility`) follow RBAC pattern |
| II. Server-Side Authority | ✅ PASS | `showAnswersPolicy` enforced server-side; timer expiration validated server-side |
| III. Schema-Validated Data | ✅ PASS | No new schemas needed; existing validation covers all data |
| IV. Component Modularity | ✅ PASS | New components (timer, navigator, results) are reusable and prop-driven |
| V. Progressive Enhancement | ✅ PASS | 4 user stories can be implemented and tested independently |
| Accessibility | ✅ PASS | ARIA live regions for timer, keyboard nav for navigator documented |
| i18n | ✅ PASS | New translation keys documented in quickstart.md |

**Post-Design Gate**: ✅ PASS - Ready for task breakdown

## Project Structure

### Documentation (this feature)

```text
specs/001-improve-quiz-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── actions/
│   ├── quizv2.js                    # Existing: CRUD, attempt management, grading
│   └── quizProgressv2.js            # Existing: Course completion integration
├── api/
│   └── quizv2/
│       └── attempts/
│           └── [attemptId]/
│               └── route.js         # Existing: GET attempt details
├── [locale]/
│   └── (main)/
│       └── courses/
│           └── [id]/
│               └── quizzes/
│                   ├── page.jsx                           # Existing: Quiz list
│                   └── [quizId]/
│                       ├── page.jsx                       # Existing: Quiz taking page
│                       ├── result/
│                       │   └── page.jsx                   # Existing: Results page (needs enhancement)
│                       └── _components/
│                           ├── quiz-taking-interface.jsx  # Existing: Main quiz UI (needs enhancement)
│                           ├── quiz-timer.jsx             # NEW: Isolated timer component
│                           ├── question-navigator.jsx     # NEW: Question nav panel
│                           ├── quiz-summary.jsx           # NEW: Pre-submit summary
│                           └── results-review.jsx         # NEW: Answer review component
├── components/
│   └── ui/                          # Existing shadcn/ui components
├── lib/
│   └── quiz-storage.js              # NEW: localStorage helper for answer backup
└── model/
    ├── quizv2-model.js              # Existing Quiz schema
    ├── questionv2-model.js          # Existing Question schema
    └── attemptv2-model.js           # Existing Attempt schema
```

**Structure Decision**: Single Next.js application with feature-based organization. No new top-level directories needed. New components are co-located with existing quiz feature code.

## Complexity Tracking

> No Constitution violations identified. All features can be implemented within existing patterns.

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| localStorage for offline backup | Simpler than IndexedDB; sufficient for answer backup without full offline-first | IndexedDB rejected (overkill for backup-only use case) |
| Client-side timer with server sync | Server `expiresAt` is authoritative; client timer is UX only | Full server-polling rejected (unnecessary latency) |
| Isolated timer component | Enables independent testing and ARIA live region management | Inline timer rejected (tangled state, accessibility issues) |

