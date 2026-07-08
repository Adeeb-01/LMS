# Business Logic Layer — Calculations, Conditions & Algorithms

How **domain logic** lives in `lib/` (and related modules): pure math, conditional rules, scoring, and AI orchestration **without** UI or HTTP concerns.

**Related:** [DATA_ACCESS_LAYER.md](./DATA_ACCESS_LAYER.md) (queries/ORM), [INTELLIGENT_ALGORITHMS.md](./INTELLIGENT_ALGORITHMS.md) (RAG, embeddings, IRT, text processing), [MODULE_IMPLEMENTATION.md](./MODULE_IMPLEMENTATION.md), [ARCHITECTURE.md](./ARCHITECTURE.md) §9.

---

## Table of contents

1. [Layer role and boundaries](#1-layer-role-and-boundaries)
2. [Logic categories in this repo](#2-logic-categories-in-this-repo)
3. [IRT adaptive testing (`lib/irt/`)](#3-irt-adaptive-testing-libirt)
4. [Remediation scoring (`lib/remediation/`)](#4-remediation-scoring-libremediation)
5. [Text–video alignment (`lib/alignment/`)](#5-textvideo-alignment-libalignment)
6. [AI, RAG & similarity (`lib/ai/`, `lib/rag/`, `lib/embeddings/`)](#6-ai-rag--similarity-libai-librag-libembeddings)
7. [Question generation rules (`lib/mcq-generation/`, `lib/oral-generation/`)](#7-question-generation-rules)
8. [Course progress & certificates (`lib/course-progress.js`, `lib/certificate-helpers.js`)](#8-course-progress--certificates)
9. [Auth, permissions & validation](#9-auth-permissions--validation)
10. [Cross-cutting utilities](#10-cross-cutting-utilities)
11. [Who calls the business layer](#11-who-calls-the-business-layer)
12. [Implement new business logic](#12-implement-new-business-logic)
13. [Testing pure logic](#13-testing-pure-logic)

---

## 1. Layer role and boundaries

```text
┌──────────────────────────────────────────────┐
│  Presentation (React pages / components)        │
└────────────────────┬─────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│  Application (app/actions, app/api)           │  Orchestration, auth, I/O
│  - validate input (Zod)                       │
│  - call lib/* for rules                       │
│  - call queries/* for persistence             │
└────────────┬──────────────────┬──────────────┘
             │                  │
┌────────────▼────────┐  ┌──────▼──────────────┐
│  lib/               │  │  service/           │
│  Pure logic         │  │  Queues, Chroma,    │
│  Algorithms         │  │  pipeline           │
│  Conditions         │  │  (orchestration)    │
└─────────────────────┘  └─────────────────────┘
             │
┌────────────▼────────┐
│  queries/ + model/  │  Data access only
└─────────────────────┘
```

### Put logic in `lib/` when it…

| Criterion | Example |
|-----------|---------|
| Is **deterministic** or algorithmic | 3PL probability, EAP θ estimation |
| Encodes a **business rule** reusable in many places | Certificate 100% completion |
| Has **no** `NextResponse`, `redirect`, or JSX | `calculatePriorityScore` |
| Should be **unit-tested** without MongoDB | `mergeWeaknessEvents` |

### Keep logic out of `lib/` when it…

| Criterion | Put in… |
|-----------|---------|
| Reads/writes MongoDB | `queries/` or `service/` |
| Triggers HTTP response | `app/api/` |
| Binds forms / revalidates paths | `app/actions/` |
| Long-running job state machine | `service/pipeline-orchestrator.js` |

**Exception:** `lib/authorization.js` and `lib/certificate-helpers.js` use `server-only` and touch the DB for pragmatic ownership/completion checks — treat them as **domain services**, not pure functions.

---

## 2. Logic categories in this repo

| Category | Location | Nature |
|----------|----------|--------|
| **Psychometric math** | `lib/irt/*` | Pure numeric (3PL, Fisher info, EAP) |
| **Adaptive selection** | `lib/irt/selection.js`, `block-selection.js` | Conditions + optimization |
| **Weakness aggregation** | `lib/remediation/*` | Merge, score, prioritize |
| **String / signal alignment** | `lib/alignment/text-aligner.js` | Heuristic + similarity |
| **Vector similarity** | `lib/ai/semantic-similarity.js` | Async (embeddings API) |
| **LLM prompts & parsing** | `lib/rag/tutor-response.js`, `lib/ai/evaluation.js` | Async (external API) |
| **Content chunking** | `lib/embeddings/chunker.js`, `lib/docx/*` | Deterministic text processing |
| **IRT difficulty mapping** | `lib/mcq-generation/difficulty-estimator.js` | Lookup tables (Bloom → b) |
| **Progress & unlock rules** | `lib/course-progress.js` | Ordered lists, sequential access |
| **Completion rules** | `lib/certificate-helpers.js` | Boolean conditions on progress + quizzes |
| **RBAC rules** | `lib/permissions.js` | Role → permission set |
| **Input contracts** | `lib/validations.js` | Zod schemas (declarative rules) |
| **Rate limits** | `lib/rate-limit.js` | In-memory counters |

---

## 3. IRT adaptive testing (`lib/irt/`)

Used by `app/actions/adaptive-quiz.js` and `app/actions/bat-quiz.js`. **No database imports** — actions pass item parameters and responses in/out.

### 3.1 3PL probability (calculation)

Correct-response probability as a function of ability θ and item parameters **a** (discrimination), **b** (difficulty), **c** (guessing):

```13:20:lib/irt/probability.js
export function calculateProbability(theta, { a, b, c }) {
  const exponent = -a * (theta - b);
  const denominator = 1 + Math.exp(exponent);
  const p = c + (1 - c) / denominator;
  
  // Clamp to avoid numerical instability in Fisher Information
  return Math.max(0.001, Math.min(0.999, p));
}
```

**Formula:** \( P(\theta) = c + \frac{1-c}{1 + e^{-a(\theta-b)}} \)

### 3.2 Fisher information (calculation)

Measures how much an item informs θ at a given point:

```16:26:lib/irt/information.js
export function calculateFisherInformation(theta, params) {
  const { a, c } = params;
  const p = calculateProbability(theta, params);
  
  const numerator = Math.pow(a, 2) * Math.pow(p - c, 2) * (1 - p);
  const denominator = Math.pow(1 - c, 2) * p;
  
  if (denominator === 0) return 0;
  
  return numerator / denominator;
}
```

Standard error uses total information: \( SE(\theta) \approx 1 / \sqrt{\sum I(\theta)} \) (see `estimation.js`).

### 3.3 EAP ability estimation (algorithm)

After each response, re-estimate θ using **Expected A Posteriori** with 41 quadrature points on \([-4, 4]\), log-space for stability:

```17:59:lib/irt/estimation.js
export function estimateAbilityEAP(responses) {
  const numPoints = 41;
  const range = 8;
  const step = range / (numPoints - 1);
  const thetaPoints = Array.from({ length: numPoints }, (_, i) => -4 + i * step);
  // ... logPrior, logLikelihood, logPosteriors ...
  const estimatedTheta = denominatorSum > 0 ? numeratorSum / denominatorSum : 0;
  const se = calculateStandardError(estimatedTheta, items);
  return { theta: estimatedTheta, se };
}
```

**Input:** `[{ correct: boolean, params: { a, b, c } }, ...]`  
**Output:** `{ theta, se }`

### 3.4 Next-question selection (condition + algorithm)

**Maximum Fisher Information** among unanswered items; optional **content balancing** weights per module:

```19:58:lib/irt/selection.js
export function selectNextQuestion(currentTheta, pool, answeredIds = [], options = {}) {
  const { contentWeights = {} } = options;
  const answeredSet = new Set(answeredIds.map(id => id.toString()));
  const candidates = pool.filter(item => !answeredSet.has((item.id || item._id).toString()));
  if (candidates.length === 0) return null;
  // Pick item with highest calculateFisherInformation * moduleWeight
  return { ...bestItem, selectionMetrics: { ... } };
}
```

**Stopping conditions** (implemented in `adaptive-quiz.js`, not in `lib/`): max items, SE below threshold.

### 3.5 Block adaptive testing (BAT)

`block-selection.js` groups **2 questions** per block by **difficulty band** derived from θ:

```29:55:lib/irt/block-selection.js
export function selectBlock(theta, pool, usedIds = []) {
  const targetBand = getTargetBandForTheta(theta);
  // Filter pool by band; fallback to adjacent bands if < 2 items
  // Select 2 items with highest Fisher information within band
}
```

`difficulty-bands.js` maps θ ranges → `easy` | `medium` | `hard`.  
`ability-display.js` formats θ for UI labels.

### 3.6 Adaptive flow (orchestration in actions)

```text
Start attempt (θ₀ = 0)
  loop:
    item = selectNextQuestion(θ, pool, answeredIds)   // lib/irt
    present item → record response
    θ, se = estimateAbilityEAP(allResponses)         // lib/irt
    if se < threshold OR count >= max → stop
  end
```

Import from barrel:

```javascript
import {
  calculateProbability,
  estimateAbilityEAP,
  selectNextQuestion,
  selectBlock,
} from "@/lib/irt";
```

---

## 4. Remediation scoring (`lib/remediation/`)

Turns failure events (BAT gaps, oral misses) into a **prioritized weakness list**.

### 4.1 Priority score (calculation)

Weighted blend of frequency, recency, and source diversity → **0–100**:

```9:31:lib/remediation/priority-scorer.js
export function calculatePriorityScore(row, nowMs = Date.now()) {
  const failureCount = sources.length;
  const daysSince = (nowMs - lastMs) / 86400000;
  const recencyNorm = 1 / (Math.max(0, daysSince) + 1);
  const diversityNorm = (hasBat && hasOral) ? 1 : 0.5; // normalized to /2
  const freqNorm = Math.min(1, failureCount / 10);
  const blend = 0.4 * freqNorm + 0.35 * recencyNorm + 0.25 * diversityNorm;
  return Math.min(100, Math.round(blend * 100));
}
```

| Factor | Weight | Meaning |
|--------|--------|---------|
| Frequency | 40% | More failures → higher priority |
| Recency | 35% | Recent failures rank higher |
| Diversity | 25% | Failed in both BAT and oral → boost |

### 4.2 Merge events (algorithm)

`aggregator.js`:

1. `normalizeConceptTag` — lowercase trim for dedup key  
2. `mergeWeaknessEvents(events)` — group by tag, dedupe sources  
3. Sort by `priorityScore`, then `lastFailedAt`  

`run-aggregation.js` loads BAT/oral failures from DB, calls aggregator, merges into `WeaknessProfile`, resolves video timestamps via `timestamp-resolver.js` (semantic search).

---

## 5. Text–video alignment (`lib/alignment/`)

Maps DOCX blocks to video timecodes.

| File | Logic type |
|------|------------|
| `config.js` | Thresholds, feature flags |
| `audio-extractor.js` | FFmpeg: video → audio file |
| `transcriber.js` | Gemini: audio → word/segment timestamps |
| `text-aligner.js` | **Fuzzy match** DOCX blocks → transcript windows |
| `timestamp-lookup.js` | Resolve seconds for quiz links |
| `job-processor.js` | Job lifecycle (called from queue) |

### Alignment algorithm (excerpt)

For each structured content block, search forward in transcript with sliding windows; score with `string-similarity`:

```19:70:lib/alignment/text-aligner.js
export function alignTextWithTranscript(structuredContent, transcriptWords, threshold = 70) {
  // For each block:
  //   normalize text
  //   compareTwoStrings(blockNorm, windowText) over window sizes
  //   if score * 100 >= threshold → status 'aligned', set startSeconds/endSeconds
  //   else 'low-confidence' or 'unable-to-align'
}
```

**Conditions:**

| Status | Condition |
|--------|-----------|
| `not-spoken` | Empty block text |
| `aligned` | Similarity ≥ threshold (default 70) |
| `low-confidence` | Match below threshold |
| `unable-to-align` | No transcript words |

---

## 6. AI, RAG & similarity (`lib/ai/`, `lib/rag/`, `lib/embeddings/`)

### 6.1 Embeddings & chunking (deterministic + API)

| Function | File | Role |
|----------|------|------|
| `chunkByHeadings` | `embeddings/chunker.js` | Split DOCX structure; ~2000 token chunks |
| `generateEmbedding` | `embeddings/gemini.js` | Call Gemini embedding API |

Chunker enforces **CHAR_LIMIT = 8000**, preserves `headingPath`, splits at paragraph boundaries.

### 6.2 Cosine similarity (calculation)

Used for oral assessment, recite-back pass/fail:

```33:52:lib/ai/semantic-similarity.js
export function cosineSimilarity(a, b) {
    let dotProduct = 0, magnitudeA = 0, magnitudeB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }
    return dotProduct / (magnitudeA * magnitudeB);  // 0..1
}
```

`computeSemanticSimilarity(text1, text2)` embeds both strings then cosine — **async**.

**Typical thresholds (in actions, not lib):**

| Feature | Threshold | Condition |
|---------|-----------|-----------|
| Recite-back pass | ≥ 0.5 | vs tutor response |
| Oral assessment pass | ≥ `passingThreshold` (often 0.6) | vs reference answer |

### 6.3 RAG tutor response (LLM + conditions)

`lib/rag/tutor-response.js`:

- Builds prompt from retrieved chunks  
- System rules: grounded answer if in context; otherwise disclose general knowledge  
- Returns `{ response, isGrounded, timestampLinks }`  
- `AI_PROVIDER=local` → Ollama JSON schema; else Gemini with model fallback chain  

### 6.4 Oral evaluation & transcription

| File | Logic |
|------|--------|
| `transcription.js` | Audio → text (Gemini or Ollama + ffmpeg WAV 16kHz) |
| `evaluation.js` | Structured score + feedback vs reference (Gemini schema) |
| `concept-coverage.js` | Which key concepts addressed/missing (embeddings + rules) |
| `ollama.js` | Local LLM HTTP client |

---

## 7. Question generation rules

### MCQ (`lib/mcq-generation/`)

| File | Logic |
|------|--------|
| `generator.js` | Prompt Gemini per chunk; parse JSON questions |
| `question-validator.js` | Structural validation (options, correct index) |
| `duplicate-detector.js` | Similarity vs existing bank |
| `difficulty-estimator.js` | **Bloom → IRT b-value** ranges |

Bloom taxonomy maps to b intervals:

```5:12:lib/mcq-generation/difficulty-estimator.js
export const BLOOM_B_VALUE_MAP = {
    remember: [-2.0, -0.5],
    understand: [-0.5, 0.5],
    apply: [0.0, 1.0],
    analyze: [0.5, 1.5],
    evaluate: [1.0, 2.0],
    create: [1.5, 2.5]
};
```

```20:24:lib/mcq-generation/difficulty-estimator.js
export function isBValueValidForBloomLevel(bValue, bloomLevel) {
    const range = BLOOM_B_VALUE_MAP[bloomLevel];
    if (!range) return false;
    return bValue >= range[0] && bValue <= range[1];
}
```

### Oral generation (`lib/oral-generation/`)

`generator.js`, `reference-answer-builder.js`, `duplicate-detector.js` — LLM + validation; invoked from `service/oral-generation-queue.js`.

---

## 8. Course progress & certificates

### Sequential unlock (`lib/course-progress.js`)

**Business rules:**

- Only lessons with `active === true` count toward order and certificates  
- Modules sorted by `order`; lessons by `order` inside module  
- `getOrderedLessons(modules)` → flat published list  
- `isLessonUnlocked(lessonIndex, completedIds)` — lesson *i* unlocked if lesson *i-1* completed (index 0 always unlocked)

```31:48:lib/course-progress.js
export function getOrderedLessons(modules) {
  const sorted = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const list = [];
  for (const mod of sorted) {
    const sortedLessons = [...(mod.lessonIds || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const lesson of sortedLessons) {
      if (lesson && lesson.active === true) {
        list.push(lesson);
      }
    }
  }
  return list;
}
```

### Certificate eligibility (`lib/certificate-helpers.js`)

**Conditions (all must hold):**

1. User enrolled in course  
2. `completedPublishedCount === totalPublishedCount` (all published lessons in report)  
3. Every **course-level required quiz** (no `lessonId`, `required: true`) has `passed` in student quiz status map  

```72:76:lib/certificate-helpers.js
        const isComplete =
            totalPublishedCount > 0 &&
            completedPublishedCount === totalPublishedCount &&
            (courseRequiredQuizzes.length === 0 || allRequiredQuizzesPassed);
```

Progress percent:

```54:57:lib/certificate-helpers.js
        const progress =
            totalPublishedCount > 0
                ? (completedPublishedCount / totalPublishedCount) * 100
                : 0;
```

---

## 9. Auth, permissions & validation

### RBAC (`lib/permissions.js`)

Declarative **role → permission list**; pure functions:

```105:109:lib/permissions.js
export function hasPermission(userRole, permission) {
  if (!userRole || !permission) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}
```

Use in admin actions via `requirePermission(role, PERMISSIONS.USERS_VIEW)`.

### Ownership (`lib/authorization.js`)

Async checks: instructor owns course/lesson chain; admin override. Throws `AuthorizationError` (403).

### Validation (`lib/validations.js`)

**Zod** encodes input rules (lengths, enums, refinements):

```508:519:lib/validations.js
export const ragTutorQuerySchema = z.object({
  question: z.string().max(1000).optional(),
  lessonId: z.string().min(1),
  courseId: z.string().min(1),
  inputMethod: z.enum(['voice', 'text'])
}).strict().refine(data => {
  if (data.inputMethod === 'voice') return !!data.audioUrl || !!data.question;
  return !!data.question && data.question.length >= 3;
}, { message: "Missing question content" });
```

Validation is **not** in `lib/irt/` — keep schemas separate from algorithms.

---

## 10. Cross-cutting utilities

| Module | Logic |
|--------|--------|
| `lib/rate-limit.js` | In-memory sliding window: `rateLimit(id, max, windowMs)` → `{ success, remaining }` |
| `lib/errors.js` | `ERROR_CODES`, `getErrorCode`, sanitize messages |
| `lib/errors.js` | `createErrorResponse` for actions |
| `lib/convertData.js` | `_id` → `id` for client safety (not business rules) |
| `lib/formatPrice.js` | Display formatting |
| `lib/date.js` | Date formatting helpers |

---

## 11. Who calls the business layer

| Caller | Examples |
|--------|----------|
| `app/actions/adaptive-quiz.js` | `@/lib/irt` |
| `app/actions/bat-quiz.js` | `selectBlock`, `estimateAbilityEAP` |
| `app/actions/rag-tutor.js` | `generateGroundedResponse`, rate limit counts |
| `app/actions/oral-assessment.js` | `computeSemanticSimilarity`, `analyzeConceptCoverage` |
| `service/embedding-queue.js` | `chunkByHeadings`, `generateBatchEmbeddings` |
| `service/alignment-queue.js` | `alignTextWithTranscript` |
| `lib/remediation/run-aggregation.js` | `mergeWeaknessEvents`, `calculatePriorityScore` |
| Lesson layout / sidebar | `getOrderedLessons`, unlock helpers |

**Pattern:**

```javascript
// app/actions/example.js
"use server";
import { myBusinessRule } from "@/lib/my-module";
import { saveThing } from "@/queries/things";

export async function doThing(input) {
  const validated = schema.parse(input);
  const computed = myBusinessRule(validated);  // lib
  await saveThing(computed);                    // queries
  return { ok: true, data: computed };
}
```

---

## 12. Implement new business logic

### Example: “streak bonus” on quiz score

**Requirement:** If student answers 3+ correct in a row, add 5% bonus capped at 100%.

### Step 1 — Pure function in `lib/`

```javascript
// lib/quiz/streak-bonus.js
/**
 * @param {number} basePercent 0-100
 * @param {number} consecutiveCorrect
 * @returns {number} adjusted percent, capped at 100
 */
export function applyStreakBonus(basePercent, consecutiveCorrect) {
  if (consecutiveCorrect < 3) return basePercent;
  return Math.min(100, basePercent + 5);
}
```

### Step 2 — Unit test

```javascript
// tests/unit/quiz/streak-bonus.test.js
import { applyStreakBonus } from "@/lib/quiz/streak-bonus";

test("no bonus below 3 streak", () => {
  expect(applyStreakBonus(80, 2)).toBe(80);
});
test("5% bonus at 3 streak", () => {
  expect(applyStreakBonus(80, 3)).toBe(85);
});
test("caps at 100", () => {
  expect(applyStreakBonus(98, 5)).toBe(100);
});
```

### Step 3 — Use in action (orchestration only)

```javascript
import { applyStreakBonus } from "@/lib/quiz/streak-bonus";

const finalPercent = applyStreakBonus(rawPercent, streak);
await Attempt.findByIdAndUpdate(attemptId, { scorePercent: finalPercent });
```

### Guidelines

| Do | Avoid |
|----|--------|
| Export small named functions | God-file with DB + LLM + math |
| Document formulas in comments | Magic numbers without named constants |
| Pass plain data in/out | Importing `model` inside pure IRT files |
| Colocate domain folders (`lib/irt/`) | Dumping unrelated helpers in `utils.js` |

---

## 13. Testing pure logic

| Path | Covers |
|------|--------|
| `tests/unit/irt/` | probability, information, estimation, selection |
| `tests/unit/text-aligner.test.js` | alignment |
| `__tests__/lib/remediation/priority-scorer.test.js` | priority formula |
| `__tests__/lib/semantic-similarity.test.js` | cosine (mock embeddings) |

Run: `npm test`

**Pure lib tests** should not need MongoDB. Mock `generateEmbedding` when testing async AI helpers.

---

## Quick reference map

```text
Need…                              → Module
────────────────────────────────────────────────────────
Probability / θ / next item        → lib/irt/
BAT blocks                         → lib/irt/block-selection.js
Weakness priority                  → lib/remediation/priority-scorer.js
DOCX ↔ video times                 → lib/alignment/text-aligner.js
Chunk lecture text                 → lib/embeddings/chunker.js
Similarity of two answers          → lib/ai/semantic-similarity.js
Tutor answer from chunks           → lib/rag/tutor-response.js
Bloom → IRT b                      → lib/mcq-generation/difficulty-estimator.js
Lesson order & unlock              → lib/course-progress.js
Can download certificate?          → lib/certificate-helpers.js
Role can do X?                     → lib/permissions.js
Is input valid?                    → lib/validations.js
Throttle requests                  → lib/rate-limit.js
```

---

*Domain logic files: 70+ under `lib/`. Orchestration and persistence stay in `app/actions`, `app/api`, `service/`, and `queries/`.*
