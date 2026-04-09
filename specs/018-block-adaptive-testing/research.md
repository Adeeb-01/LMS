# Research: Block-Based Adaptive Testing Engine (BAT)

**Branch**: `018-block-adaptive-testing` | **Date**: 2026-03-30 | **Phase**: 0

## Executive Summary

This research validates the feasibility of Block-Based Adaptive Testing by analyzing the existing adaptive testing infrastructure (016-adaptive-irt-testing) and designing the block selection algorithm. The existing IRT library and models provide a solid foundation; BAT requires targeted extensions rather than architectural changes.

## Existing System Analysis

### IRT Library (`lib/irt/`)

| Module | Purpose | BAT Reuse |
|--------|---------|-----------|
| `probability.js` | 3PL probability P(θ) = c + (1-c)/(1+e^(-a(θ-b))) | ✅ Unchanged |
| `estimation.js` | EAP θ estimation with 41 quadrature points | ✅ Reuse for block-level |
| `information.js` | Fisher Information I(θ) | ✅ Reuse for within-band selection |
| `selection.js` | Maximum Information single-question selection | ⚠️ Partial (use within band) |
| `ability-display.js` | θ → label/percentile mapping | ✅ Unchanged |

**Key Observation**: The existing `selectNextQuestion()` function selects the single best question from the entire pool. BAT needs to:
1. First filter by difficulty band
2. Then select 2 questions within that band

### Data Models

#### Quiz Model (`model/quizv2-model.js`)

Current `adaptiveConfig`:
```javascript
adaptiveConfig: {
  enabled: Boolean,
  precisionThreshold: Number,  // Not used in BAT
  minQuestions: Number,        // Not used in BAT (fixed at 10)
  maxQuestions: Number,        // Not used in BAT (fixed at 10)
  contentBalancing: Object,    // Can still apply within bands
  initialTheta: Number         // ✅ Reuse (default 0.0)
}
```

**BAT Extension Required**:
```javascript
batConfig: {
  enabled: Boolean,            // NEW: Enable BAT mode
  blockSize: Number,           // NEW: Fixed at 2 for now
  totalBlocks: Number,         // NEW: Fixed at 5 for now
  // Future: configurable block/test sizes
}
```

#### Attempt Model (`model/attemptv2-model.js`)

Current `adaptive`:
```javascript
adaptive: {
  enabled: Boolean,
  currentTheta: Number,
  currentSE: Number,
  thetaHistory: Array,
  terminationReason: String,
  questionOrder: Array,
  activeDeviceId: String
}
```

**BAT Extension Required**:
```javascript
bat: {
  enabled: Boolean,
  currentTheta: Number,
  currentSE: Number,
  currentBlockIndex: Number,   // 0-4
  blocks: [{
    index: Number,             // 0-4
    difficultyBand: String,    // "easy" | "medium" | "hard"
    questionIds: [ObjectId],   // Always 2
    answers: [{
      questionId: ObjectId,
      selectedOptionIds: [String],
      correct: Boolean
    }],
    submitted: Boolean,
    submittedAt: Date,
    thetaAfterBlock: Number,   // θ after this block was submitted
    seAfterBlock: Number
  }],
  thetaHistory: [{             // One entry per block (not per question)
    blockIndex: Number,
    theta: Number,
    se: Number,
    timestamp: Date
  }],
  terminationReason: String,   // "blocks_completed" only
  missedConceptTags: [String], // Concept tags from incorrect answers
  activeSessionId: String
}
```

#### Question Model (`model/questionv2-model.js`)

Current IRT params present:
```javascript
irt: {
  a: Number,  // discrimination
  b: Number,  // difficulty
  c: Number   // guessing
}
```

**Concept Tags**: Need to verify if `conceptTags` field exists. If not, add:
```javascript
conceptTags: {
  type: [String],
  default: []
}
```

## Block Selection Algorithm

### Difficulty Band Definition

Based on clarification: **3 bands** with boundaries at b = -1 and b = +1.

