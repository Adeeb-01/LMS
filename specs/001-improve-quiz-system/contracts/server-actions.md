# Server Actions Contract: Quiz System

**Feature**: 001-improve-quiz-system  
**Date**: 2026-03-05

## Overview

All quiz operations use Next.js Server Actions located in `app/actions/quizv2.js` and `app/actions/quizProgressv2.js`. No REST API changes required.

## Existing Actions (No Changes)

### `startOrResumeAttempt(quizId: string)`

Starts a new attempt or resumes an existing in-progress attempt.

**Authorization**: Authenticated student enrolled in course, or instructor/admin

**Request**:
```typescript
quizId: string  // MongoDB ObjectId as string
```

**Response**:
```typescript
{
  ok: true,
  attemptId: string,
  resumed: boolean  // true if resuming existing attempt
}
// OR
{
  ok: false,
  error: string
}
```

**Error Cases**:
- `"Unauthorized"` - Not logged in
- `"Quiz not found"` - Invalid quizId
- `"Quiz not available"` - Quiz not published (students only)
- `"You must be enrolled in this course"` - Student not enrolled
- `"Maximum attempts reached"` - Exceeded maxAttempts
- `"Previous attempt expired and maximum attempts reached"` - Edge case

---

### `autosaveAttempt(attemptId: string, answers: Record<string, string[]>)`

Saves current answers without submitting.

**Authorization**: Student who owns the attempt

**Request**:
```typescript
attemptId: string
answers: {
  [questionId: string]: string[]  // selectedOptionIds
}
```

**Response**:
```typescript
{ ok: true }
// OR
{ ok: false, error: string }
```

**Error Cases**:
- `"Unauthorized"` - Not logged in or not attempt owner
- `"Attempt not found"` - Invalid attemptId
- `"Attempt already submitted"` - Can't save after submit

---

### `submitAttempt(attemptId: string, answers: Record<string, string[]>)`

Submits attempt for grading.

**Authorization**: Student who owns the attempt

**Request**:
```typescript
attemptId: string
answers: {
  [questionId: string]: string[]
}
```

**Response**:
```typescript
{
  ok: true,
  attempt: {
    _id: string,
    quizId: string,
    studentId: string,
    status: "submitted",
    score: number,
    scorePercent: number,
    passed: boolean,
    submittedAt: string  // ISO8601
    // ... other attempt fields
  }
}
// OR
{ ok: false, error: string }
```

**Error Cases**:
- `"Unauthorized"` - Not logged in or not attempt owner
- `"Attempt not found"` - Invalid attemptId
- `"Attempt already submitted"` - Already submitted
- `"Time limit exceeded"` - Expired (sets status to "expired")
- `"Quiz not found"` - Quiz deleted
- `"Quiz has no questions"` - Empty quiz

---

### `getAttemptResult(attemptId: string)`

Gets attempt details for results display.

**Authorization**: Student who owns attempt, OR instructor who owns course, OR admin

**Request**:
```typescript
attemptId: string
```

**Response**:
```typescript
{
  ok: true,
  attempt: {
    _id: string,
    quizId: {
      _id: string,
      title: string,
      passPercent: number,
      showAnswersPolicy: "never" | "after_submit" | "after_pass",
      courseId: string
    },
    status: "submitted" | "expired",
    answers: Array<{ questionId: string, selectedOptionIds: string[] }>,
    score: number,
    scorePercent: number,
    passed: boolean,
    startedAt: string,
    submittedAt: string
  }
}
// OR
{ ok: false, error: string }
```

---

## New/Enhanced Actions

### `getQuizResultWithReview(attemptId: string)` (NEW)

Gets attempt result with question details for answer review, respecting `showAnswersPolicy`.

**Authorization**: Student who owns attempt, OR instructor who owns course, OR admin

**Location**: `app/actions/quizv2.js`

**Request**:
```typescript
attemptId: string
```

