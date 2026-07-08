## Project brief: LMS-main

### What it is
This repository is a **modern Learning Management System (LMS)** built as a **single Next.js 15 App Router application** (UI + API routes + server actions in one codebase). It targets **educational institutions and online learning platforms** and adds an **AI layer** for content processing, adaptive testing, tutoring, and remediation.

- **Stated intent**: `README.md` describes course creation/enrollment/quizzes/progress/certificates plus an “AI Content Pipeline” and “AI-Driven Remediation Dashboard”.
- **Runtime shape**: Next.js pages under `app/**`, API routes under `app/api/**`, server actions under `app/actions/**`, with supporting modules in `lib/**`, background/service orchestration in `service/**`, DB models in `model/**`.

### The problem it solves
Traditional LMSs can deliver videos/docs/quizzes, but they typically don’t:

- Turn instructor materials into structured, searchable learning content automatically.
- Link text concepts to exact video timestamps (“click paragraph → jump to the moment in video”).
- Generate assessments at scale (MCQs + oral questions) and adapt difficulty to learner ability.
- Track concept-level weaknesses and guide students back to where the concept is explained.

This project’s core problem statement is: **reduce instructor workload and improve learning outcomes** by automating content extraction/indexing/generation and providing **adaptive assessments + AI tutoring + remediation**.

### Scope (in / out)

#### In scope
- **Course marketplace + delivery**: browse courses, enroll (mock payments), watch lessons, track progress.
- **Admin / instructor / student dashboards**.
- **Quiz system**, including **Adaptive Testing (IRT)** and **Block-based Adaptive Testing (BAT)**.
- **AI pipeline**: DOCX extraction → text/video alignment → embeddings → semantic search → question generation (MCQ + oral).
- **AI tutoring (RAG)** with optional voice input (transcription).
- **Oral assessments** (system-generated checkpoints, semantic scoring).
- **Remediation dashboard** (concept gaps aggregated across assessments).
- **Certificates** (PDF on completion).

#### Out of scope / mocked / optional
- **Real payment gateway**: repo emphasizes **MockPay** for demo/testing.
- **Vector search dependency is optional**: semantic search can degrade if ChromaDB is unavailable.

### Actors (roles)

#### Admin
- Manages users, courses, categories, analytics, payments, reviews, enrollments.
- Enforced by edge middleware + role permissions (see `middleware.js`, `lib/permissions.js`).

#### Instructor
- Creates/manages courses/modules/lessons.
- Uploads lesson materials (video + DOCX).
- Triggers and monitors AI content pipeline stages.
- Reviews/edits generated questions and publishes quizzes.
- Views analytics (including class-level remediation patterns).

#### Student
- Browses courses, enrolls, watches lessons, takes quizzes.
- Uses semantic search / RAG tutor (text/voice).
- Takes oral assessments / recitation checks.
- Uses remediation dashboard to review weak concepts with deep links to exact video timestamps.

### Tools and technologies used (from `package.json`, config, and code)
- **Framework/UI**: Next.js 15, React 18, Tailwind CSS, shadcn/ui, Radix UI
- **Auth**: NextAuth v5
- **i18n**: `next-intl` (locale-prefixed routes `en`/`ar`)
- **Database**: MongoDB with Mongoose
- **Vector DB**: ChromaDB (optional) for semantic retrieval
- **AI providers**:
  - Gemini (`@google/generative-ai`) for embeddings / generation (and related AI flows)
  - Optional local Ollama path (repo includes `lib/ai/ollama.js`)
- **DOCX extraction**: `mammoth`
- **Audio processing**: `fluent-ffmpeg`, `ffmpeg-static`
- **Adaptive testing math**: `mathjs`
- **Email**: Resend (optional)
- **Testing**: Jest + Testing Library