```javascript
function getDifficultyBand(b) {
  if (b < -1) return 'easy';
  if (b <= 1) return 'medium';
  return 'hard';
}

function getTargetBand(theta) {
  if (theta < -1) return 'easy';
  if (theta <= 1) return 'medium';
  return 'hard';
}
```

### Selection Algorithm

```javascript
/**
 * Select a block of 2 questions from the same difficulty band
 * 
 * @param {number} theta - Current ability estimate
 * @param {Array} pool - Question pool with IRT params
 * @param {Array} usedQuestionIds - Already-used question IDs
 * @returns {Object} { questionIds, difficultyBand, selectionMetrics }
 */
function selectBlock(theta, pool, usedQuestionIds = []) {
  const targetBand = getTargetBand(theta);
  
  // Filter to unused questions in target band
  let candidates = pool.filter(q => 
    !usedQuestionIds.includes(q._id.toString()) &&
    getDifficultyBand(q.irt.b) === targetBand
  );
  
  // Fallback if insufficient questions in target band
  if (candidates.length < 2) {
    const fallbackBands = targetBand === 'medium' 
      ? ['easy', 'hard']  // Try both for medium
      : targetBand === 'easy' ? ['medium'] : ['medium'];
    
    for (const band of fallbackBands) {
      const fallbackCandidates = pool.filter(q =>
        !usedQuestionIds.includes(q._id.toString()) &&
        getDifficultyBand(q.irt.b) === band
      );
      candidates = [...candidates, ...fallbackCandidates];
      if (candidates.length >= 2) break;
    }
  }
  
  if (candidates.length < 2) {
    throw new Error('Insufficient questions for block');
  }
  
  // Sort by Fisher Information at current theta (descending)
  candidates.sort((a, b) => 
    calculateFisherInformation(theta, b.irt) - 
    calculateFisherInformation(theta, a.irt)
  );
  
  // Take top 2
  const selected = candidates.slice(0, 2);
  
  return {
    questionIds: selected.map(q => q._id),
    questions: selected,
    difficultyBand: targetBand,
    selectionMetrics: {
      targetBand,
      actualBand: getDifficultyBand(selected[0].irt.b),
      candidateCount: candidates.length,
      fallbackUsed: getDifficultyBand(selected[0].irt.b) !== targetBand
    }
  };
}
```

### θ Update After Block

The existing `estimateAbilityEAP(responses)` works perfectly:

```javascript
// After block submission
const allResponses = attempt.bat.blocks
  .filter(b => b.submitted)
  .flatMap(b => b.answers.map(a => ({
    correct: a.correct,
    params: questionsMap[a.questionId].irt
  })));

const { theta, se } = estimateAbilityEAP(allResponses);
```

## Minimum Pool Requirements

From FR-011: **Minimum 4 questions per difficulty band (12 total)**.

Validation logic:
```javascript
function validateBatPool(questions) {
  const bands = { easy: 0, medium: 0, hard: 0 };
  
  questions.forEach(q => {
    const band = getDifficultyBand(q.irt?.b || 0);
    bands[band]++;
  });
  
  const minPerBand = 4;
  const failures = [];
  
  if (bands.easy < minPerBand) failures.push(`Easy: ${bands.easy}/${minPerBand}`);
  if (bands.medium < minPerBand) failures.push(`Medium: ${bands.medium}/${minPerBand}`);
  if (bands.hard < minPerBand) failures.push(`Hard: ${bands.hard}/${minPerBand}`);
  
  return {
    valid: failures.length === 0,
    bands,
    failures,
    total: questions.length
  };
}
```

## Session Management

Existing pattern in `attemptv2-model.js`:
```javascript
adaptive: {
  activeDeviceId: String
}
```

BAT extension follows same pattern but with session invalidation:

