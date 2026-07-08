# File and Project Structure

Folder tree and layout for **AI-ALMS-main** (Next.js 15 monorepo). Runtime code lives at the repo root; there is no separate `frontend/` / `backend/` split.

**See also:** [PROJECT_TREE_AND_FILES.md](./PROJECT_TREE_AND_FILES.md) — per-folder narrative + **875-path file manifest**.

---

## Table of contents

1. [Top-level tree](#1-top-level-tree)
2. [`app/` — routes, UI, API](#2-app--routes-ui-api)
3. [Supporting source folders](#3-supporting-source-folders)
4. [Tests and specs](#4-tests-and-specs)
5. [Config and docs at root](#5-config-and-docs-at-root)
6. [Excluded / generated paths](#6-excluded--generated-paths)
7. [Layering cheat sheet](#7-layering-cheat-sheet)

---

## 1. Top-level tree

```text
AI-ALMS-main/
│
├── app/                      # Next.js App Router (pages, layouts, API, Server Actions)
├── components/               # Shared React UI (shadcn/ui + domain widgets)
├── lib/                      # Domain logic, auth, IRT, AI, validation
├── model/                    # Mongoose schemas (MongoDB)
├── queries/                  # Data-access helpers
├── service/                  # DB connection, queues, Chroma, orchestrators
├── hooks/                    # Shared React hooks
├── i18n/                     # next-intl (en / ar)
├── messages/                 # Translation JSON
├── public/                   # Static assets (images, fonts, SVG)
├── assets/                   # Extra bundled images (not always under public/)
├── uploads/                  # Local runtime media (videos, audio) — dev/deploy data
├── scripts/                  # Node maintenance scripts
├── tests/                    # Jest integration + unit + schemas
├── __tests__/                # Jest (actions, API, lib, e2e)
├── testsprite_tests/         # Python E2E scenarios + reports
├── specs/                    # Feature specs 001–020 (docs only)
├── docs/                     # Engineering diagrams / internal docs
│
├── middleware.js             # Auth, locale, RBAC, security headers
├── auth.js                   # NextAuth (Node) + Credentials provider
├── auth-edge.js              # NextAuth (Edge) for middleware only
├── auth.config.js            # JWT session + cookie settings
├── next.config.mjs
├── tailwind.config.js
├── postcss.config.mjs
├── jest.config.mjs
├── jest.setup.js
├── jsconfig.json             # Path alias @/*
├── components.json           # shadcn/ui config
├── seed.ts                   # DB seed (npm run db:reset)
├── start_chroma.py           # Local Chroma server helper
├── package.json
│
├── README.md
├── API_DESIGN.md
├── ARCHITECTURE.md
├── DATABASE_DESIGN.md
├── VECTOR_DATABASE_DESIGN.md
├── SECURITY_AND_PERMISSIONS.md
├── TECH_STACK.md
├── PROJECT_BRIEF_AND_ROUTE_MAP.md
└── PROJECT_TREE_AND_FILES.md
```

---

## 2. `app/` — routes, UI, API

```text
app/
├── layout.js                 # Root HTML shell
├── globals.css
├── favicon.ico
├── fonts/                    # Local font files (if any)
│
├── [locale]/                 # All user-facing routes: /en/... /ar/...
│   ├── layout.js             # next-intl + locale layout
│   ├── loading.jsx
│   ├── error.jsx
│   ├── not-found.jsx
│   │
│   ├── (main)/               # Public + student storefront
│   │   ├── page.js           # Home
│   │   ├── courses/          # Catalog + [id] detail + lesson player + quizzes
│   │   ├── account/          # Profile (@tabs parallel routes)
│   │   ├── categories/
│   │   ├── checkout/mock/
│   │   ├── enroll-success/
│   │   ├── inst-profile/
│   │   └── layout.js
│   │
│   ├── login/
│   ├── register/             # student / instructor signup
│   │
│   ├── dashboard/            # Instructor (+ admin course tools)
│   │   ├── courses/          # List, add, [courseId] hub
│   │   │   └── [courseId]/
│   │   │       ├── modules/[moduleId]/
│   │   │       ├── enrollments/
│   │   │       ├── reviews/
│   │   │       ├── quizzes/ … [quizId]/ questions/
│   │   │       └── lessons/[lessonId]/
│   │   │           ├── document/
│   │   │           ├── pipeline/
│   │   │           ├── generate-questions/
│   │   │           └── assessments/
│   │   ├── remediation/      # Student weakness UI (auth relaxed in middleware)
│   │   ├── lives/
│   │   └── _components/      # navbar, sidebar, …
│   │
│   ├── admin/                # Platform admin
│   │   ├── users/
│   │   ├── categories/
│   │   ├── courses/
│   │   ├── enrollments/
│   │   ├── reviews/
│   │   ├── analytics/
│   │   ├── quizzes/
│   │   └── payments/
│   │
│   └── setup/admin/          # First-time admin bootstrap
│
├── actions/                  # Server Actions ("use server")
│   ├── account.js
│   ├── admin.js
│   ├── admin-categories.js
│   ├── admin-courses.js
│   ├── admin-setup.js
│   ├── course.js
│   ├── module.js
│   ├── lesson.js
│   ├── enrollment.js
│   ├── review.js
│   ├── quizv2.js
│   ├── quizProgressv2.js
│   ├── adaptive-quiz.js
│   ├── bat-quiz.js
│   ├── adaptive-analytics.js
│   ├── lecture-document.js
│   ├── indexing.js
│   ├── pipeline.js
│   ├── alignment.js
│   ├── semantic-search.js
│   ├── rag-tutor.js
│   ├── mcq-generation.js
│   ├── oral-generation.js
│   ├── oral-assessment.js
│   ├── remediation.js
│   └── index.js
│
└── api/                      # Route handlers (REST-style)
    ├── auth/[...nextauth]/
    ├── register/
    ├── me/
    ├── health/
    ├── upload/               # images; upload/video/; upload/audio-url/
    ├── videos/[filename]/
    ├── profile/avatar/
    ├── lesson-watch/
    ├── certificates/[courseId]/
    ├── payments/status/ | mock/confirm/
    ├── semantic-search/ | status/
    ├── lecture-documents/ … [id]/download/ | by-lesson/[lessonId]/
    ├── pipeline/[lessonId]/status/
    ├── alignments/lesson/[lessonId]/ | job/[jobId]/
    ├── mcq-generation/ | [jobId]/
    ├── oral-generation/ | [jobId]/
    ├── oral-assessment/lesson/[lessonId]/ | [assessmentId]/submit/
    ├── evaluate-oral/
    ├── rag-tutor/query/ | recite-back/
    ├── quizv2/attempts/[attemptId]/
    ├── answers/[answerId]/status/
    └── remediation/aggregate/
```

**Convention:** Route-specific UI lives next to pages in `_components/` (private to that route segment).

---

## 3. Supporting source folders

### `components/`

```text
components/
├── ui/                       # shadcn/Radix primitives (button, dialog, form, toast, …)
├── alignment/                # Transcript alignment UI
├── assessment/               # Oral assessment UI
├── documents/                # Lecture document status
├── pipeline/                 # AI pipeline progress
├── questions/                # Question display / oral playback
├── mcq-generation/           # Generation status widgets
├── navigation/               # Nav helpers
└── *.jsx                     # main-nav, video-player, enroll-course, site-footer, …
```

### `lib/`

```text
lib/
├── ai/                       # transcription, evaluation, ollama, semantic-similarity
├── alignment/                # audio-extractor, transcriber, text-aligner, job-processor
├── embeddings/               # gemini.js, chunker
├── docx/                     # extractor, heading-chunker
├── irt/                      # adaptive testing math (selection, estimation, …)
├── mcq-generation/           # generators, validators
├── oral-generation/
├── rag/                      # tutor-response
├── remediation/              # aggregation, priority, deeplinks
├── db/                       # mongo config, health
├── storage/                  # s3.js
├── schemas/
├── validations/
├── utils/
├── permissions.js            # ROLES + PERMISSIONS
├── authorization.js            # Course/lesson ownership (IDOR)
├── auth-helpers.js
├── routes.js                 # PUBLIC_ROUTES
├── security-headers.js
├── validations.js
└── …                         # errors, rate-limit, certificate-helpers, …
```

### `model/` (Mongoose)

```text
model/
├── user-model.js
├── category-model.js
├── course-model.js
├── module.model.js
├── lesson.model.js
├── enrollment-model.js
├── payment-model.js
├── quizv2-model.js
├── questionv2-model.js
├── attemptv2-model.js
├── lecture-document.model.js
├── video-transcript.model.js
├── pipeline-job.model.js
├── alignment-job.model.js
├── generation-job.model.js
├── indexing-job.model.js
├── oral-generation-job.model.js
├── oral-assessment.model.js
├── student-response.model.js
├── tutor-interaction.model.js
├── recite-back-attempt.model.js
├── concept-gap.model.js
├── weakness-profile.model.js
├── watch-model.js
├── report-model.js
└── …
```

### `queries/`

```text
queries/
├── users.js
├── courses.js
├── modules.js
├── lessons.js
├── enrollments.js
├── quizv2.js
├── categories.js
├── payments.js
├── payments-admin.js
├── admin.js
├── admin-setup.js
├── alignment.js
├── reports.js
└── testimonials.js
```

### `service/`

```text
service/
├── mongo.js                  # Mongoose connection singleton
├── chroma.js                 # ChromaDB client
├── semantic-search.js
├── embedding-queue.js
├── alignment-queue.js
├── pipeline-orchestrator.js
├── mcq-generation-queue.js
├── oral-generation-queue.js
├── remediation-queue.js
├── lecture-document-search.js
└── strartchroma.py           # Chroma helper (typo in filename)
```

### `i18n/` + `messages/`

```text
i18n/
├── routing.js                # locales: en, ar
├── request.js
└── navigation.js             # Localized Link / router

messages/
├── en.json
└── ar.json
```

### `public/` + runtime data

```text
public/
├── assets/images/            # courses, categories, …
├── fonts/
└── *.svg, logo.png, …

uploads/                      # Not in git typically — local videos/audio
└── videos/
```

---

## 4. Tests and specs

```text
tests/
├── integration/              # API + DB + Chroma flows
├── unit/                     # IRT, docx, alignment, generators
├── schemas/
├── models/
├── services/
└── setup.js

__tests__/
├── actions/
├── api/
├── lib/
├── service/
└── e2e/

testsprite_tests/
├── TC001_*.py … TC020_*.py
├── tmp/
└── reports / PRD JSON

specs/
├── 001-improve-quiz-system/
├── 002-refactor-course-management/
├── …
└── 020-ai-remediation-dashboard/
    └── spec.md, plan.md, tasks.md, contracts/, …
```

---

## 5. Config and docs at root

| File / folder | Role |
|---------------|------|
| `package.json` | Dependencies; scripts: `dev`, `build`, `test`, `lint`, `db:reset` |
| `.env` / `.env.example` | Secrets and service URLs (do not commit `.env`) |
| `.eslintrc.json`, `.eslintignore` | ESLint |
| `.gitignore` | Ignores `node_modules`, `.next`, uploads, etc. |
| `.cursor/`, `.specify/`, `.windsurf/` | Editor / Speckit tooling (optional) |

---

## 6. Excluded / generated paths

Not part of source layout documentation (regenerated locally):

| Path | Purpose |
|------|---------|
| `node_modules/` | npm packages |
| `.next/` | Next.js build output |
| `.git/` | Git metadata |
| `chroma.sqlite3` | Local Chroma SQLite (if used) |
| `uploads/` | User-uploaded media |
| `.env` | Local secrets |

---

## 7. Layering cheat sheet

```text
Browser
   ↓
app/[locale]/**/page.jsx + _components/     (UI)
   ↓
app/actions/*.js  OR  app/api/**/route.js    (entry)
   ↓
queries/*.js  +  lib/*.js  +  service/*.js  (logic)
   ↓
model/*.js  →  MongoDB  |  service/chroma.js  →  ChromaDB
```

| Want to change… | Start in… |
|-----------------|-----------|
| Page URL or layout | `app/[locale]/…` |
| HTTP JSON API | `app/api/…/route.js` |
| Form submit / mutation | `app/actions/…` |
| DB schema | `model/` |
| Reusable query | `queries/` |
| Business rule (no UI) | `lib/` |
| Background job / queue | `service/` |
| Button / dialog | `components/ui/` |
| Translation string | `messages/en.json`, `ar.json` |

---

*For every file path in the repo (sorted list), open [PROJECT_TREE_AND_FILES.md](./PROJECT_TREE_AND_FILES.md#complete-file-manifest).*
