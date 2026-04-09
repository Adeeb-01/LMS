# API Contract: Adaptive Quiz

**Feature**: 016-adaptive-irt-testing  
**Date**: 2026-03-14

## Overview

This document defines the Server Actions and API routes for adaptive quiz functionality. All actions enforce role-based access control per Constitution Principle I.

---

## 1. Server Actions

### Location: `app/actions/adaptive-quiz.js`

---

### 1.1 `startAdaptiveAttempt`

Start a new adaptive quiz attempt or resume an existing one.

**Signature**:
```javascript
async function startAdaptiveAttempt(quizId, deviceId)
```

**Authorization**: Student (enrolled in course)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `quizId` | string | Yes | Quiz ObjectId |
| `deviceId` | string | Yes | Unique browser session ID (UUID) |

**Returns**:
```javascript
{
  success: true,
  data: {
    attemptId: string,
    currentQuestion: {
      id: string,
      text: string,
      type: "single" | "multi" | "true_false",
      options: [{ id: string, text: string }]
    },
    questionNumber: number,
    currentTheta: number,
    currentSE: number | null,
    abilityLevel: string,  // "Novice" | "Developing" | "Proficient" | "Advanced" | "Expert"
    minQuestions: number,
    maxQuestions: number,
    isResumed: boolean
  }
}
```

**Errors**:
| Code | Condition |
|------|-----------|
| 401 | Not authenticated |
| 403 | Not enrolled in course |
| 404 | Quiz not found or not published |
| 409 | Active session on another device |
| 422 | Quiz is not adaptive-enabled |

**Behavior**:
1. Verify quiz exists, is published, and has `adaptiveConfig.enabled = true`
2. Check for existing in-progress attempt
   - If exists with matching deviceId → resume
   - If exists with different deviceId → return 409
3. If no existing attempt, create new:
   - Set `adaptive.enabled = true`
   - Set `adaptive.currentTheta = quiz.adaptiveConfig.initialTheta`
   - Set `adaptive.activeDeviceId = deviceId`
4. Select first question using Maximum Fisher Information
5. Return question and initial state

---

### 1.2 `submitAdaptiveAnswer`

Submit answer to current question and get next question (or termination).

**Signature**:
```javascript
async function submitAdaptiveAnswer(attemptId, questionId, selectedOptionIds, deviceId)
```

**Authorization**: Student (owner of attempt)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `attemptId` | string | Yes | Attempt ObjectId |
| `questionId` | string | Yes | Current question ObjectId |
| `selectedOptionIds` | string[] | Yes | Selected option IDs |
| `deviceId` | string | Yes | Browser session ID |

**Returns** (continuing):
```javascript
{
  success: true,
  data: {
    status: "continuing",
    answerResult: {
      correct: boolean,
      pointsEarned: number
    },
    newTheta: number,
    newSE: number,
    abilityLevel: string,
    nextQuestion: {
      id: string,
      text: string,
      type: string,
      options: [{ id: string, text: string }]
    },
    questionNumber: number,
    progress: {
      answered: number,
      minQuestions: number,
      maxQuestions: number,
      precisionAchieved: boolean
    }
  }
}
```

**Returns** (terminated):
```javascript
{
  success: true,
  data: {
    status: "terminated",
    answerResult: {
      correct: boolean,
      pointsEarned: number
    },
    finalTheta: number,
    finalSE: number,
    abilityLevel: string,
    terminationReason: "precision_achieved" | "max_reached" | "pool_exhausted",
    summary: {
      totalQuestions: number,
      correctCount: number,
      score: number,
      scorePercent: number,
      passed: boolean,
      confidenceInterval: { lower: number, upper: number }
    }
  }
}
```

**Errors**:
| Code | Condition |
|------|-----------|
| 401 | Not authenticated |
| 403 | Not owner of attempt |
| 404 | Attempt or question not found |
| 409 | Device ID mismatch (session on another device) |
| 410 | Attempt already submitted |
| 422 | Question ID doesn't match current question |

**Behavior**:
1. Verify deviceId matches `adaptive.activeDeviceId`
2. Verify questionId matches last item in `adaptive.questionOrder`
3. Grade the answer (correct/incorrect)
4. Update θ using EAP estimation
5. Calculate new SE
6. Push to `adaptive.thetaHistory`
7. Check termination conditions:
   - If `questionsAnswered < minQuestions` → continue
   - If `SE ≤ precisionThreshold` → terminate (precision_achieved)
   - If `questionsAnswered ≥ maxQuestions` → terminate (max_reached)
   - If no unanswered questions → terminate (pool_exhausted)
8. If continuing, select next question using MFI
9. Return appropriate response

---

### 1.3 `getAdaptiveResult`

Get detailed results for a completed adaptive attempt.

**Signature**:
```javascript
async function getAdaptiveResult(attemptId)
```

**Authorization**: 
- Student (owner) → full results
- Instructor/Admin (course access) → full results

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `attemptId` | string | Yes | Attempt ObjectId |

**Returns**:
```javascript
{
  success: true,
  data: {
    attemptId: string,
    quizId: string,
    quizTitle: string,
    studentId: string,
    completedAt: string,  // ISO date
    finalTheta: number,
    finalSE: number,
    abilityLevel: string,
    abilityPercentile: number,
    confidenceInterval: {
      lower: number,
      upper: number
    },
    terminationReason: string,
    summary: {
      totalQuestions: number,
      correctCount: number,
      score: number,
      scorePercent: number,
      passed: boolean
    },
    thetaProgression: [
      { questionNumber: number, theta: number, se: number }
    ],
    // Only if quiz.showAnswersPolicy allows
    questionReview?: [
      {
        questionId: string,
        text: string,
        yourAnswer: string[],
        correctAnswer: string[],
        isCorrect: boolean,
        explanation?: string,
        irtDifficulty: number
      }
    ]
  }
}
```