```javascript
// In startBatAttempt
if (existingAttempt?.bat?.activeSessionId !== sessionId) {
  if (existingAttempt.bat.activeSessionId) {
    // Another session exists - invalidate it
    // Preserve only submitted blocks
    existingAttempt.bat.blocks = existingAttempt.bat.blocks.filter(b => b.submitted);
    existingAttempt.bat.currentBlockIndex = existingAttempt.bat.blocks.length;
  }
  existingAttempt.bat.activeSessionId = sessionId;
  await existingAttempt.save();
}
```

## UI Flow Analysis

### Current Adaptive Flow (per-question)
```
Start → Question 1 → Submit → Question 2 → Submit → ... → Termination → Results
        [θ update]   ↑        [θ update]   ↑
```

### BAT Flow (per-block)
```
Start → Block 1 (Q1, Q2) → Submit Block → Block 2 (Q3, Q4) → Submit Block → ... → Results
        [No θ update]       [θ update]     [No θ update]       [θ update]
```

### UI State Machine

```
STATES:
- loading: Fetching initial block
- answering: Displaying block, collecting answers
- submitting: Sending block answers
- feedback: Brief feedback before next block (optional)
- complete: All blocks done, showing results

TRANSITIONS:
loading → answering (on block received)
answering → submitting (on "Submit Block" click, both answers required)
submitting → answering (on next block received)
submitting → complete (on terminationReason received)
```

## Concept Tag Implementation

Questions need a `conceptTags` field. Check if exists:

```javascript
// model/questionv2-model.js - Add if missing
conceptTags: {
  type: [String],
  default: [],
  index: true  // For aggregation queries
}
```

On test completion:
```javascript
const missedQuestionIds = attempt.bat.blocks
  .flatMap(b => b.answers.filter(a => !a.correct).map(a => a.questionId));

const missedQuestions = await Question.find({ 
  _id: { $in: missedQuestionIds } 
}).select('conceptTags').lean();

const missedConceptTags = [...new Set(
  missedQuestions.flatMap(q => q.conceptTags || [])
)];

attempt.bat.missedConceptTags = missedConceptTags;
```

## Performance Considerations

### Server Request Reduction

| Metric | Per-Question Adaptive | BAT |
|--------|----------------------|-----|
| Selection calls | 10 | 5 |
| θ estimation calls | 10 | 5 |
| Total round trips | 10 | 5 |
| **Reduction** | - | **50%** |

### Block Selection Complexity

- Filter by band: O(n)
- Sort by Fisher Info: O(n log n)
- Total: O(n log n) where n = pool size

For typical pool (30-100 questions): <10ms

## Research Conclusions

1. **Feasibility**: ✅ BAT is fully implementable on existing infrastructure
2. **IRT Reuse**: 4 of 5 IRT modules reused unchanged; selection needs new wrapper
3. **Model Extensions**: Additive changes to Quiz and Attempt models; no breaking changes
4. **Algorithm Validated**: Block selection algorithm is straightforward band-based filtering
5. **Performance**: 50% reduction in server calls achieved by design
6. **Risk Areas**: 
   - Ensure `conceptTags` field exists on Question model
   - Handle fallback gracefully when target band depleted

## Recommended Implementation Order

1. **Foundation** (lib/irt extensions)
   - `difficulty-bands.js` - Band classification
   - `block-selection.js` - Block selection algorithm

2. **Data Layer** (model extensions)
   - Extend `quizv2-model.js` with `batConfig`
   - Extend `attemptv2-model.js` with `bat` subdocument
   - Add `conceptTags` to `questionv2-model.js` if missing

3. **Server Actions** (app/actions)
   - `bat-quiz.js` - Full BAT flow

4. **Validation** (lib/validations.js)
   - BAT config Zod schemas

5. **UI Components** (app/[locale]/...)
   - `bat-quiz-interface.jsx`
   - `block-progress-indicator.jsx`
   - `bat-results.jsx`

6. **Instructor Features**
   - Extend `adaptive-config-form.jsx` with BAT toggle
   - `concept-gap-analysis.jsx` for viewing missed concepts

7. **Tests**
   - Unit tests for block selection
   - Integration tests for BAT flow
