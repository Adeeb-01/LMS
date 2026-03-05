# Data Model: Quiz System Improvements

**Feature**: 001-improve-quiz-system  
**Date**: 2026-03-05

## Entity Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Quiz     │────<│  Question   │     │   Report    │
│             │     │             │     │ (progress)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       │
       ▼                                       │
┌─────────────┐                               │
│   Attempt   │───────────────────────────────┘
│             │
└─────────────┘
```

## Existing Models (No Changes Required)

### Quiz (`model/quizv2-model.js`)

| Field | Type | Description | Used By Feature |
|-------|------|-------------|-----------------|
| `_id` | ObjectId | Primary key | All |
| `courseId` | ObjectId (ref: Course) | Parent course | US3: Progress integration |
| `lessonId` | ObjectId (ref: Lesson) | Optional lesson association | US3: Progress integration |
| `title` | String | Quiz title | Display |
| `description` | String | Quiz description | Display |
| `published` | Boolean | Is quiz visible to students | Access control |
| `required` | Boolean | Must pass for course completion | US3: Certificate blocking |
| `passPercent` | Number (0-100) | Minimum score to pass | US2: Results display |
| `timeLimitSec` | Number | Time limit in seconds (null = untimed) | US1: Timer |
| `maxAttempts` | Number | Max attempts allowed (null = unlimited) | Retry logic |
| `shuffleQuestions` | Boolean | Randomize question order | Quiz taking |
| `shuffleOptions` | Boolean | Randomize option order | Quiz taking |
| `showAnswersPolicy` | Enum | "never" / "after_submit" / "after_pass" | US2: Results review |
| `createdBy` | ObjectId (ref: User) | Creator | Access control |

**Indexes** (existing):
- `{ courseId: 1, published: 1 }`
- `{ lessonId: 1 }`
- `{ courseId: 1, lessonId: 1 }`

### Question (`model/questionv2-model.js`)

| Field | Type | Description | Used By Feature |
|-------|------|-------------|-----------------|
| `_id` | ObjectId | Primary key | All |
| `quizId` | ObjectId (ref: Quiz) | Parent quiz | All |
| `type` | Enum | "single" / "multi" / "true_false" | Quiz taking, US4: Navigator |
| `text` | String | Question text | Display |
| `options` | Array<{id, text}> | Answer options | Quiz taking |
| `correctOptionIds` | Array<String> | Correct option IDs | US2: Results review |
| `explanation` | String | Explanation shown in review | US2: Results review |
| `points` | Number | Points for correct answer | Grading, US4: Navigator |
| `order` | Number | Display order | Quiz taking |

**Indexes** (existing):
- `{ quizId: 1, order: 1 }`

### Attempt (`model/attemptv2-model.js`)

| Field | Type | Description | Used By Feature |
|-------|------|-------------|-----------------|
| `_id` | ObjectId | Primary key | All |
| `quizId` | ObjectId (ref: Quiz) | Quiz being attempted | All |
| `studentId` | ObjectId (ref: User) | Student taking quiz | Access control |
| `status` | Enum | "in_progress" / "submitted" / "expired" | US1: Timer, all |
| `startedAt` | Date | When attempt began | US1: Timer |
| `expiresAt` | Date | When attempt expires (null = untimed) | US1: Timer (key field) |
| `submittedAt` | Date | When submitted (null if not submitted) | US2: Results |
| `answers` | Array<{questionId, selectedOptionIds}> | Student's answers | US1: Autosave, US2: Review |
| `score` | Number | Points earned | US2: Results |
| `scorePercent` | Number | Percentage score | US2: Results |
| `passed` | Boolean | Did student pass | US2: Results, US3: Progress |

**Indexes** (existing):
- `{ quizId: 1, studentId: 1, submittedAt: -1 }`
- `{ studentId: 1, submittedAt: -1 }`
- Partial unique: `{ quizId: 1, studentId: 1 }` where `status: "in_progress"` (enforces single active attempt)

### Report (`model/report-model.js`)

| Field | Type | Description | Used By Feature |
|-------|------|-------------|-----------------|
| `_id` | ObjectId | Primary key | - |
| `course` | ObjectId (ref: Course) | Course being tracked | US3 |
| `student` | ObjectId (ref: User) | Student | US3 |
| `totalCompletedLessons` | Array<ObjectId> | Completed lesson IDs | US3 |
| `totalCompletedModules` | Array<ObjectId> | Completed module IDs | US3 |
| `passedQuizIds` | Array<ObjectId> | Passed quiz IDs | US3: Certificate blocking |
| `latestQuizAttemptByQuiz` | Map<String, String> | Quiz ID → Attempt ID | US2: Results history |
| `completion_date` | Date | When course completed | US3: Certificate |

## Client-Side Storage (New)

### localStorage Schema

**Key**: `quiz_answers_${attemptId}`

**Value Structure**:
```typescript
interface LocalQuizState {
  answers: Record<string, string[]>;  // questionId → selectedOptionIds
  lastSaved: string;                   // ISO8601 timestamp
  quizId: string;
  attemptId: string;
  expiresAt: string | null;            // ISO8601 timestamp
}
```

**Lifecycle**:
1. Created when quiz attempt starts
2. Updated on every answer change (debounced)
3. Synced to server every 30 seconds
4. Deleted on successful submission or expiration
5. Stale entries (>24h) cleaned on page load

**Size Estimate**:
- 50 questions × ~100 bytes per answer = ~5KB per quiz
- Well under localStorage 5MB limit

## State Transitions

### Attempt Status

```
                    ┌──────────────┐
                    │              │
     startQuiz      │  in_progress │
    ───────────────►│              │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌─────────────────┐       ┌─────────────────┐
    │                 │       │                 │
    │    submitted    │       │     expired     │
    │                 │       │                 │
    └─────────────────┘       └─────────────────┘
