<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Modified principles: 
  - N/A
Added sections:
  - Core Principles (VI. Code Quality & Maintainability)
  - Core Principles (VII. Rigorous Testing Standards)
  - Core Principles (VIII. User Experience (UX) Consistency)
  - Core Principles (IX. Performance Requirements)
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md  ✅ Constitution Check section updated to reflect nine principles
  - .specify/templates/spec-template.md  ✅ User story + acceptance scenario structure aligns with Principle V
  - .specify/templates/tasks-template.md ✅ Tasks template updated to make tests mandatory per Principle VII
Follow-up TODOs: None.
-->

# LMS Constitution

## Core Principles

### I. Role-Based Security First

Every route, API route, and Server Action MUST enforce role-based access control before
executing any business logic. The three roles — **Admin**, **Instructor**, and **Student** —
carry distinct, non-overlapping permissions that MUST be verified server-side on every request.
Client-side permission checks are supplementary only and MUST NOT be treated as a security gate.
Unauthenticated or unauthorised requests MUST be rejected with an appropriate HTTP status (401/403)
before any data is read or written.

**Rationale**: The system handles sensitive learner data, payment records, and certificates.
A single bypassed authorisation check can expose or corrupt data for the entire user base.

### II. Server-Side Authority

Business logic MUST live in Server Actions (`app/actions/`) or API Routes (`app/api/`).
React Client Components are responsible for presentation and user interaction only —
they MUST NOT contain validation rules, access-control decisions, or direct database calls.
All data mutations MUST pass through server-side Zod schema validation before reaching
the database layer.

**Rationale**: Co-locating authority on the server prevents logic duplication, reduces
attack surface, and keeps the client bundle lean.

### III. Schema-Validated Data

Every piece of user-supplied input MUST be validated with a Zod schema before it is
persisted or acted upon. Mongoose models provide structural enforcement at the database
layer; Zod enforces semantic validity at the application boundary. The two layers are
complementary — neither replaces the other. NEVER bypass validation for expedience.

**Rationale**: Unvalidated data is the root cause of most data-integrity bugs and
security vulnerabilities in CRUD-heavy applications.

### IV. Component Modularity

UI components MUST be reusable and composable. Shared primitives belong in
`components/ui/` (shadcn/ui base layer). Feature-specific components belong in their
feature folder (e.g., `app/[locale]/(main)/courses/`). No component MUST assume a
specific page context — props define the contract. Cross-feature component reuse is
preferred over duplication.

**Rationale**: A coherent component hierarchy reduces maintenance overhead and makes
design-system updates propagate consistently.

### V. Progressive Enhancement & MVP Delivery

Features MUST be designed as independently deliverable increments. The core learner
journey — **Enroll → Learn → Complete → Certify** — takes priority over administrative
or analytical features. Every feature increment MUST be testable and demonstrable in
isolation before the next increment begins. Complexity MUST be justified; introduce
abstraction only when a simpler approach has been explicitly ruled out.

**Rationale**: Incremental delivery reduces integration risk and ensures a working
product exists at every checkpoint.

### VI. Code Quality & Maintainability

All code MUST adhere to strict formatting and linting rules. Complex logic MUST be documented with comments explaining the "why", not the "what". Functions and components MUST remain focused on a single responsibility. Code reviews MUST enforce these standards strictly.

**Rationale**: High code quality reduces technical debt, accelerates onboarding, and minimizes the risk of regressions during refactoring.

### VII. Rigorous Testing Standards

Every new feature or bug fix MUST be accompanied by appropriate automated tests (unit, contract, or end-to-end). Critical paths—such as authentication, data mutations, and payment processing—MUST have comprehensive test coverage. Tests MUST be written and fail before implementation begins.

**Rationale**: Automated tests are the safety net that allows for rapid iteration, refactoring, and deployment with confidence.

### VIII. User Experience (UX) Consistency

The application MUST provide a consistent, responsive, and accessible user experience across all devices. All UI components MUST adhere strictly to the established design system (shadcn/ui + Tailwind) and meet WCAG 2.1 AA accessibility guidelines. Custom styling SHOULD be minimized in favour of reusable design tokens.

