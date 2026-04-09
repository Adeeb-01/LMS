# Data Model: Block-Based Adaptive Testing Engine (BAT)

**Branch**: `018-block-adaptive-testing` | **Date**: 2026-03-30 | **Phase**: 1

## Overview

This document defines the data model extensions required for BAT. All changes are additive to existing models - no breaking changes to current adaptive testing or fixed-form quiz functionality.

## Model Changes Summary

| Model | Change Type | Fields Added |
|-------|-------------|--------------|
| `Quiz` | Extend | `batConfig` subdocument |
| `Attempt` | Extend | `bat` subdocument |
| `Question` | Extend | `conceptTags` array |

---

## Quiz Model Extension

**File**: `model/quizv2-model.js`

### New Fields

```javascript
batConfig: {
  enabled: { 
    type: Boolean, 
    default: false 
  },
  blockSize: { 
    type: Number, 
    default: 2,
    min: 2,
    max: 5,
    immutable: true  // Fixed at 2 for v1
  },
  totalBlocks: { 
    type: Number, 
    default: 5,
    min: 3,
    max: 10,
    immutable: true  // Fixed at 5 for v1
  },
  initialTheta: {
    type: Number,
    default: 0.0  // Standard IRT convention
  }
}
```

### Validation Rules

- `batConfig.enabled` and `adaptiveConfig.enabled` are mutually exclusive
- When `batConfig.enabled = true`, quiz must have ≥12 questions with 4+ per difficulty band

### Schema Snippet

```javascript
// Add to quizSchema after adaptiveConfig
batConfig: {
  enabled: { type: Boolean, default: false },
  blockSize: { type: Number, default: 2, min: 2, max: 5 },
  totalBlocks: { type: Number, default: 5, min: 3, max: 10 },
  initialTheta: { type: Number, default: 0.0 }
}
```

---

## Attempt Model Extension

**File**: `model/attemptv2-model.js`

### New Fields

```javascript
bat: {
  enabled: { type: Boolean, default: false },
  
  currentTheta: { type: Number, default: 0.0 },
  currentSE: { type: Number, default: 1.0 },
  currentBlockIndex: { type: Number, default: 0 },
  
  blocks: [{
    index: { type: Number, required: true },  // 0-4
    difficultyBand: { 
      type: String, 
      enum: ['easy', 'medium', 'hard'],
      required: true 
    },
    questionIds: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Question' 
    }],
    answers: [{
      questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
      selectedOptionIds: [String],
      correct: { type: Boolean, default: false },
      answeredAt: { type: Date, default: Date.now }
    }],
    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
    thetaAfterBlock: { type: Number, default: null },
    seAfterBlock: { type: Number, default: null }
  }],
  
  thetaHistory: [{
    blockIndex: { type: Number },
    theta: { type: Number },
    se: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }],
  
  terminationReason: {
    type: String,
    enum: ['blocks_completed', 'user_abandoned', null],
    default: null
  },
  
  missedConceptTags: [{
    type: String
  }],
  
  activeSessionId: { type: String, default: null }
}
```

### Block Subdocument Schema

```javascript
const batBlockSchema = new Schema({
  index: { type: Number, required: true },
  difficultyBand: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    required: true 
  },
  questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  answers: [{
    questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    selectedOptionIds: [String],
    correct: { type: Boolean, default: false },
    answeredAt: { type: Date, default: Date.now }
  }],
  submitted: { type: Boolean, default: false },
  submittedAt: { type: Date },
  thetaAfterBlock: { type: Number },
  seAfterBlock: { type: Number }
}, { _id: false });
```

### Indexes

```javascript
// Existing indexes remain; add for BAT session lookup
attemptSchema.index(
  { quizId: 1, studentId: 1, 'bat.activeSessionId': 1 },
  { sparse: true }
);
```

---

## Question Model Extension

**File**: `model/questionv2-model.js`

### New Fields

```javascript
conceptTags: {
  type: [String],
  default: [],
  index: true
}
```

### Usage Notes

- `conceptTags` contains learning objective identifiers (e.g., "algebra-linear-equations", "physics-kinematics")
- Tags are instructor-defined or imported from curriculum standards
- Used for diagnostic feedback on missed questions

### Schema Snippet

