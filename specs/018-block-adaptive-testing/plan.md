# Implementation Plan: Block-Based Adaptive Testing Engine (BAT)

**Branch**: `018-block-adaptive-testing` | **Date**: 2026-03-30 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/018-block-adaptive-testing/spec.md`

## Summary

Implement Block-Based Adaptive Testing (BAT) that extends the existing adaptive IRT testing system (016-adaptive-irt-testing) by grouping questions into blocks of 2. Each block contains questions from the same difficulty band, θ is recalculated only after block submission (not per-question), and tests terminate after exactly 5 blocks (10 questions). This reduces server load by 50%, provides psychological stability for students, and enables concept-gap diagnostics via missed concept tag tracking.

## Technical Context

**Language/Version**: JavaScript (ES6+) via Node.js / Next.js 15 (App Router)  
**Primary Dependencies**: Next.js 15, React 18, Mongoose 8, Zod 3, shadcn/ui, next-intl (existing); mathjs (existing from 016)  
**Storage**: MongoDB via Mongoose 8 (extends existing Quiz, Attempt, Question models)  
**Testing**: Jest (existing setup in `jest.config.mjs`)  
**Target Platform**: Web application (browser-based)  
**Project Type**: Web service (LMS platform)  
**Performance Goals**: Block selection completes in <500ms; 50% reduction in server requests vs per-question adaptation  
**Constraints**: Single active session per student per quiz; fixed 5 blocks / 10 questions; offline not supported  
**Scale/Scope**: Existing LMS scale; question pools minimum 12 items (4 per difficulty band) for BAT mode

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Role-Based Security First | ✅ Pass | Concept tag visibility follows existing role patterns (student + instructors) |
| II. Server-Side Authority | ✅ Pass | Block selection, θ estimation, and termination logic all in Server Actions |
| III. Schema-Validated Data | ✅ Pass | Zod schemas for BAT config; Mongoose for block/attempt persistence |
| IV. Component Modularity | ✅ Pass | BAT UI extends existing adaptive quiz components; reusable block display |
| V. Progressive Enhancement | ✅ Pass | P1 stories (core BAT flow) deliverable independently; concept analytics (P2) second |
| VI. Code Quality | ✅ Pass | Block selection algorithm documented; single-responsibility modules |
| VII. Rigorous Testing | ✅ Pass | Unit tests for block selection; integration tests for BAT flow |
| VIII. UX Consistency | ✅ Pass | Uses existing shadcn/ui; block progress follows design system |
| IX. Performance | ✅ Pass | 500ms target; block selection is O(n) on filtered question pool |

## Project Structure

### Documentation (this feature)

```text
specs/018-block-adaptive-testing/
├── spec.md              # Feature specification (created)
├── plan.md              # This file
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
├── contracts/           # Phase 1 output (to be created)
│   └── bat-quiz-api.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Existing structure with BAT extensions

model/
├── quizv2-model.js          # EXTEND: Add batConfig fields (enabled, blockSize=2, totalBlocks=5)
├── attemptv2-model.js       # EXTEND: Add bat subdocument (blocks[], currentBlockIndex, missedConceptTags[])
└── questionv2-model.js      # EXTEND: Add conceptTags[] field (IRT params a, b, c already present)

lib/
├── validations.js           # EXTEND: Add BAT quiz Zod schemas
└── irt/
    ├── index.js             # EXTEND: Export new block selection functions
    ├── probability.js       # EXISTING: 3PL probability function (reuse)
    ├── estimation.js        # EXISTING: EAP θ estimation (reuse for block-level)
    ├── information.js       # EXISTING: Fisher Information (reuse)
    ├── selection.js         # EXISTING: Single question selection (reuse internally)
    ├── block-selection.js   # NEW: Block selection by difficulty band
    └── difficulty-bands.js  # NEW: Difficulty band categorization (Easy/Medium/Hard)

app/actions/
├── adaptive-quiz.js         # EXISTING: Single-question adaptive flow
└── bat-quiz.js              # NEW: Block-based adaptive flow (start, submit block, get results)

app/[locale]/(main)/courses/[id]/quizzes/[quizId]/
└── _components/
    ├── adaptive-quiz-interface.jsx   # EXISTING: Single-question UI
    ├── adaptive-quiz-wrapper.jsx     # EXTEND: Route to BAT or standard adaptive based on config
    ├── bat-quiz-interface.jsx        # NEW: Block-based quiz taking UI (2 questions/screen)
    ├── block-progress-indicator.jsx  # NEW: "Block 3 of 5" progress display
    ├── ability-indicator.jsx         # EXISTING: θ display component (reuse)
    └── bat-results.jsx               # NEW: Results with missed concept tags

app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/
└── _components/
    ├── adaptive-config-form.jsx      # EXTEND: Add BAT mode toggle & validation
    └── concept-gap-analysis.jsx      # NEW: Instructor view of missed concept tags

tests/
├── unit/
│   └── irt/
│       ├── block-selection.test.js   # NEW: Unit tests for block selection
│       └── difficulty-bands.test.js  # NEW: Unit tests for difficulty band logic
└── integration/
    └── bat-quiz.test.js              # NEW: End-to-end BAT flow
