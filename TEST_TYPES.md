# Test Types — Definitions and LMS-main Mapping

Classical **test types** (what kind of quality you are checking) vs **test levels** (how much of the system is involved). This document maps each type to **LMS-main**: what we do today, with what tools, and when.

**Related:** [TEST_PLAN.md](./TEST_PLAN.md) (schedule & commands), [TEST_DIAGRAMS.md](./TEST_DIAGRAMS.md) (case & results diagrams), [SECURITY_AND_PERMISSIONS.md](./SECURITY_AND_PERMISSIONS.md), [INTELLIGENT_ALGORITHMS.md](./INTELLIGENT_ALGORITHMS.md).

> **Naming note:** “Unity” in some curricula means **Unit** testing. “Integrity” often means **Integration** testing. Below we use standard English terms.

---

## Quick reference matrix

| Test type | Primary question | Automated in LMS? | Main tools | When |
|-----------|------------------|-------------------|------------|------|
| [**Unit**](#1-unit-testing) | Does this function work? | **Yes** (strong) | Jest | Every commit |
| [**Integration**](#2-integration-testing) | Do modules work together? | **Yes** (partial) | Jest + mocks / Mongo | PR, pre-merge |
| [**System**](#3-system-testing) | Does the whole app meet requirements? | **Partial** (simulated E2E) | Jest, manual browser | Pre-release |
| [**Acceptance**](#4-acceptance-testing) | Does it meet user/business needs? | **Manual** | Checklists, UAT | Sprint end, release |
| [**Performance**](#5-performance-testing) | Is it fast enough under load? | **No** (ad hoc) | Lighthouse, k6 (future) | Before scale events |
| [**Endurance**](#6-endurance--stress-testing) | Does it survive long/heavy use? | **No** | Soak scripts (future) | Optional / staging |
| [**Safety**](#7-safety-testing) | Is it safe for users & data? | **Partial** | Jest auth mocks, manual security | Every release |
| [**Usability**](#8-usability-testing) | Is it easy to use? | **Manual** | User sessions, heuristics | Design iterations |
| [**Accessibility**](#9-accessibility-testing) | Can everyone use it? | **Manual** (minimal auto) | axe, keyboard, screen reader | UI changes |
| [**Compatibility**](#10-compatibility-testing) | Works on browsers/devices? | **Manual** | Cross-browser matrix | Pre-release |

```mermaid
quadrantChart
    title Test types vs automation in LMS-main
    x Low automation --> High automation
    y Low frequency --> High frequency
    Unit: [0.9, 0.95]
    Integration: [0.75, 0.8]
    System: [0.35, 0.5]
    Acceptance: [0.15, 0.4]
    Performance: [0.1, 0.25]
    Endurance: [0.05, 0.15]
    Safety: [0.4, 0.6]
    Usability: [0.1, 0.35]
    Accessibility: [0.15, 0.4]
    Compatibility: [0.2, 0.45]
```

---

## Test types vs test levels

| | **Unit** | **Integration** | **System** | **Acceptance** |
|---|----------|-----------------|------------|----------------|
| **Scope** | One function/module | Several services | Full application | Business scenario |
| **LMS example** | IRT `estimateTheta` | `askTutor` + mocked search | Login → lesson → quiz in browser | “Student completes BAT and sees remediation” |
| **Typical owner** | Developer | Developer | QA + dev | Product / instructor pilot |

Performance, endurance, safety, usability, accessibility, and compatibility are **orthogonal** — you can run them at unit, system, or acceptance level.

---

## 1. Unit testing

**Definition:** Verify a **single unit** of code (function, class, pure module) in isolation, with dependencies stubbed or absent.

**Objective in LMS:** Prove algorithms and rules are correct — IRT math, chunking, alignment scores, Zod schemas, remediation formulas.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Strong** — ~20+ unit files |
| **Tools** | Jest, `jest-environment-jsdom` or `@jest-environment node` |
| **When** | Every save (watch), every PR |
| **Pass criteria** | Deterministic assertions; no network |

**Examples:**

| Area | File |
|------|------|
| IRT 3PL / EAP | `tests/unit/irt/probability.test.js`, `estimation.test.js` |
| Text alignment | `tests/unit/text-aligner.test.js` |
| DOCX / chunks | `tests/unit/docx-extractor.test.js`, `heading-chunker.test.js` |
| MCQ dedup | `tests/unit/duplicate-detector.test.js` |
| Schemas | `tests/schemas/*.test.js` |
| RAG JSON handling | `__tests__/lib/rag-tutor-response.test.js` |

```bash
npm test -- tests/unit/irt/estimation.test.js
```

**Not unit tests:** Full `POST /api/rag-tutor/query` with real Mongo (that is integration/system).

---

## 2. Integration testing

**Definition:** Verify **interfaces between components** — e.g. server action + query layer + mocked DB, or API route + auth + service.

**Objective in LMS:** Catch wiring bugs: wrong parameters, missing `dbConnect`, enrollment checks, pipeline state transitions.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Good** — most `tests/integration/` and `__tests__/actions/` |
| **Tools** | Jest; heavy use of `jest.mock()` for Mongo, Gemini, Chroma |
| **When** | PR; before merge |
| **Pass criteria** | Action/API returns expected shape; mocks called with expected args |

**Two sub-styles in this repo:**

| Style | Needs real Mongo? | Examples |
|-------|-------------------|----------|
| **Mocked integration** | No | `semantic-search.test.js`, `embedding-pipeline.test.js`, `lecture-document-upload.test.js` |
| **DB integration** | Yes | `bat-quiz.test.js`, `adaptive-quiz.test.js`, `mongo-health.test.js` |

```bash
npm test -- --testPathPattern="integration"
```

---

## 3. System testing

**Definition:** Test the **complete, integrated system** against functional requirements — end-to-end paths through UI, API, database, and external services.

**Objective in LMS:** Confirm real user journeys work: enroll → watch lesson → quiz → tutor → remediation.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Limited automation** — one simulated E2E; rest is manual |
| **Tools** | Jest (mocked chain), `npm run dev` + browser, future Playwright |
| **When** | Pre-release, major features |
| **Pass criteria** | Journey completes with correct DB records and UI state |

**Automated (simulated system test):**

- `__tests__/e2e/rag-tutor-flow.test.js` — oral → tutor → recite-back with **all** externals mocked (proves orchestration, not live stack).

**Manual system tests (required today):**

1. Instructor: course → DOCX upload → pipeline complete → alignment publish  
2. Student: enroll → adaptive quiz → submit → view results  
3. Student: RAG tutor with indexed content → timestamp link works  

**Gap:** No Playwright/Cypress driving a real browser against `localhost:3000`.

---

## 4. Acceptance testing

**Definition:** Validate the system against **business requirements and user expectations** — often named **User Acceptance Testing (UAT)**.

**Objective in LMS:** Stakeholders (instructors, students, admins) confirm features match specs in `specs/` and product briefs.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Manual** — spec-driven checklists |
| **Tools** | Written scenarios, pilot cohort, sign-off sheet |
| **When** | End of sprint; before production deploy |
| **Pass criteria** | Signed acceptance per feature spec |

**Example acceptance criteria (from specs culture):**

| Feature | Independent test (from specs) |
|---------|-------------------------------|
| Semantic pipeline | Upload DOCX → chunks in Chroma with correct metadata |
| BAT | Exactly 5 blocks, θ updates per block, concept tags on miss |
| RAG tutor | Answer grounded in lecture when content exists |

**Who runs:** Product owner / instructor pilot / QA — not only `npm test`.

**Link:** Feature specs under `specs/*/` (e.g. `specs/018-block-adaptive-testing/`).

---

## 5. Performance testing

**Definition:** Measure **responsiveness and throughput** under expected load — latency, RPS, resource use.

**Objective in LMS:** Ensure acceptable UX for video pages, quiz submission, embedding pipeline, and concurrent students.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Not automated**; informal targets in some specs |
| **Tools (recommended)** | Lighthouse (frontend), k6 or Artillery (API), Mongo/Chroma monitoring |
| **When** | Before large cohort; after infra changes |
| **Pass criteria** | Agreed SLOs (see below) |

**Suggested SLOs (set per deployment):**

| Area | Example target |
|------|----------------|
| Lesson page LCP | < 2.5s on 4G |
| Quiz submit API | p95 < 500ms (excl. AI) |
| RAG query | p95 < 8s (includes Gemini + Chroma) |
| DOCX pipeline job | Completes within N min for 50-page doc |

**LMS hotspots to profile:**

- `POST /api/rag-tutor/query` — embedding + retrieval + generation  
- Embedding batch (`generateBatchEmbeddings`) — 100-chunk batches  
- BAT block submit — IRT recalculation + DB writes  
- Video streaming `/api/videos/[filename]`  

**Today:** `specs/002-refactor-course-management` mentions drag-and-drop < 1s — not enforced by CI.

---

## 6. Endurance / stress testing

**Definition:**

- **Endurance (soak):** System runs at **moderate load for a long time** — memory leaks, connection pool exhaustion.  
- **Stress:** Load **beyond normal** until failure — find breaking point.

**Objective in LMS:** Pipeline workers, Mongo connections, Chroma index growth, and long quiz sessions remain stable.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Not implemented** |
| **Tools (recommended)** | k6 soak profile; monitor `mongoose.connection`; Chroma disk |
| **When** | Optional quarterly on staging |
| **Pass criteria** | No memory growth, no stuck `IndexingJob`, error rate < threshold |

**Scenarios to design:**

| Scenario | Risk |
|----------|------|
| 24h embedding queue processing | Stuck jobs, OOM |
| 100 concurrent RAG queries | Gemini rate limits, timeouts |
| 1000 BAT attempts in 1 hour | Mongo write pressure |

**Ops helper:** `npm run cleanup-stuck-pipelines` — recovery, not prevention.

---

## 7. Safety testing

**Definition:** Ensure the product does not **harm users** or **expose them to unacceptable risk** — overlaps with **security** and **data protection** in software.

For an LMS, “safety” includes:

- **Security:** authZ, IDOR, injection, secrets  
- **Data privacy:** students only see own attempts; instructors only own courses  
- **Content safety:** AI outputs not leaking other students’ data  
- **Operational safety:** destructive actions require confirmation; soft-delete where needed  

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Partial** — auth mocked in tests; security doc; manual probes |
| **Tools** | Jest (role mocks), manual OWASP-style checks, [SECURITY_AND_PERMISSIONS.md](./SECURITY_AND_PERMISSIONS.md) |
| **When** | Every release; after auth/API changes |
| **Pass criteria** | No privilege escalation; no cross-tenant data access |

**Automated safety-related checks:**

- Unauthorized API → 401/403 (patterns in `rag-tutor` route tests)  
- `hasEnrollmentForCourse` before tutor access  
- Server Actions as authority (no client-only grading)  

**Manual safety checklist:**

| Check | Method |
|-------|--------|
| Student cannot read another student’s `Attempt` | Tamper URL/API IDs |
| Student cannot access instructor dashboard routes | Direct navigation |
| Instructor cannot edit another instructor’s course | API with foreign `courseId` |
| API keys not in client bundle | Inspect built JS |
| AI tutor does not echo other users’ PII | Prompt + log review |

**Note:** Full **penetration testing** is a specialized engagement — outside default Jest scope.

---

## 8. Usability testing

**Definition:** Evaluate **ease of use, learnability, and satisfaction** with real or representative users.

**Objective in LMS:** Instructors can publish courses without training; students complete quizzes and remediation without confusion.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Manual / qualitative** |
| **Tools** | Moderated sessions, task completion time, SUS questionnaire, hotjar (optional) |
| **When** | After major UI refactors (dashboard, lesson player, quiz UI) |
| **Pass criteria** | Task success rate, low error rate, positive subjective rating |

**Suggested task scripts:**

| Persona | Task |
|---------|------|
| Instructor | Create course, upload DOCX, review alignment, publish quiz |
| Student | Enroll, watch video with sync, complete BAT, open remediation link |
| Admin | View stats, manage user role |

**Heuristic review (no users):** Nielsen’s 10 heuristics on dashboard and lesson flows.

**Repo signal:** `specs/002-refactor-course-management` — UX goals for course management (not auto-tested).

---

## 9. Accessibility testing

**Definition:** Verify use by people with **disabilities** — screen readers, keyboard-only, contrast, motion, captions.

**Objective in LMS:** WCAG-aligned access for `en` and `ar` (RTL), including quiz and video lesson UI.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Mostly manual**; no axe in CI |
| **Tools (recommended)** | axe DevTools, Lighthouse accessibility, NVDA/VoiceOver, keyboard-only pass |
| **When** | New UI components; before public launch |
| **Pass criteria** | WCAG 2.1 Level AA targets (project-defined) |

**Checklist for LMS pages:**

| Check | Pages |
|-------|-------|
| Keyboard focus order visible | Quiz, tutor panel, dashboard nav |
| Form labels associated | Login, course forms |
| `aria-*` on dialogs/toasts | shadcn/ui components |
| RTL layout (`ar`) | `next-intl` routes, mirrored nav |
| Video controls keyboard-accessible | `lesson-video.jsx` |
| Color contrast (Tailwind theme) | Light/dark mode |
| Oral recording: alternative text path | If audio fails, show error clearly |

```bash
# Future CI (not in repo)
# npx @axe-core/cli http://localhost:3000/en/login
```

**Automated component testing:** Only `video-text-sync.test.js` uses Testing Library — extend for a11y queries (`getByRole`).

---

## 10. Compatibility testing

**Definition:** Verify behavior across **browsers, OS, devices, locales, and dependencies**.

**Objective in LMS:** Works for typical student devices; Arabic/English; supported Node/Mongo versions.

| Aspect | LMS-main |
|--------|----------|
| **Status** | **Manual matrix** |
| **Tools** | BrowserStack / local VMs; responsive mode in DevTools |
| **When** | Pre-release; after Next/React upgrades |
| **Pass criteria** | Core journeys pass on matrix below |

**Recommended compatibility matrix:**

| Dimension | Targets |
|-----------|---------|
| **Browsers** | Chrome (latest), Firefox (latest), Safari (latest), Edge (latest) |
| **Mobile** | iOS Safari, Android Chrome — lesson + quiz |
| **Desktop OS** | Windows 10+, macOS, Linux (dev) |
| **Locales** | `en`, `ar` (RTL) |
| **Server** | Node **22.x**; MongoDB **7+**; Chroma **3.x** |
| **Media** | Microphone for oral assessment (permissions API) |

**API compatibility:** Mobile/desktop clients hitting same `app/api/*` routes — verify CORS and cookies if native apps added later.

**Dependency compatibility:** Run `npm test` + `npm run build` after `next` or `mongoose` major bumps.

---

## Cross-type: Regression testing

**Definition:** Re-run tests after changes to ensure **nothing broke**.

| Aspect | LMS-main |
|--------|----------|
| **How** | Full `npm test` on PR; targeted `--testPathPattern` during dev |
| **When** | Every change |

Regression is a **strategy**, not a separate test type — it uses unit + integration (+ future E2E).

---

## Cross-type: Smoke testing

**Definition:** Quick **shallow** check that the build is alive.

| Check | Tool |
|-------|------|
| `GET /api/health` | curl / manual |
| Mongo + Chroma health | `tests/integration/health-api.test.js` |
| App starts | `npm run build && npm start` |

**When:** After deploy, before deeper system tests.

---

## How types map to folders and commands

| Type | Primary location | Command hint |
|------|------------------|--------------|
| Unit | `tests/unit/`, `tests/schemas/` | `npm test -- tests/unit` |
| Integration | `tests/integration/`, `__tests__/actions/` | `npm test -- integration` |
| System (simulated) | `__tests__/e2e/` | `npm test -- e2e` |
| Acceptance | Manual + `specs/` | Checklist in [TEST_PLAN.md](./TEST_PLAN.md) §7 |
| Performance / Endurance | — | Staging + k6 (future) |
| Safety | Security doc + manual | See §7 above |
| Usability / A11y / Compatibility | Manual | Matrices in §8–10 |

---

## Recommended ownership

| Type | Primary owner | Secondary |
|------|---------------|-----------|
| Unit / Integration | Developer | — |
| System | Developer + QA | DevOps (env) |
| Acceptance | Product / instructor pilot | Developer |
| Performance / Endurance | DevOps / lead dev | Developer |
| Safety / Security | Lead dev | External audit (optional) |
| Usability | UX / product | Developer |
| Accessibility | UX + frontend dev | QA |
| Compatibility | QA | Developer |

---

## Maturity summary for LMS-main

| Type | Maturity | Next step |
|------|----------|-----------|
| Unit | ●●●●○ | Keep TDD for new `lib/` code |
| Integration | ●●●○○ | More API route tests; CI Mongo service |
| System | ●●○○○ | Add Playwright for 5 critical paths |
| Acceptance | ●●○○○ | UAT checklist per `specs/` feature |
| Performance | ●○○○○ | Lighthouse CI + k6 on RAG/quiz |
| Endurance | ○○○○○ | Soak test staging pipeline |
| Safety | ●●●○○ | IDOR test suite; dependabot |
| Usability | ●●○○○ | Scheduled user sessions |
| Accessibility | ●○○○○ | axe in CI; RTL audit |
| Compatibility | ●●○○○ | Documented browser matrix runs |

---

*Scheduling and tools: [TEST_PLAN.md](./TEST_PLAN.md). Security detail: [SECURITY_AND_PERMISSIONS.md](./SECURITY_AND_PERMISSIONS.md).*
