# Data Model: Adaptive IRT Testing

**Feature**: 016-adaptive-irt-testing  
**Date**: 2026-03-14

## Overview

This feature extends the existing Quiz and Attempt models to support adaptive testing. No new collections are required; all changes are backward-compatible additions.

---

## 1. Quiz Model Extension

**File**: `model/quizv2-model.js`

### New Fields

```javascript
// Add to quizSchema
adaptiveConfig: {
  enabled: { type: Boolean, default: false },
  precisionThreshold: { type: Number, default: 0.30, min: 0.1, max: 1.0 },
  minQuestions: { type: Number, default: 5, min: 1 },
  maxQuestions: { type: Number, default: 30, min: 5 },
  contentBalancing: {
    enabled: { type: Boolean, default: false },
    moduleWeights: [{
      moduleId: { type: Schema.Types.ObjectId, ref: "Module" },
      weight: { type: Number, min: 0, max: 1 }
    }]
  },
  initialTheta: { type: Number, default: 0.0 }
}
```

### Field Descriptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `adaptiveConfig.enabled` | Boolean | false | Enables adaptive testing mode |
| `adaptiveConfig.precisionThreshold` | Number | 0.30 | SE threshold for termination |
| `adaptiveConfig.minQuestions` | Number | 5 | Minimum questions before termination |
| `adaptiveConfig.maxQuestions` | Number | 30 | Maximum questions regardless of SE |
| `adaptiveConfig.contentBalancing.enabled` | Boolean | false | Enable topic balancing |
| `adaptiveConfig.contentBalancing.moduleWeights` | Array | [] | Module ID to weight mapping |
| `adaptiveConfig.initialTheta` | Number | 0.0 | Starting ability estimate |

### Validation Rules

- If `adaptiveConfig.enabled = true`:
  - `minQuestions` ≤ `maxQuestions`
  - Question pool size ≥ 3 × `maxQuestions` (publish-time warning)
  - All questions in pool must have valid IRT parameters

### Indexes

No new indexes required; existing `(courseId, published)` index sufficient.

---

## 2. Attempt Model Extension

**File**: `model/attemptv2-model.js`

### New Fields

```javascript
// Add to attemptSchema
adaptive: {
  enabled: { type: Boolean, default: false },
  currentTheta: { type: Number, default: 0.0 },
  currentSE: { type: Number, default: null },
  thetaHistory: [{
    questionIndex: { type: Number },
    questionId: { type: Schema.Types.ObjectId, ref: "Question" },
    theta: { type: Number },
    se: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }],
  terminationReason: {
    type: String,
    enum: ["precision_achieved", "max_reached", "pool_exhausted", "user_submitted", null],
    default: null
  },
  questionOrder: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  activeDeviceId: { type: String, default: null }
}
```

### Field Descriptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `adaptive.enabled` | Boolean | false | Whether this is an adaptive attempt |
| `adaptive.currentTheta` | Number | 0.0 | Current ability estimate (θ) |
| `adaptive.currentSE` | Number | null | Current standard error |
| `adaptive.thetaHistory` | Array | [] | θ and SE after each response |
| `adaptive.terminationReason` | String | null | Why the quiz ended |
| `adaptive.questionOrder` | Array | [] | Ordered list of presented questions |
| `adaptive.activeDeviceId` | String | null | Device lock for concurrent prevention |

### Theta History Entry

Each entry in `thetaHistory` captures:
- `questionIndex`: 0-based position in the adaptive sequence
- `questionId`: Reference to the answered question
- `theta`: Ability estimate after this response
- `se`: Standard error after this response
- `timestamp`: When the response was recorded

### State Transitions

```
[Start Attempt]
     │
     ▼
┌─────────────┐
│ in_progress │ ◄──── adaptive.enabled = true
│             │       adaptive.currentTheta = initialTheta
│             │       adaptive.activeDeviceId = deviceId
└─────────────┘
     │
     │ [Answer Question] → Update θ, SE, push to history
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Check Termination:                                       │
│   1. questionCount < minQuestions → CONTINUE             │
│   2. SE ≤ precisionThreshold → TERMINATE (precision)     │
│   3. questionCount ≥ maxQuestions → TERMINATE (max)      │
│   4. No more questions → TERMINATE (pool_exhausted)      │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌───────────┐
│ submitted │ ◄──── adaptive.terminationReason set
└───────────┘
```

### Indexes

Add index for concurrent session lookup:

```javascript
attemptSchema.index(
  { quizId: 1, studentId: 1, "adaptive.activeDeviceId": 1 },
  { sparse: true }
);
```

---

## 3. Question Selection Log (Embedded)

For analytics, selection decisions are logged within the attempt's answer entries.

### Extended Answer Schema

```javascript
// Extend existing answerSchema in attemptv2-model.js
selectionMetrics: {
  fisherInformation: { type: Number },
  thetaAtSelection: { type: Number },
  candidateCount: { type: Number },
  selectionReason: { type: String } // "max_info" | "content_balance" | "fallback"
}
```

---

## 4. Zod Validation Schemas

**File**: `lib/validations.js`

### Adaptive Quiz Config Schema

```javascript
const adaptiveConfigSchema = z.object({
  enabled: z.boolean().default(false),
  precisionThreshold: z.number().min(0.1).max(1.0).default(0.30),
  minQuestions: z.number().int().min(1).default(5),
  maxQuestions: z.number().int().min(5).default(30),
  contentBalancing: z.object({
    enabled: z.boolean().default(false),
    moduleWeights: z.array(z.object({
      moduleId: z.string(),
      weight: z.number().min(0).max(1)
    })).default([])
  }).optional(),
  initialTheta: z.number().default(0.0)
}).refine(
  data => data.minQuestions <= data.maxQuestions,
  { message: "minQuestions must be ≤ maxQuestions" }
);
```

### Adaptive Answer Submission Schema

```javascript
const adaptiveAnswerSchema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  selectedOptionIds: z.array(z.string()),
  deviceId: z.string()
});
```

---

## 5. Entity Relationships

```
┌─────────────────────┐
│       Course        │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│        Quiz         │
│  + adaptiveConfig   │ ◄─── Extended
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐       ┌─────────────────────┐
│      Question       │       │       Attempt       │
│  + irt (a, b, c)    │       │  + adaptive.*       │ ◄─── Extended
└─────────────────────┘       └─────────────────────┘
          │                            │
          │                            │
          └────────── N:M ─────────────┘
               (via answers[])
```

---

## 6. Migration Strategy

### No Breaking Changes

All new fields have defaults that preserve existing behavior:
- `adaptiveConfig.enabled: false` → Fixed-form quiz (existing behavior)
- `adaptive.enabled: false` → Standard attempt (existing behavior)

### Backward Compatibility

- Existing quizzes continue to work without modification
- Existing attempts remain valid
- Existing queries unaffected (new fields are optional subdocuments)

### Upgrade Path

1. Deploy schema changes (models auto-update with defaults)
2. No data migration scripts required
3. Instructors can opt-in to adaptive mode per quiz
