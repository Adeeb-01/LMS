# API Contract: Block-Based Adaptive Testing (BAT)

**Branch**: `018-block-adaptive-testing` | **Version**: 1.0 | **Date**: 2026-03-30

## Overview

This document defines the API contracts for BAT Server Actions. All actions are implemented as Next.js Server Actions in `app/actions/bat-quiz.js`.

---

## Server Actions

### 1. `startBatAttempt`

Start a new BAT quiz attempt or resume an existing one.

#### Signature

```typescript
startBatAttempt(quizId: string, sessionId: string): Promise<BatStartResponse>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `quizId` | `string` | Yes | MongoDB ObjectId of the quiz |
| `sessionId` | `string` | Yes | Unique session identifier (UUID recommended) |

#### Response

```typescript
interface BatStartResponse {
  success: boolean;
  data?: {
    attemptId: string;
    currentBlock: {
      index: number;              // 0-4
      questions: Question[];      // Exactly 2 questions
      difficultyBand: 'easy' | 'medium' | 'hard';
    };
    blockNumber: number;          // 1-5 (human-readable)
    totalBlocks: number;          // Always 5
    theta: number;                // Current ability estimate
    abilityLevel: string;         // "Novice" | "Developing" | "Proficient" | "Advanced" | "Expert"
    isResumed: boolean;           // True if resuming existing attempt
  };
  error?: {
    code: string;
    message: string;
  };
}

interface Question {
  id: string;
  text: string;
  type: 'single' | 'multi' | 'true_false';
  options: { id: string; text: string; }[];
  points: number;
}
```

#### Error Codes

| Code | HTTP Equivalent | Description |
|------|-----------------|-------------|
| `NOT_AUTHENTICATED` | 401 | User not logged in |
| `QUIZ_NOT_FOUND` | 404 | Quiz doesn't exist or not published |
| `BAT_NOT_ENABLED` | 400 | Quiz doesn't have BAT mode enabled |
| `NOT_ENROLLED` | 403 | User not enrolled in the course |
| `INSUFFICIENT_QUESTIONS` | 500 | Question pool too small for block selection |

#### Example

```javascript
// Client call
const sessionId = crypto.randomUUID();
const result = await startBatAttempt(quizId, sessionId);

if (result.success) {
  console.log(`Block ${result.data.blockNumber} of ${result.data.totalBlocks}`);
  console.log(`Questions:`, result.data.currentBlock.questions);
}
```

---

### 2. `submitBatBlock`

Submit answers for the current block and receive the next block or final results.

#### Signature

```typescript
submitBatBlock(
  attemptId: string, 
  answers: BlockAnswer[], 
  sessionId: string
): Promise<BatSubmitResponse>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `attemptId` | `string` | Yes | MongoDB ObjectId of the attempt |
| `answers` | `BlockAnswer[]` | Yes | Exactly 2 answer objects |
| `sessionId` | `string` | Yes | Session ID from `startBatAttempt` |

```typescript
interface BlockAnswer {
  questionId: string;           // Question ID from the block
  selectedOptionIds: string[];  // Array of selected option IDs
}
```

#### Response

```typescript
interface BatSubmitResponse {
  success: boolean;
  data?: BatContinuingResponse | BatCompletedResponse;
  error?: {
    code: string;
    message: string;
  };
}

// When more blocks remain
interface BatContinuingResponse {
  status: 'continuing';
  answerResults: { correct: boolean; }[];  // 2 results
  newTheta: number;
  newSE: number;
  abilityLevel: string;
  nextBlock: {
    index: number;
    questions: Question[];
    difficultyBand: 'easy' | 'medium' | 'hard';
  };
  blockNumber: number;
  totalBlocks: number;
}

// When all 5 blocks complete
interface BatCompletedResponse {
  status: 'completed';
  finalTheta: number;
  finalSE: number;
  abilityLevel: string;
  terminationReason: 'blocks_completed';
  summary: {
    totalQuestions: 10;
    correctCount: number;
    scorePercent: number;
    passed: boolean;
    missedConceptTags: string[];
  };
}
```

#### Error Codes

| Code | HTTP Equivalent | Description |
|------|-----------------|-------------|
| `NOT_AUTHENTICATED` | 401 | User not logged in |
| `ATTEMPT_NOT_FOUND` | 404 | Attempt doesn't exist |
| `NOT_AUTHORIZED` | 403 | Attempt belongs to different user |
| `ATTEMPT_COMPLETED` | 400 | Attempt already submitted |
| `SESSION_MISMATCH` | 403 | Session ID doesn't match active session |
| `BLOCK_ALREADY_SUBMITTED` | 400 | Current block already submitted |
| `INVALID_ANSWER_COUNT` | 400 | Not exactly 2 answers provided |
| `QUESTION_NOT_FOUND` | 400 | Answer references invalid question |

#### Example

