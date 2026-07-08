# Technology Stack — LMS-main

Inventory of programming languages, frameworks, libraries, databases, tools, and runtime environments used in this repository (from `package.json`, source code, and project docs).

---

## Table of contents

1. [Programming languages](#1-programming-languages)
2. [Frameworks & platforms](#2-frameworks--platforms)
3. [Database & data stores](#3-database--data-stores)
4. [Libraries (npm dependencies)](#4-libraries-npm-dependencies)
5. [External services & APIs](#5-external-services--apis)
6. [Software tools (dev & ops)](#6-software-tools-dev--ops)
7. [Operating systems](#7-operating-systems)

---

## 1. Programming languages

| Language | Where used |
|----------|------------|
| **JavaScript (ES modules)** | Primary app code: `app/`, `lib/`, `service/`, `model/`, `queries/`, `components/`, API routes |
| **JSX** | React UI components (`.jsx`) |
| **TypeScript** | `seed.ts` (database seeding); Babel/Jest can compile TS in tests |
| **Python 3** | `start_chroma.py`, `service/strartchroma.py` (ChromaDB server helper); `testsprite_tests/*.py` (E2E automation) |
| **CSS** | Tailwind utility classes; global styles |
| **JSON** | Config, i18n (`messages/en.json`, `messages/ar.json`), API payloads |
| **Markdown** | Docs, specs under `specs/` |

---

## 2. Frameworks & platforms

### Core application

| Framework / platform | Version (package.json) | Role |
|----------------------|------------------------|------|
| **Node.js** | **22.x** (project guideline) | Server runtime for Next.js |
| **Next.js** | 15.x (App Router) | Full-stack framework (UI, API routes, middleware, Server Actions) |
| **React** | 18.3.1 | UI library |
| **React DOM** | 18.3.1 | DOM rendering |

### Auth & i18n

| Framework | Version | Role |
|-----------|---------|------|
| **NextAuth.js (Auth.js v5)** | 5.0.0-beta.25 | Authentication (JWT session, credentials provider) |
| **next-intl** | 4.8.3 | Internationalization (`en`, `ar` locales) |
| **next-themes** | 0.4.3 | Light/dark theme |

### UI & styling

| Framework / library | Role |
|---------------------|------|
| **Tailwind CSS** | 3.4.x | Utility-first CSS |
| **tailwindcss-animate** | Animation utilities |
| **shadcn/ui** (pattern) | Component primitives built on Radix |
| **Radix UI** | Accessible headless components (`@radix-ui/react-*`) |
| **class-variance-authority (CVA)** | Component variant styling |
| **clsx** / **tailwind-merge** | Class name composition |
| **lucide-react** | Icons |

### Forms & validation

| Library | Role |
|---------|------|
| **React Hook Form** | Form state |
| **@hookform/resolvers** | Zod integration for forms |
| **Zod** | Schema validation (API, actions, forms) |

### Data access (application layer)

| Library | Role |
|---------|------|
| **Mongoose** | 8.x — MongoDB ODM |
| **ChromaDB** (`chromadb` npm client) | Vector store client |
| **@chroma-core/default-embed** | Chroma embedding helper (transitive stack) |

### AI / ML (in-app)

| Component | Role |
|-----------|------|
| **Google Generative AI SDK** (`@google/generative-ai`) | Embeddings, RAG answers, transcription, oral evaluation, alignment STT |
| **Ollama** (optional, HTTP) | Local AI when `AI_PROVIDER=local` (`lib/ai/ollama.js`) |
| **mathjs** | IRT / adaptive testing numerical math |
| **string-similarity** | Text–video alignment fuzzy matching |

### Media & documents

| Library | Role |
|---------|------|
| **mammoth** | DOCX → text/HTML extraction |
| **fluent-ffmpeg** + **ffmpeg-static** | Audio extraction, format conversion (16 kHz WAV) |
| **react-player** | Video playback |
| **pdf-lib** + **@pdf-lib/fontkit** | Certificate PDF generation |
| **react-quill** | Rich text editor |

### Other UI utilities

| Library | Role |
|---------|------|
| **@hello-pangea/dnd** | Drag-and-drop (course/module ordering) |
| **@tanstack/react-table** | Data tables (admin/dashboard) |
| **embla-carousel-react** | Carousels |
| **react-dropzone** | File uploads |
| **react-day-picker** + **date-fns** | Date picking |
| **cmdk** | Command palette pattern |
| **sonner** | Toast notifications |

---

## 3. Database & data stores

| Store | Type | Usage |
|-------|------|--------|
| **MongoDB** | Document DB (primary OLTP) | Users, courses, lessons, enrollments, quizzes, attempts, payments, pipeline jobs, lecture documents, etc. |
| **Mongoose 8** | ODM | Models in `model/`, queries in `queries/` |
| **ChromaDB** | Vector database (optional) | Semantic search, RAG retrieval, embeddings collection `lms_embeddings` |
| **Local filesystem** | File storage | Uploaded images, videos (`uploads/videos/`), avatars, course assets under `public/` |
| **AWS S3** (optional) | Object storage | Presigned URLs for audio uploads (`@aws-sdk/client-s3`) |

**Connection config (typical `.env`):**

- `MONGODB_CONNECTION_STRING` — e.g. `mongodb://localhost:27017/lms` or MongoDB Atlas
- `CHROMA_HOST` — e.g. `http://localhost:8000`
- `CHROMA_COLLECTION` — default `lms_embeddings`

**Payment data model** supports `stripe` and `mockpay` providers in schema; **runtime uses MockPay** (no Stripe SDK in `package.json`).

---

## 4. Libraries (npm dependencies)

### Production (`dependencies`)

| Category | Packages |
|----------|----------|
| **AWS** | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| **Vector / AI** | `chromadb`, `@chroma-core/default-embed`, `@google/generative-ai` |
| **Auth / crypto** | `next-auth`, `bcryptjs` |
| **Database** | `mongoose` |
| **Framework** | `next`, `react`, `react-dom`, `next-intl`, `next-themes` |
| **UI** | All `@radix-ui/react-*` listed in `package.json`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `cmdk`, `sonner` |
| **Forms** | `react-hook-form`, `@hookform/resolvers`, `zod` |
| **Tables / DnD** | `@tanstack/react-table`, `@hello-pangea/dnd` |
| **Media** | `ffmpeg-static`, `fluent-ffmpeg`, `mammoth`, `react-player`, `react-quill`, `react-dropzone` |
| **PDF** | `pdf-lib`, `@pdf-lib/fontkit` |
| **Math / text** | `mathjs`, `string-similarity` |
| **Email** | `resend` |
| **Utils** | `date-fns`, `uuid`, `node-fetch`, `embla-carousel-react`, `react-day-picker` |

### Development (`devDependencies`)

| Tool / library | Role |
|----------------|------|
| **Jest** | Unit/integration tests — see [TEST_PLAN.md](./TEST_PLAN.md) |
| **jest-environment-jsdom** | DOM test environment |
| **@testing-library/react** | Component tests |
| **@testing-library/jest-dom** | DOM matchers |
| **@testing-library/user-event** | User interaction simulation |
| **Babel** (`@babel/core`, presets env/react/typescript) | Jest transpilation |
| **babel-jest** | Jest + Babel bridge |
| **ESLint** + **eslint-config-next** | Linting |
| **Tailwind CSS** + **PostCSS** | CSS build |
| **tsx** | Run TypeScript (`seed.ts`) |
| **dotenv** | Env loading in scripts/tests |

### Transitive / indirect (not direct app imports)

| Package | Notes |
|---------|--------|
| **@huggingface/transformers** | Pulled in via Chroma/embed stack; README mentions Whisper/Transformers historically — **current transcription uses Gemini** (`lib/ai/transcription.js`, `lib/alignment/transcriber.js`) |

---

## 5. External services & APIs

| Service | Purpose | Required? |
|---------|---------|-----------|
| **Google Gemini API** | Embeddings, MCQ/oral generation, RAG tutor, transcription, oral grading | Yes for AI features (`GEMINI_API_KEY`) |
| **Ollama** (local HTTP) | Optional local LLM/STT when `AI_PROVIDER=local` | Optional |
| **MongoDB** | Primary database | Yes |
| **ChromaDB server** | Vector search | Optional (graceful degradation) |
| **Resend** | Transactional email | Optional (`RESEND_API_KEY`) |
| **AWS S3** | Audio file uploads (presigned) | Optional (if configured) |
| **Cloudinary** | Remote images allowed in `next.config.mjs` | Optional CDN |
| **MockPay** | In-app simulated payments | Demo/default |
| **Stripe** | Referenced in payment model only | Not integrated in dependencies |

---

## 6. Software tools (dev & ops)

| Tool | Role |
|------|------|
| **npm** / **npx** | Package install, scripts (`dev`, `build`, `start`, `test`, `lint`) |
| **Git** | Version control |
| **ESLint** | `npm run lint` |
| **Jest** | `npm test` |
| **PostCSS** | CSS processing for Tailwind |
| **tsx** | `npm run db:reset` → `seed.ts` |
| **Node** | `node scripts/cleanup-stuck-pipelines.js` |
| **Python 3** + **uvicorn** | Start Chroma via `start_chroma.py` (`chromadb.app:app`, port 8000) |
| **ffmpeg** (bundled) | Via `ffmpeg-static` binary — no separate system install required for Node path |
| **TestSprite** | Python E2E tests in `testsprite_tests/` (external test runner) |

**npm scripts:**

```bash
npm run dev          # next dev
npm run build        # next build
npm run start        # next start
npm run lint         # next lint
npm run test         # jest
npm run db:reset     # tsx seed.ts
npm run cleanup-stuck-pipelines
```

---

## 7. Operating systems

| Environment | Support |
|-------------|---------|
| **Development** | **Windows**, **macOS**, **Linux** — Node.js and Next.js are cross-platform |
| **Production** | Typically **Linux** (VPS, Docker, or PaaS such as Vercel/Node hosting) |
| **MongoDB** | Runs on Windows/macOS/Linux or **MongoDB Atlas** (cloud) |
| **ChromaDB** | Separate process; started locally via Python/`uvicorn` or hosted instance |

**This repo does not ship** a `Dockerfile` or docker-compose; services are run manually or on your host/PaaS.

**Documented / implied minimums:**

- Node.js **22.x** (workspace guidelines)
- MongoDB **6+** (common with Mongoose 8; use vendor docs for exact version)
- ChromaDB **3.3.x** client matching server API
- Modern browser for students/instructors (media APIs, cookies, ES modules)

---

## Architecture summary

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser (React 18 + Next.js 15 UI)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / cookies
┌───────────────────────────▼─────────────────────────────────┐
│  Node.js 22 — Next.js (middleware, pages, API, actions)       │
└─┬─────────────┬──────────────┬──────────────┬───────────────┘
  │             │              │              │
  ▼             ▼              ▼              ▼
MongoDB    ChromaDB      Gemini API     S3 / filesystem
(Mongoose)  (optional)    (optional      (uploads)
                         Ollama local)
```

---

## Related documentation

- [README.md](./README.md) — features and quick start
- [API_DESIGN.md](./API_DESIGN.md) — REST API reference
- [SECURITY_AND_PERMISSIONS.md](./SECURITY_AND_PERMISSIONS.md) — auth and RBAC
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) — MongoDB schema
- [VECTOR_DATABASE_DESIGN.md](./VECTOR_DATABASE_DESIGN.md) — ChromaDB design

*Last aligned with `package.json` and source tree as of project snapshot.*