```

**Transition Rules**:
- `in_progress` → `submitted`: Manual submit OR auto-submit when timer expires (with answers)
- `in_progress` → `expired`: Timer expires without submission (rare - auto-submit should prevent)
- Once `submitted` or `expired`, status is final

## Validation Rules

### Quiz Creation/Update (via `quizSchema`)
- `title`: Required, non-empty string
- `passPercent`: 0-100 integer
- `timeLimitSec`: Positive integer or null
- `maxAttempts`: Positive integer or null
- `showAnswersPolicy`: Must be one of enum values

### Question Creation/Update (via `questionSchema`)
- `text`: Required, non-empty string
- `options`: Array with at least 2 items
- `correctOptionIds`: Non-empty array, all IDs must exist in options
- `points`: Non-negative integer

### Answer Submission
- All `questionId` values must belong to the quiz
- All `selectedOptionIds` must be valid option IDs for that question
- Attempt must be `in_progress` status
- Current time must be before `expiresAt` (if set)

## Relationships

| From | To | Cardinality | Description |
|------|-----|-------------|-------------|
| Quiz | Course | N:1 | Quiz belongs to one course |
| Quiz | Lesson | N:1 (optional) | Quiz may be attached to a lesson |
| Quiz | Question | 1:N | Quiz has many questions |
| Quiz | Attempt | 1:N | Quiz has many attempts |
| Attempt | User | N:1 | Attempt belongs to one student |
| Report | Course | N:1 | Report tracks one course |
| Report | User | N:1 | Report belongs to one student |
| Report | Quiz | N:M | Report tracks multiple passed quizzes |

## Migration Notes

No schema migrations required. All new functionality uses existing fields:
- Timer uses existing `expiresAt` field
- Results use existing `showAnswersPolicy`, `score`, `passed` fields
- Progress uses existing `passedQuizIds` in Report model
- Navigation uses existing `answers` array in Attempt model
