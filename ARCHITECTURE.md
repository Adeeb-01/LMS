# LMS Architecture Documentation

> **Last Updated:** May 2026
>
> This document provides a comprehensive explanation of the architectural style, design patterns, component structure, data flow, security model, and technology decisions used in the LMS platform.

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Architectural Style](#2-architectural-style)
   - 2.1 [Layered Architecture](#21-layered-architecture)
   - 2.2 [Modular Monolith](#22-modular-monolith)
   - 2.3 [Microservice-Ready AI Services](#23-microservice-ready-ai-services)
3. [Block Diagram](#3-block-diagram)
4. [Technology Stack](#4-technology-stack)
5. [Directory Structure](#5-directory-structure)
6. [Presentation Layer](#6-presentation-layer)
   - 6.1 [Route Architecture](#61-route-architecture)
   - 6.2 [Page Routes](#62-page-routes)
   - 6.3 [Component Library](#63-component-library)
7. [Application Layer](#7-application-layer)
   - 7.1 [Server Actions](#71-server-actions)
   - 7.2 [API Routes](#72-api-routes)
   - 7.3 [Action Wrapper Pattern](#73-action-wrapper-pattern)
8. [Data Access Layer](#8-data-access-layer)
9. [Domain Logic Layer](#9-domain-logic-layer)
   - 9.1 [IRT Adaptive Testing Engine](#91-irt-adaptive-testing-engine)
   - 9.2 [RAG Tutor System](#92-rag-tutor-system)
   - 9.3 [Content Alignment](#93-content-alignment)
   - 9.4 [MCQ and Oral Generation](#94-mcq-and-oral-generation)
   - 9.5 [Remediation Engine](#95-remediation-engine)
   - 9.6 [AI Evaluation](#96-ai-evaluation)
10. [Service / Infrastructure Layer](#10-service--infrastructure-layer)
    - 10.1 [Database Connections](#101-database-connections)
    - 10.2 [Pipeline Orchestrator](#102-pipeline-orchestrator)
    - 10.3 [Job Queue System](#103-job-queue-system)
11. [Data Model Layer](#11-data-model-layer)
12. [Authentication and Authorization](#12-authentication-and-authorization)
    - 12.1 [NextAuth v5 Configuration](#121-nextauth-v5-configuration)
    - 12.2 [Edge/Node Auth Split](#122-edgenode-auth-split)
    - 12.3 [Multi-Layer RBAC](#123-multi-layer-rbac)
    - 12.4 [Session Security](#124-session-security)
13. [Internationalization (i18n)](#13-internationalization-i18n)
14. [Security Architecture](#14-security-architecture)
    - 14.1 [Security Headers](#141-security-headers)
    - 14.2 [Rate Limiting](#142-rate-limiting)
    - 14.3 [Error Sanitization](#143-error-sanitization)
    - 14.4 [Input Validation](#144-input-validation)
15. [Error Handling System](#15-error-handling-system)
16. [External Service Integrations](#16-external-service-integrations)
17. [Testing Architecture](#17-testing-architecture)
18. [Data Flow Diagrams](#18-data-flow-diagrams)
    - 18.1 [Request Lifecycle](#181-request-lifecycle)
    - 18.2 [Content Pipeline Flow](#182-content-pipeline-flow)
    - 18.3 [Adaptive Quiz Flow](#183-adaptive-quiz-flow)
    - 18.4 [RAG Tutor Flow](#184-rag-tutor-flow)
19. [Design Decisions and Trade-offs](#19-design-decisions-and-trade-offs)

---

## 1. Architectural Overview

The LMS is a **full-stack learning management platform** with advanced AI capabilities including adaptive testing, RAG-based tutoring, oral assessment, automated question generation, and student remediation. The system is built as a single deployable Next.js 15 application that combines the frontend, backend API, background job processing, and AI service orchestration.

**Key characteristics:**

- Single deployable unit (modular monolith)
- Layered internal organization with strict dependency direction
- AI features designed with microservice-like boundaries
- Multi-language support (English, Arabic with RTL)
- Adaptive testing using Item Response Theory (3PL model)
- RAG-powered AI tutoring with grounded responses
- Multi-stage content processing pipeline

---

## 2. Architectural Style

The system uses a **hybrid architectural style** combining three complementary patterns:

### 2.1 Layered Architecture

The primary structural pattern. Code is organized into **horizontal layers** with a strict top-down dependency rule — each layer only depends on layers below it.

```
┌──────────────────────────────────────────────┐
│          Presentation Layer                   │
│   (React pages, components, client islands)   │
├──────────────────────────────────────────────┤
│          Application Layer                    │
│   (Server Actions + API Route handlers)       │
├──────────────────────────────────────────────┤
│          Data Access Layer                    │
│   (Query modules — Mongoose/Chroma queries)   │
├──────────────────────────────────────────────┤
│          Domain Logic Layer                   │
│   (IRT math, RAG, validation, AI logic)       │
├──────────────────────────────────────────────┤
│          Service / Infrastructure Layer       │
│   (DB connections, queues, orchestrator)       │
├──────────────────────────────────────────────┤
│          Data Model Layer                     │
│   (28 Mongoose schemas)                       │
└──────────────────────────────────────────────┘
```

| Layer | Directory | Responsibility | Depends On |
|-------|-----------|----------------|------------|
| Presentation | `app/[locale]/...`, `components/` | UI rendering, user interaction | Application |
| Application | `app/actions/`, `app/api/` | Use case orchestration, auth enforcement | Data Access, Domain Logic |
| Data Access | `queries/` | Database query abstraction | Domain Logic, Service |
| Domain Logic | `lib/` | Pure business rules, algorithms, validation | Service (for config only) |
| Service | `service/` | External connections, queues, orchestration | Data Model |
| Data Model | `model/` | Schema definitions | None |

### 2.2 Modular Monolith

The **deployment model** is a modular monolith — all code ships as a single Next.js application, but is internally organized into cohesive, loosely-coupled feature modules:

```
Feature Modules (lib/)
├── lib/irt/          → Adaptive testing engine (7 files)
├── lib/rag/          → RAG tutor response system
├── lib/alignment/    → Text-video alignment
├── lib/embeddings/   → Vector embedding generation
├── lib/mcq-generation/→ MCQ auto-generation
├── lib/oral-generation/→ Oral question generation
├── lib/remediation/  → Student weakness analysis
├── lib/ai/           → AI evaluation, transcription, similarity
├── lib/docx/         → Document extraction
├── lib/storage/      → S3 file storage
├── lib/schemas/      → Zod validation schemas
└── lib/db/           → Database configuration
```

Each module:
- Has its own dedicated queue in `service/` (where applicable)
- Has its own job model in `model/`
- Has its own server action in `app/actions/`
- Has its own API route(s) in `app/api/`
- Could theoretically be extracted into an independent service

### 2.3 Microservice-Ready AI Services

The AI features are designed with **service-like boundaries** — isolated queues, dedicated job models, async polling APIs, and clear input/output contracts. They run in-process but are architecturally ready for extraction:

| AI Service | Entry Point | Queue | Job Model | External Dep |
|------------|-------------|-------|-----------|--------------|
| Content Pipeline | `service/pipeline-orchestrator.js` | Multi-stage | `pipeline-job.model.js` | Gemini |
| Semantic Indexing | `service/semantic-search.js` | `service/embedding-queue.js` | `indexing-job.model.js` | ChromaDB + Gemini |
| Text-Video Alignment | `lib/alignment/*` | `service/alignment-queue.js` | `alignment-job.model.js` | FFmpeg |
| MCQ Generation | `lib/mcq-generation/*` | `service/mcq-generation-queue.js` | `generation-job.model.js` | Gemini |
| Oral Question Gen | `lib/oral-generation/*` | `service/oral-generation-queue.js` | `oral-generation-job.model.js` | Gemini |
| RAG Tutor | `lib/rag/tutor-response.js` | Synchronous (request-scoped) | `tutor-interaction.model.js` | ChromaDB + Gemini/Ollama |
| Oral Evaluation | `lib/ai/evaluation.js` | Synchronous | `oral-assessment.model.js` | Gemini |
| IRT Engine | `lib/irt/*` | Synchronous (pure math) | `attemptv2-model.js` | None |
| Remediation | `lib/remediation/*` | `service/remediation-queue.js` | `weakness-profile.model.js` | ChromaDB + Gemini |

---

## 3. Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT (Browser)                                  │
│                           React 18 + shadcn/ui + Tailwind CSS                       │
│                       ┌──────────┐  ┌──────────┐  ┌───────────┐                     │
│                       │  Student  │  │Instructor│  │   Admin   │                     │
│                       │   Views   │  │  Views   │  │   Views   │                     │
│                       └─────┬─────┘  └─────┬────┘  └─────┬─────┘                    │
└─────────────────────────────┼──────────────┼─────────────┼──────────────────────────┘
                              │              │             │
                              ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS 15 APP ROUTER (Monolith)                            │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐   │
│  │                      MIDDLEWARE (Edge Runtime)                                │   │
│  │  next-intl (en/ar) │ Auth JWT │ RBAC Route Guards │ Security Headers │ CSP    │   │
│  └───────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐   │
│  │                     PRESENTATION LAYER                                        │   │
│  │                                                                               │   │
│  │  app/[locale]/(main)/        app/[locale]/dashboard/     app/[locale]/admin/   │   │
│  │  ┌──────────────────┐        ┌───────────────────┐       ┌────────────────┐   │   │
│  │  │ Course Catalog   │        │ Course CRUD       │       │ User Mgmt      │   │   │
│  │  │ Lesson Player    │        │ Lesson Builder    │       │ Analytics      │   │   │
│  │  │ Quiz Taking      │        │ Quiz Builder      │       │ Enrollments    │   │   │
│  │  │ RAG Tutor Chat   │        │ Pipeline Dashboard│       │ Categories     │   │   │
│  │  │ Oral Assessment  │        │ Question Gen      │       │ Payments       │   │   │
│  │  │ Remediation      │        │ Alignment Viewer  │       │ Reviews        │   │   │
│  │  └──────────────────┘        └───────────────────┘       └────────────────┘   │   │
│  └───────────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                              │
│                       ┌───────────────┼───────────────┐                              │
│                       ▼                               ▼                              │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐                │
│  │ SERVER ACTIONS (26 modules)   │  │   API ROUTES (34 handlers)    │                │
│  │                               │  │                               │                │
│  │ course.js    enrollment.js    │  │ /api/auth/[...nextauth]       │                │
│  │ lesson.js    rag-tutor.js     │  │ /api/rag-tutor/query          │                │
│  │ quizv2.js    pipeline.js      │  │ /api/mcq-generation           │                │
│  │ adaptive-quiz.js              │  │ /api/oral-assessment/*        │                │
│  │ bat-quiz.js   alignment.js    │  │ /api/semantic-search          │                │
│  │ oral-assessment.js            │  │ /api/pipeline/[id]/status     │                │
│  │ remediation.js  admin.js      │  │ /api/upload/*    /api/me      │                │
│  └──────────────┬────────────────┘  └──────────────┬────────────────┘                │
│                 │                                  │                                 │
│                 └──────────────┬────────────────────┘                                │
│                                ▼                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐   │
│  │                    DATA ACCESS LAYER (queries/ — 14 modules)                  │   │
│  │                                                                               │   │
│  │  courses.js │ lessons.js │ modules.js │ quizv2.js │ users.js │ enrollments.js │   │
│  │  categories.js │ payments.js │ payments-admin.js │ testimonials.js            │   │
│  │  alignment.js │ reports.js │ admin.js │ admin-setup.js                        │   │
│  └──────────────────────────────────┬────────────────────────────────────────────┘   │
│                                     │                                                │
│                 ┌───────────────────┼───────────────────┐                            │
│                 ▼                   ▼                   ▼                            │
│  ┌───────────────────────────────────────────────────────────────────────────────┐   │
│  │                    DOMAIN LOGIC LAYER (lib/ — 70+ files)                      │   │
│  │                                                                               │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐            │   │
│  │  │  lib/irt/   │ │  lib/rag/   │ │lib/alignment│ │lib/embeddings│            │   │
│  │  │ probability │ │tutor-respnse│ │ transcriber │ │  gemini.js   │            │   │
│  │  │ estimation  │ │             │ │audio-extract│ │              │            │   │
│  │  │ information │ │             │ │  config.js  │ │              │            │   │
│  │  │ selection   │ │             │ │             │ │              │            │   │
│  │  │block-select │ │             │ │             │ │              │            │   │
│  │  │difficulty-b │ │             │ │             │ │              │            │   │
│  │  │ability-disp │ │             │ │             │ │              │            │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘            │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐            │   │
│  │  │lib/mcq-gen/ │ │lib/oral-gen/│ │lib/remedtn/ │ │   lib/ai/    │            │   │
│  │  │  generator  │ │  generator  │ │  scoring    │ │ evaluation   │            │   │
│  │  │  validation │ │  validation │ │ concept-gaps│ │ transcription│            │   │
│  │  │  duplicate  │ │             │ │             │ │ similarity   │            │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘            │   │
│  │                                                                               │   │
│  │  lib/schemas/ │ lib/validations.js │ lib/security-headers.js                  │   │
│  │  lib/permissions.js │ lib/errors.js │ lib/action-wrapper.js                   │   │
│  └───────────────────────────────────────────────────────────────────────────────┘   │
│                                     │                                                │
│                                     ▼                                                │
│  ┌───────────────────────────────────────────────────────────────────────────────┐   │
│  │               SERVICE / INFRASTRUCTURE LAYER (service/)                       │   │
│  │                                                                               │   │
│  │  ┌────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │           PIPELINE ORCHESTRATOR (pipeline-orchestrator.js)             │    │   │
│  │  │                                                                        │    │   │
│  │  │  ┌──────────┐    ┌─────────────────────────┐    ┌──────────────────┐   │    │   │
│  │  │  │ Extract  │───▶│  Align    │    Index    │───▶│ Generate MCQ     │   │    │   │
│  │  │  │  (DOCX)  │    │  (FFmpeg) │   (Chroma)  │    │ + Oral Questions │   │    │   │
│  │  │  └──────────┘    └─────────────────────────┘    └──────────────────┘   │    │   │
│  │  │                       (parallel)                                        │    │   │
│  │  └────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                               │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                     │   │
│  │  │alignment-queue │ │embedding-queue │ │mcq-gen-queue   │                     │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘                     │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐             │   │
│  │  │oral-gen-queue  │ │remediation-que │ │lecture-document-search │             │   │
│  │  └────────────────┘ └────────────────┘ └────────────────────────┘             │   │
│  │                                                                               │   │
│  │  mongo.js (singleton)  │  chroma.js (optional)  │  semantic-search.js         │   │
│  └───────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐   │
│  │                    DATA MODEL LAYER (model/ — 28 schemas)                     │   │
│  │                                                                               │   │
│  │  user-model │ course-model │ module.model │ lesson.model │ category-model     │   │
│  │  enrollment-model │ payment-model │ quizv2-model │ questionv2-model           │   │
│  │  attemptv2-model │ student-response.model │ watch-model │ testimonial-model   │   │
│  │  assessment-model │ report-model │ lecture-document.model                     │   │
│  │  video-transcript.model │ alignment-job.model │ pipeline-job.model            │   │
│  │  indexing-job.model │ generation-job.model │ oral-generation-job.model        │   │
│  │  oral-assessment.model │ recite-back-attempt.model │ tutor-interaction.model  │   │
│  │  weakness-profile.model │ concept-gap.model │ remediation-session.model       │   │
│  └───────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└──────────────────┬──────────────────────────────────┬───────────────────────────────┘
                   │                                  │
                   ▼                                  ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│           MongoDB                │  │           ChromaDB                │
│     (Primary Data Store)         │  │      (Vector Embeddings)          │
│                                  │  │         [optional]                │
│  Users, Courses, Quizzes,        │  │                                  │
│  Attempts, Jobs, Enrollments,    │  │  Lesson chunks + Gemini          │
│  Assessments, Payments ...       │  │  embeddings for semantic          │
│                                  │  │  search & RAG retrieval           │
└──────────────────────────────────┘  └──────────────────────────────────┘

                          EXTERNAL SERVICES
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Google Gemini│  │   AWS S3     │  │    Ollama    │              │
│  │  (Cloud AI)  │  │  (Storage)   │  │  (Local AI)  │              │
│  │              │  │              │  │  [optional]  │              │
│  │ Embeddings   │  │ Audio files  │  │ Gemma model  │              │
│  │ Generation   │  │ Media        │  │ Transcriptn  │              │
│  │ Evaluation   │  │ Presigned    │  │ RAG fallback │              │
│  │ RAG answers  │  │  uploads     │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   FFmpeg     │  │   Resend     │  │  Cloudinary  │              │
│  │(Transcriptn) │  │   (Email)    │  │   (Images)   │              │
│  │              │  │  [optional]  │  │    [CDN]     │              │
│  │ Audio        │  │ Transactional│  │ Course       │              │
│  │  extraction  │  │  email       │  │  thumbnails  │              │
│  │ Alignment    │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | ^15.0.5 | App Router, RSC, server actions, API routes |
| React | 18.3.1 | UI rendering with server/client components |
| Node.js | 22.x | Server runtime |

### Authentication & Authorization

| Technology | Version | Purpose |
|------------|---------|---------|
| NextAuth (Auth.js) | ^5.0.0-beta.25 | JWT sessions, Credentials provider |
| bcryptjs | ^2.4.3 | Password hashing |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| MongoDB (Mongoose) | ^8.8.2 | Primary OLTP data store |
| ChromaDB | ^3.3.2 | Vector embeddings for semantic search |

### AI & Machine Learning

| Technology | Version | Purpose |
|------------|---------|---------|
| Google Generative AI (Gemini) | ^0.24.1 | LLM for generation, evaluation, embeddings |
| mathjs | ^15.1.1 | IRT mathematical computations |
| string-similarity | ^4.0.4 | Text similarity scoring |

### UI Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | ^3.4.1 | Utility-first styling |
| Radix UI | Various | Accessible headless components |
| shadcn/ui | — | Pre-built component library on Radix |
| Lucide React | ^0.460.0 | Icon library |
| class-variance-authority | ^0.7.0 | Component variant management |

### Forms & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| React Hook Form | ^7.53.2 | Form state management |
| Zod | ^3.23.8 | Schema validation |
| @hookform/resolvers | ^3.9.1 | Zod-RHF integration |

### Internationalization

| Technology | Version | Purpose |
|------------|---------|---------|
| next-intl | ^4.8.3 | Locale routing, message bundles, RTL |

### Media & Documents

| Technology | Version | Purpose |
|------------|---------|---------|
| fluent-ffmpeg / ffmpeg-static | ^2.1.3 / ^5.3.0 | Audio extraction, transcription |
| mammoth | ^1.11.0 | DOCX to structured text |
| react-player | ^2.16.0 | Video player component |
| pdf-lib | ^1.17.1 | Certificate PDF generation |

### Storage & Communication

| Technology | Version | Purpose |
|------------|---------|---------|
| AWS S3 SDK | ^3.1004.0 | File storage with presigned URLs |
| Resend | ^4.0.1 | Transactional email |

### Data Tables & DnD

| Technology | Version | Purpose |
|------------|---------|---------|
| @tanstack/react-table | ^8.20.5 | Data grid rendering |
| @hello-pangea/dnd | ^17.0.0 | Drag-and-drop for reordering |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Jest | ^30.2.0 | Unit and integration testing |
| @testing-library/react | ^16.3.2 | Component testing |
| @testing-library/jest-dom | ^6.9.1 | DOM assertion matchers |

---

## 5. Directory Structure

```
LMS-main/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Locale-prefixed routes (en, ar)
│   │   ├── (main)/               # Public student-facing pages
│   │   │   ├── courses/          # Course catalog, lesson player, quizzes
│   │   │   ├── account/          # Student account management
│   │   │   ├── categories/       # Category browsing
│   │   │   └── ...
│   │   ├── dashboard/            # Instructor/admin dashboard
│   │   │   ├── courses/          # Course, lesson, quiz management
│   │   │   ├── remediation/      # Student remediation (student-accessible)
│   │   │   └── lives/            # Live session management
│   │   ├── admin/                # Admin-only pages
│   │   │   ├── users/            # User management
│   │   │   ├── analytics/        # Platform analytics
│   │   │   └── ...
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration (student/instructor)
│   │   └── setup/                # Initial admin bootstrap
│   ├── actions/                  # Server actions (26 modules)
│   └── api/                      # API route handlers (34 routes)
│
├── components/                   # Shared React components
│   ├── ui/                       # shadcn/Radix primitives
│   ├── alignment/                # Alignment visualization
│   ├── assessment/               # Assessment UI widgets
│   ├── documents/                # Document management UI
│   ├── mcq-generation/           # MCQ generation UI
│   ├── pipeline/                 # Pipeline status UI
│   └── questions/                # Question display/editing
│
├── lib/                          # Domain logic (pure functions)
│   ├── ai/                       # AI evaluation, transcription, similarity
│   ├── alignment/                # Text-video alignment logic
│   ├── db/                       # Database config and validation
│   ├── docx/                     # DOCX extraction
│   ├── embeddings/               # Gemini embedding generation
│   ├── irt/                      # IRT adaptive testing engine (8 files)
│   ├── mcq-generation/           # MCQ generation logic
│   ├── oral-generation/          # Oral question generation
│   ├── rag/                      # RAG tutor response generation
│   ├── remediation/              # Weakness analysis and remediation
│   ├── schemas/                  # Zod validation schemas
│   ├── storage/                  # S3 storage utilities
│   ├── permissions.js            # RBAC permission definitions
│   ├── errors.js                 # Standardized error system
│   ├── action-wrapper.js         # Server action error wrapper
│   ├── security-headers.js       # OWASP security headers
│   ├── rate-limit.js             # Rate limiting
│   ├── routes.js                 # Public route definitions
│   ├── validations.js            # Shared validation rules
│   └── ...
│
├── model/                        # Mongoose schemas (28 files)
├── queries/                      # Data access modules (14 files)
├── service/                      # Infrastructure services (10 files)
├── hooks/                        # React custom hooks
├── i18n/                         # Internationalization config
├── messages/                     # Translation bundles (en.json, ar.json)
├── public/                       # Static assets
├── scripts/                      # Operational scripts
├── specs/                        # Feature specification documents
├── tests/                        # Integration and unit tests
├── __tests__/                    # Additional test suites
│
├── auth.js                       # NextAuth full config (Node runtime)
├── auth-edge.js                  # NextAuth edge config (middleware)
├── auth.config.js                # Shared session/cookie config
├── middleware.js                  # Edge middleware (auth + i18n + security)
├── next.config.mjs               # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── jest.config.mjs               # Jest test configuration
└── package.json                  # Dependencies and scripts
```

---

## 6. Presentation Layer

### 6.1 Route Architecture

All user-facing routes are nested under `app/[locale]/` where `locale` is `en` or `ar`. Next.js App Router handles file-system based routing with **React Server Components** as the default and **Client Components** opted-in via `"use client"` directive.

The route groups organize pages by access level:

- `(main)/` — Public marketplace and student learning experience
- `dashboard/` — Instructor and admin tools (students only for `/remediation`)
- `admin/` — Admin-only operations

### 6.2 Page Routes

**Public Routes (no authentication required):**

| Route | Purpose |
|-------|---------|
| `/{locale}/` | Homepage |
| `/{locale}/courses` | Course catalog |
| `/{locale}/courses/[id]` | Course details |
| `/{locale}/categories/[id]` | Category browsing |
| `/{locale}/login` | User login |
| `/{locale}/register/[role]` | Student/instructor registration |
| `/{locale}/setup/admin` | First admin bootstrap |

**Authenticated Student Routes:**

| Route | Purpose |
|-------|---------|
| `/{locale}/account` | Student profile |
| `/{locale}/account/enrolled-courses` | Enrolled courses list |
| `/{locale}/courses/[id]/lesson` | Lesson player with RAG tutor |
| `/{locale}/courses/[id]/quizzes/[quizId]` | Quiz taking |
| `/{locale}/courses/[id]/quizzes/[quizId]/results` | Quiz results |
| `/{locale}/dashboard/remediation` | Student weakness dashboard |

**Instructor/Admin Dashboard Routes:**

| Route | Purpose |
|-------|---------|
| `/{locale}/dashboard` | Dashboard home |
| `/{locale}/dashboard/courses/[courseId]` | Course management |
| `/{locale}/dashboard/courses/[courseId]/modules` | Module management |
| `/{locale}/dashboard/courses/.../lessons/[lessonId]` | Lesson management |
| `/{locale}/dashboard/courses/.../lessons/[lessonId]/document` | DOCX upload |
| `/{locale}/dashboard/courses/.../lessons/[lessonId]/alignment` | Text-video alignment |
| `/{locale}/dashboard/courses/.../lessons/[lessonId]/pipeline` | AI pipeline management |
| `/{locale}/dashboard/courses/.../lessons/[lessonId]/generate-questions` | Question generation |
| `/{locale}/dashboard/courses/.../quizzes/[quizId]` | Quiz configuration |

**Admin-Only Routes:**

| Route | Purpose |
|-------|---------|
| `/{locale}/admin` | Admin dashboard |
| `/{locale}/admin/users` | User management |
| `/{locale}/admin/courses` | All courses management |
| `/{locale}/admin/categories` | Category CRUD |
| `/{locale}/admin/enrollments` | Enrollment management |
| `/{locale}/admin/analytics` | Platform analytics |
| `/{locale}/admin/payments` | Payment management |
| `/{locale}/admin/reviews` | Review moderation |

### 6.3 Component Library

Components in `components/` are organized as:

- **`components/ui/`** — shadcn/Radix primitive components (Button, Dialog, Select, Toast, Tabs, etc.)
- **`components/alignment/`** — Alignment visualization and badge components
- **`components/assessment/`** — Oral assessment and quiz-taking widgets
- **`components/documents/`** — Document upload and management UI
- **`components/mcq-generation/`** — Question generation status and controls
- **`components/pipeline/`** — Pipeline progress and status display
- **`components/questions/`** — Question display, editing, and review

---

## 7. Application Layer

### 7.1 Server Actions

The 26 server action modules in `app/actions/` serve as the primary API for form submissions and mutations from React Server Components. Each module maps to a feature domain:

| Module | Domain |
|--------|--------|
| `course.js` | Course CRUD |
| `lesson.js` | Lesson CRUD |
| `module.js` | Module CRUD |
| `quizv2.js` | Quiz CRUD |
| `adaptive-quiz.js` | Adaptive quiz session management |
| `bat-quiz.js` | Block Adaptive Testing |
| `enrollment.js` | Enrollment management |
| `pipeline.js` | Content pipeline triggering |
| `alignment.js` | Text-video alignment |
| `indexing.js` | Semantic indexing |
| `mcq-generation.js` | MCQ generation triggering |
| `oral-generation.js` | Oral question generation |
| `oral-assessment.js` | Oral assessment submission |
| `rag-tutor.js` | RAG tutor interaction |
| `semantic-search.js` | Semantic search |
| `remediation.js` | Remediation data |
| `lecture-document.js` | Document management |
| `adaptive-analytics.js` | Adaptive testing analytics |
| `account.js` | User account management |
| `review.js` | Testimonial/review management |
| `admin.js` | Admin operations |
| `admin-courses.js` | Admin course operations |
| `admin-categories.js` | Admin category operations |
| `admin-setup.js` | Initial admin bootstrap |
| `quizProgressv2.js` | Quiz progress tracking |
| `index.js` | Action exports |

### 7.2 API Routes

The 34 API route handlers serve REST-style endpoints for client-side fetching, webhooks, and external integrations. They are grouped by domain:

**Authentication & Profile:**
- `POST /api/auth/[...nextauth]` — NextAuth handlers
- `POST /api/register` — User registration
- `GET /api/me` — Current user profile
- `POST /api/profile/avatar` — Avatar upload

**Content & Media:**
- `POST /api/upload` — General file upload
- `POST /api/upload/video` — Video upload
- `POST /api/upload/audio-url` — Audio URL upload
- `GET /api/videos/[filename]` — Video streaming
- `POST /api/lesson-watch` — Watch progress tracking

**Lecture Documents:**
- `GET/POST /api/lecture-documents` — List/create documents
- `GET /api/lecture-documents/by-lesson/[lessonId]` — Documents by lesson
- `GET/PUT/DELETE /api/lecture-documents/[id]` — Single document
- `GET /api/lecture-documents/[id]/download` — Document download

**AI Pipeline:**
- `GET /api/pipeline/[lessonId]/status` — Pipeline status polling
- `GET /api/alignments/lesson/[lessonId]` — Alignment data
- `GET /api/alignments/job/[jobId]` — Alignment job status

**Semantic Search:**
- `POST /api/semantic-search` — Search course content
- `GET /api/semantic-search/status` — ChromaDB availability

**Question Generation:**
- `POST /api/mcq-generation` — Trigger MCQ generation
- `GET /api/mcq-generation/[jobId]` — Generation job status
- `POST /api/oral-generation` — Trigger oral generation
- `GET /api/oral-generation/[jobId]` — Oral generation job status

**Quizzes:**
- `GET/PUT /api/quizv2/attempts/[attemptId]` — Quiz attempt management
- `GET /api/answers/[answerId]/status` — Answer evaluation status

**Oral Assessment:**
- `GET /api/oral-assessment/lesson/[lessonId]` — Oral questions for lesson
- `POST /api/oral-assessment/[assessmentId]/submit` — Submit oral response
- `POST /api/evaluate-oral` — Evaluate oral response

**RAG Tutor:**
- `POST /api/rag-tutor/query` — Ask a question
- `POST /api/rag-tutor/recite-back` — Recite-back assessment

**Remediation:**
- `GET /api/remediation/aggregate` — Aggregated weakness data

**Payments & Certificates:**
- `POST /api/payments/mock/confirm` — Mock payment confirmation
- `GET /api/payments/status` — Payment status
- `GET /api/certificates/[courseId]` — Certificate generation

**Health:**
- `GET /api/health` — System health check

### 7.3 Action Wrapper Pattern

All server actions use a standardized error handling wrapper (`lib/action-wrapper.js`) that provides:

- Consistent `{ ok, message, errorCode, fieldErrors, data }` response shape
- Automatic Zod validation error extraction
- Error code classification via `lib/errors.js`
- Sensitive data sanitization in error messages
- Automatic path revalidation via `revalidatePath()`
- Action logging via `lib/logger.js`

```javascript
// Usage pattern:
export const updateUser = withActionErrorHandling(
  async (userId, data) => {
    // action logic — any thrown error is caught and standardized
    return { user: updatedUser };
  },
  { revalidatePaths: ['/account'], actionName: 'updateUser' }
);
```

---

## 8. Data Access Layer

The `queries/` directory contains 14 data access modules that isolate all database operations from the application layer. This separation ensures:

- Business logic in `lib/` never touches the database directly
- Database queries can be optimized independently
- Switching data sources affects only one layer

| Module | Responsibility |
|--------|----------------|
| `courses.js` | Course lookup, search, filtering |
| `lessons.js` | Lesson CRUD queries |
| `modules.js` | Module ordering and management |
| `quizv2.js` | Quiz and question queries |
| `users.js` | User lookup and profile queries |
| `enrollments.js` | Enrollment verification and listing |
| `categories.js` | Category tree queries |
| `payments.js` | Payment record queries |
| `payments-admin.js` | Admin payment reports |
| `testimonials.js` | Review and rating queries |
| `alignment.js` | Alignment data retrieval |
| `reports.js` | Analytics and report queries |
| `admin.js` | Admin dashboard queries |
| `admin-setup.js` | First-time setup checks |

---

## 9. Domain Logic Layer

The `lib/` directory contains 70+ files of **pure domain logic** — algorithms, business rules, and AI prompts that are independent of the web framework and database.

### 9.1 IRT Adaptive Testing Engine

Location: `lib/irt/` (8 files)

Implements the **3-Parameter Logistic (3PL) Item Response Theory** model for adaptive quiz delivery:

| File | Purpose |
|------|---------|
| `probability.js` | 3PL probability function: P(θ) = c + (1-c) / (1 + e^(-a(θ-b))) |
| `information.js` | Fisher Information: I(θ) = a² × (P*(θ))² × Q(θ) / P(θ) |
| `estimation.js` | Expected A Posteriori (EAP) ability estimation with 41-point quadrature |
| `selection.js` | Maximum Fisher Information (MFI) item selection with content balancing |
| `block-selection.js` | Block Adaptive Testing (BAT) — staged difficulty blocks |
| `difficulty-bands.js` | Difficulty classification bands |
| `ability-display.js` | Human-readable ability level formatting |
| `index.js` | Module exports |

**How it works:**

1. Student starts an adaptive quiz; initial ability θ₀ = 0
2. `selection.js` picks the item with maximum Fisher Information at current θ
3. Student responds; `estimation.js` updates θ using EAP estimation
4. Process repeats until stopping criterion (SE threshold or item count)
5. Content balancing weights ensure coverage across modules

### 9.2 RAG Tutor System

Location: `lib/rag/tutor-response.js`

Provides AI-powered tutoring grounded in lecture content:

1. Student asks a question during a lesson
2. Question is embedded via Gemini (`lib/embeddings/gemini.js`)
3. ChromaDB returns relevant lecture chunks (`service/chroma.js`)
4. Chunks + question are sent to LLM with a system prompt
5. Response includes: answer text, grounding flag, and suggested video timestamps

**AI Provider switching:** When `AI_PROVIDER=local`, the system uses Ollama with Gemma instead of Gemini, enabling fully offline operation.

**Model fallback chain:** The system tries multiple Gemini models in sequence (`gemini-2.5-flash-lite` → `gemini-2.5-flash` → `gemini-2.5-pro`) with automatic fallback on 503/429 errors.

### 9.3 Content Alignment

Location: `lib/alignment/`

Aligns lecture document text with video timestamps:

- `audio-extractor.js` — Extracts audio track from video using FFmpeg
- `transcriber.js` — Transcribes audio to text with timestamps
- `config.js` — Alignment configuration parameters

### 9.4 MCQ and Oral Generation

Locations: `lib/mcq-generation/`, `lib/oral-generation/`

Automatically generates quiz questions from lecture content:

- Uses Gemini to generate questions based on extracted text
- Validates generated questions for quality and correctness
- Checks for duplicates against existing question bank
- Assigns IRT parameters (discrimination, difficulty, guessing)

### 9.5 Remediation Engine

Location: `lib/remediation/`

Analyzes student performance to identify weaknesses:

- Profiles concept gaps from quiz responses
- Scores weakness severity
- Maps gaps to specific lecture segments with timestamps
- Provides targeted review recommendations

### 9.6 AI Evaluation

Location: `lib/ai/`

| File | Purpose |
|------|---------|
| `evaluation.js` | Semantic evaluation of oral responses against reference answers |
| `transcription.js` | Audio-to-text transcription for voice input |
| `semantic-similarity.js` | Text similarity scoring |
| `concept-coverage.js` | Coverage analysis of student responses |
| `ollama.js` | Local Ollama/Gemma integration |

---

## 10. Service / Infrastructure Layer

### 10.1 Database Connections

**MongoDB** (`service/mongo.js`):
- Cached singleton connection using `global.mongoose`
- Configurable pool size, selection timeout, and socket timeout via `lib/db/config.js`
- Health check endpoint with ping latency measurement
- Sanitized error logging (no connection strings in logs)

**ChromaDB** (`service/chroma.js`):
- Optional vector database — system degrades gracefully if unavailable
- Cached client and collection instances
- `isAvailable()` function for feature-flag style checks
- Health check via heartbeat
- Custom embedding function bypass (embeddings generated via Gemini externally)

### 10.2 Pipeline Orchestrator

`service/pipeline-orchestrator.js` — The central coordinator for content processing:

```
                    ┌──────────────┐
                    │   Extract    │
                    │  (Mammoth)   │
                    └──────┬───────┘
                           │
                     ┌─────┴─────┐
                     ▼           ▼
              ┌──────────┐ ┌──────────┐
              │  Align   │ │  Index   │    ← Parallel execution
              │ (FFmpeg) │ │ (Chroma) │
              └──────────┘ └────┬─────┘
                                │
                          ┌─────┴─────┐
                          ▼           ▼
                   ┌──────────┐ ┌──────────┐
                   │   MCQ    │ │   Oral   │    ← Parallel execution
                   │   Gen    │ │   Gen    │
                   └──────────┘ └──────────┘
```

Key features:
- **Concurrency control:** Maximum 5 simultaneous pipelines
- **Stale job cleanup:** Auto-cancels pipelines stuck for >10 minutes
- **Parallel stages:** Alignment and indexing run concurrently after extraction
- **Partial success:** Pipeline completes even if alignment or one generation type fails
- **Stage tracking:** Each stage has `status`, `startedAt`, `completedAt`, `errorMessage`

### 10.3 Job Queue System

Each AI feature has a dedicated in-process queue:

| Queue | File | Purpose |
|-------|------|---------|
| Alignment | `service/alignment-queue.js` | Text-video alignment jobs |
| Embedding | `service/embedding-queue.js` | ChromaDB indexing jobs |
| MCQ Generation | `service/mcq-generation-queue.js` | MCQ generation jobs |
| Oral Generation | `service/oral-generation-queue.js` | Oral question generation jobs |
| Remediation | `service/remediation-queue.js` | Weakness analysis jobs |

All queues provide:
- Concurrency limiting
- Job state persistence via MongoDB
- Polling-based status endpoints
- Error capture and reporting

---

## 11. Data Model Layer

28 Mongoose schemas organized by domain:

### Core Platform Models

| Model | File | Key Fields |
|-------|------|------------|
| User | `user-model.js` | email, password (bcrypt), role, status, profile |
| Course | `course-model.js` | title, description, instructor, category, price, status |
| Module | `module.model.js` | title, course (ref), order, lessonIds |
| Lesson | `lesson.model.js` | title, module, video, content, order |
| Category | `category-model.js` | title, slug, parent (tree structure) |
| Enrollment | `enrollment-model.js` | student, course, status, progress |
| Payment | `payment-model.js` | user, course, amount, status, method |
| Watch | `watch-model.js` | user, lesson, watchedSeconds, completed |

### Quiz & Assessment Models

| Model | File | Key Fields |
|-------|------|------------|
| Quiz (v2) | `quizv2-model.js` | lesson, type (fixed/adaptive/bat), config |
| Question (v2) | `questionv2-model.js` | quiz, text, options, irt params (a, b, c) |
| Attempt (v2) | `attemptv2-model.js` | quiz, student, theta, responses, status |
| Student Response | `student-response.model.js` | attempt, question, answer, correct, theta |
| Assessment | `assessment-model.js` | student, course, type, score |

### AI Pipeline Job Models

| Model | File | Key Fields |
|-------|------|------------|
| Pipeline Job | `pipeline-job.model.js` | lesson, status, stages (extraction/alignment/indexing/generation) |
| Alignment Job | `alignment-job.model.js` | lesson, document, status, result |
| Indexing Job | `indexing-job.model.js` | document, pipeline, status, chunksIndexed |
| Generation Job | `generation-job.model.js` | lesson, quiz, document, status, questionsGenerated |
| Oral Gen Job | `oral-generation-job.model.js` | lesson, quiz, status, questionsGenerated |

### Content Models

| Model | File | Key Fields |
|-------|------|------------|
| Lecture Document | `lecture-document.model.js` | lesson, content, status, headings |
| Video Transcript | `video-transcript.model.js` | lesson, segments (text + timestamps) |

### AI Interaction Models

| Model | File | Key Fields |
|-------|------|------------|
| Tutor Interaction | `tutor-interaction.model.js` | student, lesson, question, response, isGrounded |
| Oral Assessment | `oral-assessment.model.js` | student, lesson, question, audioUrl, score |
| Recite-Back Attempt | `recite-back-attempt.model.js` | student, lesson, chunk, response, score |

### Remediation Models

| Model | File | Key Fields |
|-------|------|------------|
| Weakness Profile | `weakness-profile.model.js` | student, course, weaknesses, lastUpdated |
| Concept Gap | `concept-gap.model.js` | student, concept, severity, relatedLessons |
| Remediation Session | `remediation-session.model.js` | student, gaps, recommendations, status |

### Other Models

| Model | File | Key Fields |
|-------|------|------------|
| Testimonial | `testimonial-model.js` | user, course, rating, text, approved |
| Report | `report-model.js` | type, data, generatedAt |

---

## 12. Authentication and Authorization

### 12.1 NextAuth v5 Configuration

The system uses **NextAuth v5** with a **Credentials provider** for email/password authentication.

**`auth.js`** — Full Node.js runtime configuration:
- Credentials provider with email/password
- bcrypt password verification
- Rate limiting: 5 attempts per 15 minutes per email
- Timing-attack prevention via dummy bcrypt comparisons
- Active status verification before login
- `lastLogin` timestamp update

### 12.2 Edge/Node Auth Split

A dual-configuration pattern separates Edge-safe and Node-only auth logic:

```
┌─────────────────────────┐     ┌─────────────────────────────┐
│    auth.config.js       │     │         auth.js              │
│   (Edge-compatible)     │     │      (Node runtime)          │
│                         │     │                              │
│  • JWT session config   │◄────│  • Spreads authConfig        │
│  • Cookie settings      │     │  • Credentials provider      │
│  • Callback functions   │     │  • bcrypt + Mongoose          │
│  • No DB imports        │     │  • Rate limiting              │
└────────────┬────────────┘     └──────────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│    auth-edge.js         │
│   (Middleware only)     │
│                         │
│  • Exports auth()       │
│  • JWT verification     │
│  • No DB, no providers  │
└─────────────────────────┘
```

This prevents Mongoose and bcrypt from being bundled into the Edge middleware, which runs in a restricted V8 isolate.

### 12.3 Multi-Layer RBAC

Authorization is enforced at three levels:

**Layer 1 — Edge Middleware** (`middleware.js`):
- Redirects unauthenticated users from protected routes
- Blocks inactive/suspended accounts
- Enforces role-based route access:
  - `/admin/*` → admin role only
  - `/dashboard/*` → instructor or admin (except `/dashboard/remediation` for students)
- Redirects authenticated users away from login/register

**Layer 2 — Permission System** (`lib/permissions.js`):
- Defines three roles: `admin`, `instructor`, `student`
- Maps 25+ fine-grained permissions to roles
- Helper functions: `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
- Used in server actions and API routes for fine-grained checks

**Permission categories:**
- User management (view, create, edit, delete, change role, activate)
- Course management (view all, edit all, delete all, publish all)
- Own course management (view own, edit own, delete own, publish own)
- Category management (view, create, edit, delete)
- Enrollment management (view all, delete)
- Review management (view all, approve, delete)
- Analytics and admin tools

**Layer 3 — Enrollment Guards** (in API routes and queries):
- `hasEnrollmentForCourse()` — Verifies student is enrolled before serving content
- `verifyInstructorOwnsCourse()` — Verifies instructor ownership
- Applied at the data access level for content APIs (RAG, semantic search, etc.)

### 12.4 Session Security

OWASP-aligned session configuration in `auth.config.js`:

| Setting | Value | Purpose |
|---------|-------|---------|
| Strategy | JWT | Stateless sessions, no server-side session store |
| Max Age | 7 days (configurable) | Session lifetime bound |
| Update Age | 24 hours | Rolling session refresh |
| Cookie HttpOnly | `true` | Prevents XSS access to session |
| Cookie Secure | `true` (production) | HTTPS-only transmission |
| Cookie SameSite | `lax` | CSRF mitigation |
| Cookie Prefix | `__Secure-` (production) | Browser-enforced security |
| CSRF Token | `__Host-` prefix (production) | Strictest cookie security |
| Callback URL TTL | 10 minutes | Short-lived redirect tokens |

---

## 13. Internationalization (i18n)

The platform supports **English** and **Arabic** (with RTL) using `next-intl`:

| File | Purpose |
|------|---------|
| `i18n/routing.js` | Defines locales (`en`, `ar`), default locale, `localePrefix: 'always'` |
| `i18n/request.js` | Loads locale-specific message bundles, sets text direction |
| `i18n/navigation.js` | Localized `Link`, `redirect`, `usePathname`, `useRouter` |
| `messages/en.json` | English translations |
| `messages/ar.json` | Arabic translations |
| `app/[locale]/layout.js` | `NextIntlClientProvider`, locale-based font loading |

**Font strategy:**
- English → Poppins (Google Fonts)
- Arabic → Cairo (Google Fonts, Arabic support)

**URL pattern:** All routes are prefixed with locale: `/{locale}/path` (e.g., `/en/courses`, `/ar/courses`).

---

## 14. Security Architecture

### 14.1 Security Headers

Two-layer security header application:

**Global headers** (`next.config.mjs` — all responses):
- `X-Frame-Options: DENY` — Prevents clickjacking
- `X-Content-Type-Options: nosniff` — Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — Limits referrer leakage
- `Permissions-Policy: camera=(), microphone=(self), geolocation=(), interest-cohort=()` — Disables unnecessary APIs
- `X-DNS-Prefetch-Control: off` — Prevents DNS prefetch information leakage

**Page-level headers** (`lib/security-headers.js` — via middleware):
- All of the above plus:
- `Content-Security-Policy` with directives:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
  - `style-src 'self' 'unsafe-inline' https:`
  - `img-src 'self' data: blob: https:`
  - `frame-ancestors 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`

**Image security** (Next.js image config):
- Allowlisted remote patterns only (`i.pravatar.cc`, `res.cloudinary.com`)
- SVG handling with `contentDispositionType: 'attachment'` and sandbox CSP
- Minimum cache TTL of 60 seconds

### 14.2 Rate Limiting

`lib/rate-limit.js` provides in-memory rate limiting:
- Login endpoint: 5 attempts per 15 minutes per email
- Silent failure (returns `null`, doesn't reveal rate limit to prevent enumeration)

### 14.3 Error Sanitization

`lib/errors.js` ensures no sensitive data reaches the client:
- Strips stack traces
- Redacts `password`, `token`, `secret`, `key` from messages
- Masks MongoDB connection strings
- In production: replaces internal errors with generic messages
- Classifies errors into standardized error codes

### 14.4 Input Validation

- **Zod schemas** (`lib/schemas/`) — Declarative validation for all inputs
- **Server action body limit:** 2MB (`next.config.mjs`)
- **Mongoose validation:** Schema-level constraints
- **Runtime checks:** `lib/validations.js` for shared rules

---

## 15. Error Handling System

A centralized, standardized error system in `lib/errors.js`:

**Error codes** (22 defined):

| Category | Codes |
|----------|-------|
| Auth | `AUTH_REQUIRED`, `FORBIDDEN`, `UNAUTHORIZED` |
| Validation | `VALIDATION_ERROR`, `INVALID_INPUT` |
| Resources | `NOT_FOUND`, `ALREADY_EXISTS`, `CONFLICT` |
| Rate Limit | `RATE_LIMITED` |
| Server | `INTERNAL_ERROR`, `DATABASE_ERROR`, `EXTERNAL_SERVICE_ERROR` |
| Business | `INSUFFICIENT_PERMISSIONS`, `OPERATION_FAILED` |
| Database | `MONGODB_CONNECTION_ERROR`, `MONGODB_TIMEOUT_ERROR`, `CHROMA_CONNECTION_ERROR`, `CHROMA_UNAVAILABLE`, `CONFIG_VALIDATION_ERROR` |

**Response shapes:**

Server Actions return:
```json
{
  "ok": true|false,
  "message": "string",
  "errorCode": "ERROR_CODE",
  "fieldErrors": { "field": "error message" },
  "data": {}
}
```

API Routes return:
```json
{
  "message": "string",
  "errorCode": "ERROR_CODE",
  "details": {}  // development only
}
```

---

## 16. External Service Integrations

| Service | Usage | Required? | Fallback |
|---------|-------|-----------|----------|
| **MongoDB** | Primary data store for all models | Yes | None — application cannot start |
| **ChromaDB** | Vector storage for semantic search and RAG | No | Graceful degradation — search returns empty, RAG uses general knowledge |
| **Google Gemini** | Embeddings, LLM generation, evaluation | Yes (for AI features) | Ollama/Gemma for local operation |
| **Ollama** | Local AI alternative (Gemma model) | No | Uses Gemini cloud instead |
| **AWS S3** | File storage for audio, media, documents | Yes (for media features) | None |
| **Resend** | Transactional email delivery | No | Email features disabled |
| **Cloudinary** | Remote image hosting (CDN) | No | Local image serving |
| **FFmpeg** | Audio extraction from video for alignment | Yes (for alignment) | Alignment feature unavailable |

---

## 17. Testing Architecture

| Tool | Configuration | Purpose |
|------|---------------|---------|
| Jest 30 | `jest.config.mjs` | Unit and integration test runner |
| React Testing Library | `@testing-library/react` | Component testing |
| jest-dom | `@testing-library/jest-dom` | DOM assertion matchers |

**Test locations:**
- `tests/` — Service and integration tests
- `__tests__/` — Unit tests for lib modules
- `testsprite_tests/` — External Python test scenarios

**Commands:**
```bash
npm test          # Run all tests
npm run test:watch # Watch mode
```

---

## 18. Data Flow Diagrams

### 18.1 Request Lifecycle

```
Browser Request
      │
      ▼
┌──────────────────┐
│  Edge Middleware  │ ─── Locale detection
│                  │ ─── JWT verification (auth-edge.js)
│                  │ ─── Route protection (RBAC)
│                  │ ─── Security headers (CSP, X-Frame, etc.)
│                  │ ─── next-intl locale routing
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ App Router       │ ─── File-system routing
│ (RSC / Client)   │ ─── Server Component rendering
│                  │ ─── Client Component hydration
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Server │ │  API   │
│ Action │ │ Route  │ ─── Auth checks
│        │ │        │ ─── Permission checks
└───┬────┘ └───┬────┘ ─── Enrollment guards
    │          │
    └────┬─────┘
         ▼
┌──────────────────┐
│  queries/        │ ─── Mongoose queries
│  (Data Access)   │ ─── ChromaDB queries
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│MongoDB │ │ChromaDB│
└────────┘ └────────┘
```

### 18.2 Content Pipeline Flow

```
Instructor uploads DOCX
         │
         ▼
┌─────────────────────┐
│ pipeline.js (action) │ ─── Creates PipelineJob
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ PipelineOrchestrator │
│                     │
│ Stage 1: EXTRACT    │ ─── mammoth extracts text from DOCX
│         │           │     Creates LectureDocument
│         ▼           │
│ Stage 2: PARALLEL   │
│  ┌──────┴──────┐    │
│  ▼             ▼    │
│ ALIGN        INDEX  │ ─── FFmpeg transcribes video audio
│ (FFmpeg)   (Chroma) │     Gemini generates embeddings
│              │      │     ChromaDB stores vectors
│              ▼      │
│ Stage 3: GENERATE   │
│  ┌──────┴──────┐    │
│  ▼             ▼    │
│ MCQ Gen    Oral Gen │ ─── Gemini generates questions
│              │      │     Validates and deduplicates
│              ▼      │
│          COMPLETED  │ ─── Notification sent
└─────────────────────┘
```

### 18.3 Adaptive Quiz Flow

```
Student starts quiz
         │
         ▼
┌─────────────────────────┐
│ Initialize attempt       │
│ θ₀ = 0, SE₀ = 1.0       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ selectNextQuestion()     │ ◄──────────────────────┐
│ (Maximum Fisher Info)    │                         │
│                         │                         │
│ For each candidate:     │                         │
│  I(θ) = a²(P*²)Q / P   │                         │
│  Apply content weights  │                         │
│  Pick max I(θ) item     │                         │
└────────┬────────────────┘                         │
         │                                          │
         ▼                                          │
┌─────────────────────────┐                         │
│ Present question         │                         │
│ Student responds         │                         │
└────────┬────────────────┘                         │
         │                                          │
         ▼                                          │
┌─────────────────────────┐                         │
│ estimateAbilityEAP()     │                         │
│                         │                         │
│ 41-point quadrature     │                         │
│ Log-space computation   │                         │
│ Standard normal prior   │                         │
│ → new θ, new SE         │                         │
└────────┬────────────────┘                         │
         │                                          │
         ▼                                          │
┌─────────────────────────┐    No                   │
│ Stopping criterion?     │ ──────────────────────►│
│ SE < threshold OR       │
│ max items reached       │
└────────┬────────────────┘
         │ Yes
         ▼
┌─────────────────────────┐
│ Finalize attempt         │
│ Record final θ and SE    │
│ Generate results         │
└─────────────────────────┘
```

### 18.4 RAG Tutor Flow

```
Student asks question
         │
         ▼
┌─────────────────────────┐
│ Enrollment verification  │ ─── queries/enrollments.js
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Generate query embedding │ ─── lib/embeddings/gemini.js
│ (Gemini embedding model) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Semantic search          │ ─── service/chroma.js
│ Query ChromaDB           │     Course-scoped vector search
│ Return top-k chunks      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Generate grounded answer │ ─── lib/rag/tutor-response.js
│                         │
│ if AI_PROVIDER=local:   │
│   → Ollama (Gemma)      │
│ else:                   │
│   → Gemini (with model  │
│     fallback chain)     │
│                         │
│ Output:                 │
│  • response text        │
│  • isGrounded flag      │
│  • timestamp links      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Save TutorInteraction    │ ─── model/tutor-interaction.model.js
│ Return to student        │
└─────────────────────────┘
```

---

## 19. Design Decisions and Trade-offs

### Why Modular Monolith over Microservices?

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Deployment | Single unit | Simplifies ops — no service mesh, no inter-service auth, single CI/CD |
| Development | Shared codebase | Faster iteration, refactoring across features, shared types |
| Latency | In-process calls | No network overhead between AI services |
| Scaling | Vertical first | Next.js handles concurrent requests; scale horizontally via replicas |
| Future extraction | Pre-built boundaries | Each AI module has its own queue, job model, and API — ready to extract |

### Why In-Process Queues over Message Brokers?

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Complexity | In-process queues | No RabbitMQ/Redis/Kafka to deploy and monitor |
| Durability | MongoDB-backed jobs | Job state persists across restarts via PipelineJob documents |
| Concurrency | Configurable limits | `MAX_CONCURRENT_PIPELINES = 5` prevents resource exhaustion |
| Trade-off | No distribution | All processing happens on the same server — acceptable at current scale |

### Why Edge/Node Auth Split?

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Performance | JWT at edge | Sub-millisecond auth checks for every request |
| Compatibility | No Mongoose in edge | Edge V8 isolates don't support Node.js native modules |
| Security | Full auth in Node | Password verification and DB lookup happen server-side only |

### Why ChromaDB as Optional?

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Availability | Graceful degradation | Platform remains functional without vector search |
| Development | Easier local setup | Developers don't need ChromaDB running for non-AI work |
| Production | Feature flagging | `isAvailable()` check enables/disables semantic features at runtime |

### Why EAP over MLE for Ability Estimation?

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Stability | EAP estimation | MLE is undefined with all-correct or all-incorrect responses |
| Bias | Standard normal prior | Regularizes estimates, especially with few responses |
| Precision | 41 quadrature points | Balances computational cost with estimation accuracy |
| Range | θ ∈ [-4, 4] | Covers 99.99% of the standard normal distribution |

---

> **Note:** This document reflects the architecture as of the current codebase state. As the system evolves, particularly if AI services are extracted into independent microservices, this document should be updated to reflect the new deployment topology.