**Response**:
```typescript
{
  ok: true,
  result: {
    attempt: {
      _id: string,
      score: number,
      scorePercent: number,
      passed: boolean,
      submittedAt: string
    },
    quiz: {
      _id: string,
      title: string,
      passPercent: number,
      showAnswersPolicy: "never" | "after_submit" | "after_pass"
    },
    // Only included if showAnswersPolicy allows
    review?: {
      questions: Array<{
        _id: string,
        text: string,
        type: "single" | "multi" | "true_false",
        options: Array<{ id: string, text: string }>,
        points: number,
        studentAnswer: string[],          // What student selected
        correctAnswer?: string[],         // Only if policy allows
        isCorrect: boolean,
        explanation?: string              // Only if policy allows
      }>
    },
    // Attempt history for this quiz
    attemptHistory: Array<{
      _id: string,
      scorePercent: number,
      passed: boolean,
      submittedAt: string
    }>
  }
}
// OR
{ ok: false, error: string }
```

**Policy Enforcement**:
- `showAnswersPolicy: "never"` → `review` is `undefined`
- `showAnswersPolicy: "after_submit"` → `review` includes `correctAnswer` and `explanation`
- `showAnswersPolicy: "after_pass"` AND `passed: false` → `review.correctAnswer` and `review.explanation` are `undefined`
- `showAnswersPolicy: "after_pass"` AND `passed: true` → Full `review` included

---

### `checkCertificateEligibility(courseId: string)` (NEW)

Checks if student can download certificate (all required quizzes passed).

**Authorization**: Authenticated student enrolled in course

**Location**: `app/actions/quizProgressv2.js`

**Request**:
```typescript
courseId: string
```

**Response**:
```typescript
{
  ok: true,
  eligible: boolean,
  reason?: string,  // If not eligible
  pendingQuizzes?: Array<{
    quizId: string,
    title: string,
    status: "not_started" | "in_progress" | "failed"
  }>
}
// OR
{ ok: false, error: string }
```

---

### `getCourseQuizProgress(courseId: string)` (NEW)

Gets quiz completion status for course progress display.

**Authorization**: Authenticated student enrolled in course

**Location**: `app/actions/quizProgressv2.js`

**Request**:
```typescript
courseId: string
```

**Response**:
```typescript
{
  ok: true,
  quizzes: Array<{
    quizId: string,
    title: string,
    required: boolean,
    status: "not_started" | "in_progress" | "passed" | "failed",
    bestScore?: number,
    attemptsUsed: number,
    maxAttempts: number | null
  }>
}
// OR
{ ok: false, error: string }
```

---

## API Route (Existing)

### `GET /api/quizv2/attempts/[attemptId]`

Used by client to fetch attempt details (for timer restoration).

**Authorization**: Student who owns attempt

**Response**: Same as `getAttemptResult` action

---

## Client-Side Interface (localStorage)

### `lib/quiz-storage.js` (NEW)

```typescript
interface QuizStorageAPI {
  // Save answers to localStorage
  saveAnswers(attemptId: string, data: LocalQuizState): void;
  
  // Load answers from localStorage
  loadAnswers(attemptId: string): LocalQuizState | null;
  
  // Clear answers for an attempt
  clearAnswers(attemptId: string): void;
  
  // Clean up stale entries (>24h old)
  cleanupStale(): void;
  
  // Check if localStorage has newer answers than server
  hasNewerAnswers(attemptId: string, serverTimestamp: string): boolean;
}
```

---

## Error Handling

All actions return `{ ok: false, error: string }` on failure. Client should:

1. Display user-friendly error message via toast
2. For `"Unauthorized"`, redirect to login
3. For `"Time limit exceeded"`, redirect to results page
4. For `"Maximum attempts reached"`, show attempts exhausted message

---

## Rate Limiting

No explicit rate limiting for quiz actions. Autosave is debounced client-side (30s interval).