**Errors**:
| Code | Condition |
|------|-----------|
| 401 | Not authenticated |
| 403 | Not authorized to view this attempt |
| 404 | Attempt not found |
| 422 | Attempt not yet submitted |

---

## 2. Quiz Configuration Actions

### Location: `app/actions/quizv2.js` (extended)

---

### 2.1 `updateQuizAdaptiveConfig`

Update adaptive testing configuration for a quiz.

**Signature**:
```javascript
async function updateQuizAdaptiveConfig(quizId, adaptiveConfig)
```

**Authorization**: Instructor/Admin (course owner)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `quizId` | string | Yes | Quiz ObjectId |
| `adaptiveConfig` | object | Yes | Adaptive configuration |

**adaptiveConfig Schema**:
```javascript
{
  enabled: boolean,
  precisionThreshold?: number,  // 0.1 - 1.0, default 0.30
  minQuestions?: number,        // ≥1, default 5
  maxQuestions?: number,        // ≥5, default 30
  contentBalancing?: {
    enabled: boolean,
    moduleWeights?: [{ moduleId: string, weight: number }]
  },
  initialTheta?: number         // default 0.0
}
```

**Returns**:
```javascript
{
  success: true,
  data: {
    quizId: string,
    adaptiveConfig: { ... },
    warnings: string[]  // e.g., "Question pool may be insufficient"
  }
}
```

**Errors**:
| Code | Condition |
|------|-----------|
| 401 | Not authenticated |
| 403 | Not course instructor/admin |
| 404 | Quiz not found |
| 422 | Invalid configuration (minQuestions > maxQuestions) |

**Validation Warnings** (non-blocking):
- Question pool < 3× maxQuestions
- Questions missing IRT parameters
- Low question discrimination values (a < 0.5)

---

### 2.2 `getQuizPoolAnalysis`

Analyze question pool for adaptive testing readiness.

**Signature**:
```javascript
async function getQuizPoolAnalysis(quizId)
```

**Authorization**: Instructor/Admin (course owner)

**Returns**:
```javascript
{
  success: true,
  data: {
    totalQuestions: number,
    questionsWithIRT: number,
    questionsWithoutIRT: number,
    difficultyDistribution: {
      veryEasy: number,    // b < -2
      easy: number,        // -2 ≤ b < -1
      medium: number,      // -1 ≤ b < 1
      hard: number,        // 1 ≤ b < 2
      veryHard: number     // b ≥ 2
    },
    discriminationQuality: {
      excellent: number,   // a ≥ 1.5
      good: number,        // 1.0 ≤ a < 1.5
      acceptable: number,  // 0.5 ≤ a < 1.0
      poor: number         // a < 0.5
    },
    recommendations: string[],
    readyForAdaptive: boolean
  }
}
```

---

## 3. Analytics Actions

### Location: `app/actions/adaptive-analytics.js`

---

### 3.1 `getAdaptiveQuizAnalytics`

Get analytics for an adaptive quiz across all attempts.

**Signature**:
```javascript
async function getAdaptiveQuizAnalytics(quizId)
```

**Authorization**: Instructor/Admin (course owner)

**Returns**:
```javascript
{
  success: true,
  data: {
    quizId: string,
    totalAttempts: number,
    completedAttempts: number,
    averageQuestionsToTermination: number,
    averageTestDuration: number,  // seconds
    terminationReasons: {
      precision_achieved: number,
      max_reached: number,
      pool_exhausted: number
    },
    abilityDistribution: {
      mean: number,
      stdDev: number,
      min: number,
      max: number,
      histogram: [{ range: string, count: number }]
    },
    questionUsage: [
      {
        questionId: string,
        text: string,
        timesSelected: number,
        selectionRate: number,
        observedDifficulty: number,
        calibratedDifficulty: number,
        drift: number,
        flaggedForRecalibration: boolean
      }
    ]
  }
}
```

---

## 4. Error Response Format

All errors follow the existing LMS pattern:

```javascript
{
  success: false,
  error: {
    code: string,       // e.g., "SESSION_CONFLICT"
    message: string,    // User-friendly message
    details?: object    // Additional context
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_AUTHENTICATED` | 401 | User not logged in |
| `NOT_AUTHORIZED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `SESSION_CONFLICT` | 409 | Active session on another device |
| `ALREADY_SUBMITTED` | 410 | Attempt already completed |
| `VALIDATION_ERROR` | 422 | Invalid input data |
| `QUIZ_NOT_ADAPTIVE` | 422 | Quiz doesn't have adaptive mode enabled |
| `QUESTION_MISMATCH` | 422 | Submitted question doesn't match current |

---

## 5. Internationalization

All user-facing strings use `next-intl` translation keys:

```javascript
// messages/en.json additions
{
  "adaptive": {
    "abilityLevels": {
      "expert": "Expert",
      "advanced": "Advanced",
      "proficient": "Proficient",
      "developing": "Developing",
      "novice": "Novice"
    },
    "terminationReasons": {
      "precision_achieved": "Assessment complete - ability measured with high confidence",
      "max_reached": "Maximum questions reached",
      "pool_exhausted": "All available questions answered"
    },
    "errors": {
      "sessionConflict": "This quiz is already in progress on another device. Please close that session first.",
      "alreadySubmitted": "This quiz attempt has already been submitted."
    }
  }
}
```