```javascript
// Client call
const answers = [
  { questionId: 'q1', selectedOptionIds: ['opt_a'] },
  { questionId: 'q2', selectedOptionIds: ['opt_c', 'opt_d'] }
];

const result = await submitBatBlock(attemptId, answers, sessionId);

if (result.data.status === 'completed') {
  console.log(`Final score: ${result.data.summary.scorePercent}%`);
  console.log(`Missed concepts:`, result.data.summary.missedConceptTags);
} else {
  console.log(`Next block:`, result.data.nextBlock);
}
```

---

### 3. `getBatResult`

Retrieve detailed results for a completed BAT attempt.

#### Signature

```typescript
getBatResult(attemptId: string): Promise<BatResultResponse>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `attemptId` | `string` | Yes | MongoDB ObjectId of the attempt |

#### Response

```typescript
interface BatResultResponse {
  success: boolean;
  data?: {
    attemptId: string;
    quizId: string;
    quizTitle: string;
    studentId: string;
    completedAt: string;              // ISO 8601 timestamp
    
    // Ability metrics
    finalTheta: number;
    finalSE: number;
    abilityLevel: string;
    abilityPercentile: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    
    // Performance summary
    summary: {
      totalQuestions: 10;
      correctCount: number;
      scorePercent: number;
      passed: boolean;
    };
    
    // Diagnostic data
    missedConceptTags: string[];
    
    // Block-by-block breakdown
    blocks: BlockResult[];
    
    // θ progression
    thetaProgression: {
      blockNumber: number;
      theta: number;
      se: number;
    }[];
    
    // Question review (if policy allows)
    questionReview?: QuestionReviewItem[];
  };
  error?: {
    code: string;
    message: string;
  };
}

interface BlockResult {
  index: number;
  difficultyBand: 'easy' | 'medium' | 'hard';
  correctCount: number;             // 0, 1, or 2
  thetaAfterBlock: number;
}

interface QuestionReviewItem {
  questionId: string;
  blockIndex: number;
  text: string;
  yourAnswer: string[];
  correctAnswer: string[];
  isCorrect: boolean;
  explanation?: string;
  conceptTags: string[];
}
```

#### Error Codes

| Code | HTTP Equivalent | Description |
|------|-----------------|-------------|
| `NOT_AUTHENTICATED` | 401 | User not logged in |
| `ATTEMPT_NOT_FOUND` | 404 | Attempt doesn't exist |
| `NOT_AUTHORIZED` | 403 | User doesn't have access to this attempt |
| `ATTEMPT_NOT_COMPLETED` | 400 | Attempt still in progress |

---

## Instructor Actions

### 4. `validateBatPool`

Validate that a quiz's question pool meets BAT requirements.

#### Signature

```typescript
validateBatPool(quizId: string): Promise<BatPoolValidationResponse>
```

#### Response

```typescript
interface BatPoolValidationResponse {
  success: boolean;
  data?: {
    valid: boolean;
    totalQuestions: number;
    bands: {
      easy: number;
      medium: number;
      hard: number;
    };
    minRequired: number;            // 4
    failures: string[];             // e.g., ["Easy: 2/4", "Hard: 3/4"]
  };
  error?: {
    code: string;
    message: string;
  };
}
```

---

### 5. `getConceptGapAnalysis`

Get aggregated concept gap analysis for a quiz or course.

#### Signature

```typescript
getConceptGapAnalysis(
  quizId: string, 
  options?: { studentId?: string }
): Promise<ConceptGapResponse>
```

#### Response

```typescript
interface ConceptGapResponse {
  success: boolean;
  data?: {
    quizId: string;
    quizTitle: string;
    totalAttempts: number;
    conceptGaps: {
      tag: string;
      missCount: number;
      percentage: number;          // % of attempts that missed this
    }[];
    // If studentId provided, individual student data
    studentData?: {
      studentId: string;
      attemptCount: number;
      missedConceptTags: string[];
    };
  };
}
```

---

## Zod Schemas

```typescript
// lib/validations.js

import { z } from 'zod';

export const batConfigSchema = z.object({
  enabled: z.boolean().default(false),
  blockSize: z.number().min(2).max(5).default(2),
  totalBlocks: z.number().min(3).max(10).default(5),
  initialTheta: z.number().min(-4).max(4).default(0.0)
});

export const blockAnswerSchema = z.object({
  questionId: z.string().min(1, "Question ID required"),
  selectedOptionIds: z.array(z.string()).min(1, "At least one option required")
});

export const submitBatBlockSchema = z.object({
  attemptId: z.string().min(1, "Attempt ID required"),
  answers: z.array(blockAnswerSchema).length(2, "Exactly 2 answers required"),
  sessionId: z.string().min(1, "Session ID required")
});
```

---

## Rate Limiting

| Action | Limit | Window |
|--------|-------|--------|
| `startBatAttempt` | 10 | 1 minute |
| `submitBatBlock` | 30 | 1 minute |
| `getBatResult` | 60 | 1 minute |

---

## Versioning

This API follows semantic versioning within the `bat` namespace:

- **v1.0**: Initial release with fixed 2-question blocks, 5-block tests
- **v1.1** (planned): Configurable block sizes
- **v2.0** (planned): Variable test lengths based on precision threshold