### Functional requirements (condensed)
- **FR1**: Users can register/login and be assigned roles (Admin/Instructor/Student).
- **FR2**: Instructors can create courses/modules/lessons and upload lesson video + DOCX.
- **FR3**: Students can browse courses, enroll (MockPay), access lessons, and track progress.
- **FR4**: System extracts DOCX to structured text.
- **FR5**: System aligns text to video timestamps and supports “jump to timestamp”.
- **FR6**: System indexes lesson text into embeddings (ChromaDB) and provides semantic search.
- **FR7**: System supports RAG tutoring (text/voice) grounded in lesson material.
- **FR8**: System generates MCQs and oral questions; instructors can review/publish.
- **FR9**: Students can take quizzes in normal, IRT-adaptive, or BAT mode; attempts are scored and stored.
- **FR10**: Students can do oral assessments; system evaluates responses and records concept gaps.
- **FR11**: System aggregates weaknesses into a remediation dashboard with timestamp deep links.
- **FR12**: System issues PDF certificates upon completion, with rate limiting.

### Non-functional requirements (condensed)
- **NFR1 Security**: Prevent unauthorized access to content (RBAC + enrollment/ownership checks).
- **NFR2 Privacy**: Only authorized users can access learner data and course assets.
- **NFR3 Performance**: Efficient video delivery (range requests) and scalable assessment logic (BAT).
- **NFR4 Resilience**: Degrade gracefully if vector DB is down; handle stuck pipeline jobs.
- **NFR5 Maintainability/Testability**: Modular services/lib layers and automated tests.

---

## Complete route map (UI + API), with access rules

### How access control works
- **Locale prefix**: all UI routes are under `/{locale}` where locale is `en` or `ar` (see `middleware.js`).
- **Public UI routes**: `/`, `/courses…`, `/login`, `/register/*`, `/setup/admin` (see `lib/routes.js`).
- **Everything else UI** requires authentication, and then:
  - **`/admin/**`**: admin only
  - **`/dashboard/**`**: instructor or admin
  - **Exception**: **`/dashboard/remediation` is allowed for students**, but still requires auth (`middleware.js`).

> Note: API routes are not covered by the middleware matcher (`/api` is excluded). Each API route enforces auth/authorization inside the handler or via server actions it calls.

---

## UI routes (`app/[locale]/**/page.*`)

### Public (no auth required)
- **Home**
  - `/{locale}/` → `app/[locale]/(main)/page.js`
- **Course catalog & discovery**
  - `/{locale}/courses` → `app/[locale]/(main)/courses/page.jsx`
  - `/{locale}/categories/[id]` → `app/[locale]/(main)/categories/[id]/page.jsx`
  - `/{locale}/inst-profile/[id]` → `app/[locale]/(main)/inst-profile/[id]/page.jsx`
- **Auth**
  - `/{locale}/login` → `app/[locale]/login/page.jsx`
  - `/{locale}/register/[role]` → `app/[locale]/register/[role]/page.jsx`
- **Initial admin bootstrap**
  - `/{locale}/setup/admin` → `app/[locale]/setup/admin/page.jsx`
- **Mock checkout UI**
  - `/{locale}/checkout/mock` → `app/[locale]/(main)/checkout/mock/page.jsx`
- **Post-enrollment landing**
  - `/{locale}/enroll-success` → `app/[locale]/(main)/enroll-success/page.jsx`

### Auth required (any role), not `/admin` or `/dashboard` restricted
- **Account area**
  - `/{locale}/account` → `app/[locale]/(main)/account/@tabs/page.jsx`
  - `/{locale}/account/enrolled-courses` → `app/[locale]/(main)/account/@tabs/enrolled-courses/page.jsx`
- **Course detail + learning**
  - `/{locale}/courses/[id]` → `app/[locale]/(main)/courses/[id]/page.jsx`
  - `/{locale}/courses/[id]/lesson` → `app/[locale]/(main)/courses/[id]/lesson/page.jsx`
- **Student quiz-taking**
  - `/{locale}/courses/[id]/quizzes` → `app/[locale]/(main)/courses/[id]/quizzes/page.jsx`
  - `/{locale}/courses/[id]/quizzes/[quizId]` → `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/page.jsx`
  - `/{locale}/courses/[id]/quizzes/[quizId]/result` → `app/[locale]/(main)/courses/[id]/quizzes/[quizId]/result/page.jsx`

### Dashboard (instructor/admin; students only for remediation)
- **Dashboard landing**
  - `/{locale}/dashboard` → `app/[locale]/dashboard/page.jsx`