**Rationale**: A consistent and accessible UX builds trust, reduces user friction, and ensures the platform is usable by everyone regardless of their abilities.

### IX. Performance Requirements

The application MUST be optimized for performance. Client-side bundles MUST be kept minimal by leveraging React Server Components. API responses MUST be paginated or streamed where appropriate, and database queries MUST be optimized and properly indexed to prevent bottlenecks. Core web vitals MUST meet passing thresholds.

**Rationale**: Fast load times and responsive interactions are critical for learner retention and ensuring the system scales efficiently under load.

## Technology Stack & Constraints

- **Runtime**: Node.js via Next.js 15 (App Router). Pages and API routes use the
  `app/` directory convention.
- **Language**: JavaScript (JSX/JS). TypeScript adoption is encouraged but not mandated
  for existing files; new utility modules SHOULD use JSDoc types or `.ts` where practical.
- **Database**: MongoDB accessed via Mongoose 8. Schema changes MUST be backward-compatible
  or accompanied by a migration script.
- **Authentication**: NextAuth v5 (`auth.js`). Session strategy MUST remain server-side;
  JWT payloads MUST NOT include sensitive role-escalation data that bypasses server checks.
- **Validation**: Zod 3 for runtime schema validation; React Hook Form for client-side
  form state. Both layers MUST be present for any user-facing form.
- **Styling**: Tailwind CSS + shadcn/ui. Custom CSS is permitted only when Tailwind
  utilities are insufficient. Design tokens MUST use the Tailwind config — no hardcoded
  hex colours in component files.
- **Payments**: MockPay (internal virtual payment system). Real payment gateway integration
  is an intentional future extension point; the payment abstraction MUST NOT be tightly
  coupled to MockPay internals.
- **Email**: Resend (`resend` package). Email sending is non-critical-path; failures
  MUST be handled gracefully without blocking the primary user action.
- **PDF**: `pdf-lib` for certificate generation. Certificate rendering MUST be
  server-side only.
- **Internationalisation**: `next-intl`. All user-visible strings MUST use the `t()`
  translation function; hard-coded English strings in JSX are a constitution violation.

## Development Workflow & Quality Gates

1. **Constitution Check** — Before any implementation begins, verify the planned feature
   complies with all nine Core Principles. Document violations and their justification in
   the plan's Complexity Tracking table.
2. **Spec Before Code** — A feature specification (`spec.md`) and implementation plan
   (`plan.md`) MUST exist before any source file is created or modified.
3. **Server-First Review** — Code review MUST confirm that no business logic has leaked
   into Client Components and that all mutations are validated server-side.
4. **Schema Review** — Any Mongoose model addition or change MUST include the
   corresponding Zod schema update and a migration strategy if existing documents are
   affected.
5. **Accessibility Baseline** — Interactive UI components MUST meet WCAG 2.1 AA contrast
   and keyboard-navigation requirements. shadcn/ui primitives satisfy this baseline;
   custom components MUST be verified.
6. **Test Coverage** — All critical paths MUST have automated tests written and passing before the feature is merged.
7. **Environment Hygiene** — Secrets MUST live in `.env` (never committed). All
   environment variables required by a feature MUST be documented in the README under
   "Quick Start".

## Governance

This constitution supersedes all other project conventions and style guides. When a
conflict exists between this document and any other guideline, the constitution prevails.

**Amendment procedure**:
1. Identify the change, classify the version bump (MAJOR / MINOR / PATCH), and draft
   updated principle text.
2. Update `.specify/memory/constitution.md` with the new version and today's date as
   `Last Amended`.
3. Run `/speckit.constitution` to propagate the change through dependent templates and
   produce a new Sync Impact Report.
4. Commit with message: `docs: amend constitution to vX.Y.Z (<summary of change>)`.

**Compliance review**: All pull requests MUST include a one-line Constitution Check
confirming no principles are violated (or documenting justified exceptions).

**Versioning policy**: MAJOR — principle removal or redefinition that breaks prior
assumptions; MINOR — new principle or material section added; PATCH — wording
clarification or typo fix.

**Version**: 1.1.0 | **Ratified**: 2026-03-05 | **Last Amended**: 2026-03-06