```javascript
// Add after existing fields
conceptTags: {
  type: [String],
  default: [],
  validate: {
    validator: function(tags) {
      return tags.every(tag => typeof tag === 'string' && tag.length > 0 && tag.length <= 100);
    },
    message: 'Concept tags must be non-empty strings under 100 characters'
  }
}

// Add index
questionSchema.index({ conceptTags: 1 });
```

---

## Zod Validation Schemas

**File**: `lib/validations.js`

### BAT Config Schema

```javascript
export const batConfigSchema = z.object({
  enabled: z.boolean().default(false),
  blockSize: z.number().min(2).max(5).default(2),
  totalBlocks: z.number().min(3).max(10).default(5),
  initialTheta: z.number().min(-4).max(4).default(0.0)
});
```

### Block Answer Schema

```javascript
export const batBlockAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIds: z.array(z.string()).min(1)
});

export const submitBatBlockSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(batBlockAnswerSchema).length(2), // Exactly 2 answers per block
  sessionId: z.string().min(1)
});
```

### Pool Validation Schema

```javascript
export const batPoolValidationSchema = z.object({
  easy: z.number().min(4),
  medium: z.number().min(4),
  hard: z.number().min(4)
});
```

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│      Quiz       │       │    Question     │
├─────────────────┤       ├─────────────────┤
│ _id             │◄──────│ quizId          │
│ courseId        │       │ _id             │
│ adaptiveConfig  │       │ irt { a, b, c } │
│ batConfig ★     │       │ conceptTags ★   │
└─────────────────┘       └─────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────────────────────────────────┐
│                  Attempt                     │
├─────────────────────────────────────────────┤
│ _id                                         │
│ quizId ─────────────────────────────────────┤
│ studentId                                   │
│ status                                      │
│ answers[]                                   │
│ adaptive { ... }  (existing)                │
│ bat ★ {                                     │
│   enabled                                   │
│   currentTheta, currentSE                   │
│   currentBlockIndex                         │
│   blocks[] {                                │
│     index, difficultyBand                   │
│     questionIds[] ──────────────────────────┤
│     answers[] { questionId, correct, ... }  │
│     submitted, thetaAfterBlock              │
│   }                                         │
│   thetaHistory[]                            │
│   missedConceptTags[]                       │
│   activeSessionId                           │
│ }                                           │
└─────────────────────────────────────────────┘

★ = New fields for BAT
```

---

## Data Flow

### Start BAT Attempt

```
1. Client: startBatAttempt(quizId, sessionId)
2. Server: 
   - Load quiz with batConfig
   - Check existing in-progress attempt
   - If exists and different session → invalidate old session
   - Create/update attempt with bat.enabled = true
   - Select first block (2 questions from starting band)
   - Return { attemptId, block, theta: 0.0 }
```

### Submit Block

```
1. Client: submitBatBlock(attemptId, answers[2], sessionId)
2. Server:
   - Validate session matches
   - Validate both answers present
   - Grade each answer (correct/incorrect)
   - Update bat.blocks[currentIndex].answers
   - Mark block as submitted
   - Calculate new θ using all submitted responses
   - Store θ in thetaHistory
   - If currentBlockIndex < 4:
     - Select next block based on new θ
     - Increment currentBlockIndex
     - Return { status: 'continuing', nextBlock, theta }
   - Else:
     - Compute missedConceptTags
     - Set terminationReason = 'blocks_completed'
     - Return { status: 'completed', summary, missedConceptTags }
```

### Get Results

```
1. Client: getBatResult(attemptId)
2. Server:
   - Load attempt with bat subdocument
   - Load questions for review
   - Return {
       finalTheta,
       blocks (with question details),
       missedConceptTags,
       performance summary
     }
```

---

## Migration Notes

### Existing Data

- No migration required for existing quizzes - `batConfig.enabled` defaults to `false`
- No migration required for existing attempts - `bat.enabled` defaults to `false`
- Existing questions get `conceptTags: []` by default

### Backward Compatibility

- Standard quizzes: Unaffected
- Adaptive quizzes (016): Unaffected - separate `adaptiveConfig` and `adaptive` fields
- BAT quizzes: Use new `batConfig` and `bat` fields exclusively

### Future Extensibility

- `blockSize` and `totalBlocks` fields allow future configurability
- Additional difficulty bands can be added by changing enum
- Content balancing can be added to BAT (similar to existing adaptive)