- **Courses management**
  - `/{locale}/dashboard/courses` → `app/[locale]/dashboard/courses/page.jsx`
  - `/{locale}/dashboard/courses/add` → `app/[locale]/dashboard/courses/add/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]` → `app/[locale]/dashboard/courses/[courseId]/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/modules/[moduleId]` → `app/[locale]/dashboard/courses/[courseId]/modules/[moduleId]/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/enrollments` → `app/[locale]/dashboard/courses/[courseId]/enrollments/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/reviews` → `app/[locale]/dashboard/courses/[courseId]/reviews/page.jsx`
- **Lesson tooling (AI pipeline + content)**
  - `/{locale}/dashboard/courses/[courseId]/lessons/[lessonId]/document` → `.../document/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/lessons/[lessonId]/alignment` → `.../alignment/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/lessons/[lessonId]/pipeline` → `.../pipeline/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions` → `.../generate-questions/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/lessons/[lessonId]/assessments` → `.../assessments/page.jsx`
- **Quiz management**
  - `/{locale}/dashboard/courses/[courseId]/quizzes` → `.../quizzes/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/quizzes/new` → `.../quizzes/new/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/quizzes/[quizId]` → `.../quizzes/[quizId]/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/quizzes/[quizId]/questions` → `.../questions/page.jsx`
  - `/{locale}/dashboard/courses/[courseId]/quizzes/[quizId]/attempts` → `.../attempts/page.jsx`
- **Lives**
  - `/{locale}/dashboard/lives` → `app/[locale]/dashboard/lives/page.jsx`
  - `/{locale}/dashboard/lives/add` → `.../lives/add/page.jsx`
  - `/{locale}/dashboard/lives/[liveId]` → `.../lives/[liveId]/page.jsx`
- **Remediation dashboard (auth required; allowed for students)**
  - `/{locale}/dashboard/remediation` → `app/[locale]/dashboard/remediation/page.js`

### Admin (admin only)
- `/{locale}/admin` → `app/[locale]/admin/page.jsx`
- `/{locale}/admin/users` → `app/[locale]/admin/users/page.jsx`
- `/{locale}/admin/courses` → `app/[locale]/admin/courses/page.jsx`
- `/{locale}/admin/categories` → `app/[locale]/admin/categories/page.jsx`
- `/{locale}/admin/quizzes` → `app/[locale]/admin/quizzes/page.jsx`
- `/{locale}/admin/enrollments` → `app/[locale]/admin/enrollments/page.jsx`
- `/{locale}/admin/reviews` → `app/[locale]/admin/reviews/page.jsx`
- `/{locale}/admin/payments` → `app/[locale]/admin/payments/page.jsx`
- `/{locale}/admin/analytics` → `app/[locale]/admin/analytics/page.jsx`

---

## API routes (`app/api/**/route.*`)

### Auth / identity / profile
- `POST /api/register` → `app/api/register/route.js` (also a “public route” in `lib/routes.js`)
- `GET /api/me` → `app/api/me/route.js`
- `GET|POST /api/auth/[...nextauth]` → `app/api/auth/[...nextauth]/route.js`
- `POST /api/profile/avatar` → `app/api/profile/avatar/route.js`

### Health
- `GET /api/health` → `app/api/health/route.js`

### Courses/lessons content and tracking
- `POST /api/lesson-watch` → `app/api/lesson-watch/route.js`
- `GET /api/videos/[filename]` → `app/api/videos/[filename]/route.js` (secure video streaming, supports range)
- Uploads:
  - `POST /api/upload` → `app/api/upload/route.js`
  - `POST /api/upload/video` → `app/api/upload/video/route.js`
  - `POST /api/upload/audio-url` → `app/api/upload/audio-url/route.js`

### Lecture documents (DOCX extraction artifacts)
- `GET|POST /api/lecture-documents` → `app/api/lecture-documents/route.js`
- `GET /api/lecture-documents/by-lesson/[lessonId]` → `app/api/lecture-documents/by-lesson/[lessonId]/route.js`
- `GET|PATCH|DELETE /api/lecture-documents/[id]` → `app/api/lecture-documents/[id]/route.js`
- `GET /api/lecture-documents/[id]/download` → `app/api/lecture-documents/[id]/download/route.js`