```

**Structure Decision**: Extends existing LMS and adaptive testing structure from 016. Block selection logic isolated in `lib/irt/` for testability. BAT-specific Server Actions in separate file to keep adaptive-quiz.js unchanged. UI components colocated with existing quiz components.

## Key Design Decisions

### 1. Block Selection Algorithm

**Approach**: For each block, select 2 questions from the same difficulty band matching current θ.

```
1. Determine target difficulty band based on θ:
   - θ < -1.0 → Easy band (b < -1)
   - -1.0 ≤ θ ≤ 1.0 → Medium band (-1 ≤ b ≤ 1)
   - θ > 1.0 → Hard band (b > 1)

2. Filter pool to target band, excluding already-used questions
3. If <2 questions available in target band, fall back to nearest band
4. Select 2 questions using Maximum Fisher Information within the band
5. Return as Block { questionIds: [q1, q2], difficultyBand, selectionMetrics }
```

### 2. Staged θ Estimation

**Approach**: Reuse existing `estimateAbilityEAP()` but call it only after block submission.

```
Block submitted → 
  responses[] = all answered questions so far (across all blocks)
  { theta, se } = estimateAbilityEAP(responses)
  Store in attempt.bat.thetaHistory[]
  Use new theta for next block selection
```

### 3. Fixed-Length Termination

**Approach**: Terminate after exactly 5 blocks (10 questions). No precision-based early termination.

```
if (attempt.bat.blocks.length === 5 && currentBlock.submitted) {
  terminationReason = "blocks_completed"
  finalize attempt
}
```

### 4. Concept Tag Tracking

**Approach**: On test completion, extract concept tags from incorrectly answered questions.

```
const missedQuestionIds = answers.filter(a => !a.correct).map(a => a.questionId)
const missedQuestions = await Question.find({ _id: { $in: missedQuestionIds } })
const missedConceptTags = [...new Set(missedQuestions.flatMap(q => q.conceptTags || []))]
attempt.bat.missedConceptTags = missedConceptTags
```

### 5. Session Enforcement

**Approach**: Extend existing `activeDeviceId` pattern. On new session, invalidate previous.

```
if (existingAttempt.bat?.activeSessionId && existingAttempt.bat.activeSessionId !== sessionId) {
  // Invalidate old session, preserve progress to last submitted block
  existingAttempt.bat.blocks = existingAttempt.bat.blocks.filter(b => b.submitted)
  existingAttempt.bat.activeSessionId = sessionId
}
```

## Complexity Tracking

> No Constitution violations requiring justification. Feature aligns with all nine principles.

| Consideration | Decision | Rationale |
|--------------|----------|-----------|
| Block selection vs item selection | New module (`block-selection.js`) | Different algorithm (band-based, 2 items); keeps existing `selection.js` unchanged for standard adaptive |
| BAT Server Actions | New file (`bat-quiz.js`) | Different flow (block-level submission); keeps existing `adaptive-quiz.js` untouched |
| Difficulty band logic | Extract to `difficulty-bands.js` | Reusable for pool validation and question categorization |
| Session handling | Extend existing pattern | Same `activeDeviceId` approach works; just invalidate on conflict |

## Dependencies

### Existing (from 016-adaptive-irt-testing)

- `lib/irt/estimation.js` - EAP θ estimation (reuse unchanged)
- `lib/irt/probability.js` - 3PL probability (reuse unchanged)
- `lib/irt/information.js` - Fisher Information (reuse unchanged)
- `model/questionv2-model.js` - IRT params, conceptTags (add `conceptTags` field if missing)
- `model/attemptv2-model.js` - Adaptive attempt tracking (extend with BAT fields)
- `model/quizv2-model.js` - Adaptive config (extend with BAT config)

### New Dependencies

None required. Existing `mathjs` covers numerical needs.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Question pool insufficient for BAT | Medium | High | FR-011 validates 4 questions per band minimum before BAT activation |
| Difficulty bands produce uneven distribution | Medium | Medium | Fallback to nearest band if target band depleted |
| Session conflicts cause data loss | Low | High | Preserve progress to last submitted block on session invalidation |
| θ estimation less precise with fewer updates | Low | Medium | Block-level estimation is mathematically valid; 5 updates still sufficient for convergence |

## API Contract Summary

### Server Actions (app/actions/bat-quiz.js)

| Action | Input | Output | Notes |
|--------|-------|--------|-------|
| `startBatAttempt(quizId, sessionId)` | Quiz ID, session ID | `{ attemptId, currentBlock, blockNumber, theta, abilityLevel }` | Creates attempt or resumes |
| `submitBatBlock(attemptId, blockAnswers, sessionId)` | Attempt ID, `[{questionId, selectedOptionIds}]`, session ID | `{ status, theta, nextBlock?, summary? }` | Returns next block or final results |
| `getBatResult(attemptId)` | Attempt ID | `{ finalTheta, blocks[], missedConceptTags[], summary }` | Full results with concept gaps |

### UI Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `BatQuizInterface` | Main block-based quiz UI | `{ quiz, courseId, initialData, sessionId }` |
| `BlockProgressIndicator` | "Block X of 5" display | `{ currentBlock, totalBlocks }` |
| `BatResults` | Results with concept tag analysis | `{ attemptData, quiz }` |
| `ConceptGapAnalysis` | Instructor view of missed concepts | `{ attemptId, studentId }` |

## Next Steps

1. **Phase 0 - Research**: Validate block selection algorithm with existing question pools
2. **Phase 1 - Design**: Create data models, API contracts, quickstart guide
3. **Phase 2 - Tasks**: Break down into implementable tasks via `/speckit.tasks`