### Alignment (text ↔ video timestamps)
- `GET /api/alignments/lesson/[lessonId]` → `app/api/alignments/lesson/[lessonId]/route.js`
- `GET /api/alignments/job/[jobId]` → `app/api/alignments/job/[jobId]/route.js`

### Indexing / semantic search (vector retrieval)
- `POST /api/semantic-search` → `app/api/semantic-search/route.js`
- `GET /api/semantic-search/status` → `app/api/semantic-search/status/route.js`

### Pipeline orchestration (instructor tooling)
- `GET /api/pipeline/[lessonId]/status` → `app/api/pipeline/[lessonId]/status/route.js`

### Generation (MCQ + oral)
- `POST /api/mcq-generation` → `app/api/mcq-generation/route.js`
- `GET /api/mcq-generation/[jobId]` → `app/api/mcq-generation/[jobId]/route.js`
- `POST /api/oral-generation` → `app/api/oral-generation/route.js`
- `GET /api/oral-generation/[jobId]` → `app/api/oral-generation/[jobId]/route.js`

### Quizzes / attempts / answers
- `GET|PATCH /api/quizv2/attempts/[attemptId]` → `app/api/quizv2/attempts/[attemptId]/route.js`
- `GET /api/answers/[answerId]/status` → `app/api/answers/[answerId]/status/route.js`

### Oral assessment
- `GET /api/oral-assessment/lesson/[lessonId]` → `app/api/oral-assessment/lesson/[lessonId]/route.js`
- `POST /api/oral-assessment/[assessmentId]/submit` → `app/api/oral-assessment/[assessmentId]/submit/route.js`
- `POST /api/evaluate-oral` → `app/api/evaluate-oral/route.js`

### RAG tutor
- `POST /api/rag-tutor/query` → `app/api/rag-tutor/query/route.js`
- `POST /api/rag-tutor/recite-back` → `app/api/rag-tutor/recite-back/route.js`

### Remediation aggregation (internal)
- `POST /api/remediation/aggregate` → `app/api/remediation/aggregate/route.js`

### Payments / certificates
- `POST /api/payments/mock/confirm` → `app/api/payments/mock/confirm/route.js`
- `GET /api/payments/status` → `app/api/payments/status/route.js`
- `GET /api/certificates/[courseId]` → `app/api/certificates/[courseId]/route.js`

---

## Step-by-step narrative: AI Content Pipeline (Instructor-triggered)

### 0) Preconditions (typically)
- Lesson has an uploaded **DOCX lecture document** and **video**.
- A quiz may or may not exist; if it doesn’t, the pipeline may skip generation.

### 1) Instructor triggers pipeline (dashboard → orchestrator)
Call: `pipelineOrchestrator.startPipeline(lessonId, userId, initialStage?)` in `service/pipeline-orchestrator.js`.

Inside `startPipeline`:
- Auto-cancels stale jobs (>10 minutes).
- Enforces concurrency: `MAX_CONCURRENT_PIPELINES = 5`.
- Cancels existing active pipelines for the same lesson.
- Creates a `PipelineJob` in Mongo.
- Chooses starting stage based on current `LectureDocument.status`.

### 2) Extraction stage (“extracting”)
Extraction is described as handled by an action elsewhere; the orchestrator monitors `LectureDocument` and marks completion via:

- `pipelineOrchestrator.handleStageCompletion(pipelineId, 'extraction')`

### 3) Alignment + Indexing run in parallel after extraction
When extraction completes, orchestrator triggers both:

#### 3A) Alignment stage (“aligning”)
- Orchestrator calls `queueAlignmentJob(...)` in `service/alignment-queue.js`.
- `queueAlignmentJob` creates an `AlignmentJob` and starts `processAlignmentJob(jobId)` (implementation: `lib/alignment/job-processor`).
- Alignment failure is treated as **non-fatal** by orchestrator; indexing/generation can continue.

#### 3B) Indexing stage (“indexing”) — embeddings → Chroma
Orchestrator calls `triggerIndexing(docId, pipelineJobId)` in `service/embedding-queue.js`.

Indexing worker `processIndexingJob(jobId)` performs:
- chunking: `chunkByHeadings(doc.extractedText.structuredContent)`
- embeddings: Gemini batch embeddings (`generateBatchEmbeddings`)
- storage: writes embeddings to Chroma (`addEmbeddings`)
- updates `LectureDocument.embeddingStatus = 'indexed'`
- notifies orchestrator:
  - `pipelineOrchestrator.handleStageCompletion(pipelineJobId, 'indexing', { chunksIndexed })`

### 4) Generation stage starts when indexing completes (“generating”)
Orchestrator transitions to `generating`:
- Fetches `LectureDocument` + lesson `Quiz`.
- If no quiz exists, marks generation as skipped and completes.
- Otherwise triggers MCQ + oral generation in parallel:
  - MCQ: `service/mcq-generation-queue.js`
  - Oral: `service/oral-generation-queue.js`

#### 4A) MCQ generation queue (details)
`processGenerationJob(jobId)` in `service/mcq-generation-queue.js`:
- obtains chunks:
  - primary: Chroma (`getChunksByLesson`)
  - fallback: chunk from Mongo if Chroma unavailable
- generates questions per chunk (Gemini): `lib/mcq-generation/generator`
- duplicate detection: `lib/mcq-generation/duplicate-detector`
- saves draft questions with IRT params (`Question` collection)
- notifies orchestrator:
  - `pipelineOrchestrator.handleStageCompletion(pipelineJobId, 'mcqGeneration', { questionsGenerated, questionsFlagged })`

### 5) Pipeline completion
Pipeline completes when generation stages finish (or partial success rules apply). Status is polled via:
- `GET /api/pipeline/[lessonId]/status` in `app/api/pipeline/[lessonId]/status/route.js` (owner/admin check).

---

## Step-by-step narrative: RAG Tutor request flow (Student Q&A, voice or text)

### 1) Client submits a tutor query
`POST /api/rag-tutor/query` in `app/api/rag-tutor/query/route.js` with:
- `lessonId`, `courseId`, plus one of:
  - `audioBase64` (+ `audioMimeType`), or
  - `audioUrl`, or
  - `question` (text)

### 2) API route: auth + enrollment gate + transcription (if voice)
`app/api/rag-tutor/query/route.js`:
- connects to Mongo (`dbConnect`)
- loads user (`getLoggedInUser`)
- enforces: enrolled OR admin/instructor
- if voice:
  - `transcribeAudioBase64(...)` or `transcribeAudio(...)` from `lib/ai/transcription.js`
- constructs `finalQuestion`
- calls server action `askTutor(...)`.

### 3) Server action: retrieval + response generation + persistence
`askTutor(...)` in `app/actions/rag-tutor.js`:
1. Validates input (`ragTutorQuerySchema`).
2. Rate limits (10 questions/user/lesson/24h).
3. Retrieval:
   - calls `searchCourse(question, courseId, user, { limit: 3, threshold: 0.6 })` in `service/semantic-search.js`
   - `searchCourse`:
     - enforces enrollment/ownership/admin
     - uses Chroma if available; otherwise returns empty results with `degraded: true`
     - generates query embedding (Gemini) and queries Chroma
4. Generation:
   - calls `generateGroundedResponse(question, results)` in `lib/rag/tutor-response.js`
   - chooses **local Ollama** if `AI_PROVIDER=local` and available; else uses **Gemini**
   - returns `{ response, isGrounded, timestampLinks }`
5. Persistence:
   - creates `TutorInteraction` with question/response, groundedness, retrieved chunks, timestamp links, and `reciteBackRequired`.

### 4) API returns response
`/api/rag-tutor/query` returns:
- `response`
- `isGrounded`
- `timestampLinks`
- `reciteBackRequired`
- optional `rateLimitWarning`

### 5) Recite-back loop (optional)
If `reciteBackRequired`:
- client submits recitation to `/api/rag-tutor/recite-back`
- server action `submitReciteBack(...)` in `app/actions/rag-tutor.js`:
  - verifies the interaction belongs to the student
  - computes semantic similarity (`computeSemanticSimilarity`)
  - pass threshold 0.5
  - saves `ReciteBackAttempt`
  - after 3 failures, upserts a `ConceptGap` for remediation.

