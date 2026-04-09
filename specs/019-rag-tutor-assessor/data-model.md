# Data Model: Interactive RAG Tutor & Semantic Assessor

**Feature**: 019-rag-tutor-assessor  
**Date**: 2026-04-07

## Entity Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  OralAssessment │────<│  StudentResponse │     │  TutorInteraction │
│  (checkpoints)  │     │  (attempts)      │     │  (RAG queries)    │
└────────┬────────┘     └──────────────────┘     └─────────┬─────────┘
         │                                                  │
         │ lesson                                           │
         ▼                                                  ▼
┌─────────────────┐                              ┌───────────────────┐
│     Lesson      │                              │ ReciteBackAttempt │
│   (existing)    │                              │  (verification)   │
└─────────────────┘                              └─────────┬─────────┘
                                                           │
                                                           ▼
                                                 ┌───────────────────┐
                                                 │    ConceptGap     │
                                                 │  (learning gaps)  │
                                                 └───────────────────┘
```

## Entity Definitions

### OralAssessment

Represents a system-directed oral question embedded at a specific video timestamp.

**Collection**: `oralassessments`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `lessonId` | ObjectId (ref: Lesson) | ✓ | Parent lesson |
| `courseId` | ObjectId (ref: Course) | ✓ | Parent course (denormalized) |
| `questionText` | String | ✓ | The question prompt shown to student |
| `referenceAnswer` | String | ✓ | Expected answer for semantic comparison |
| `keyConcepts` | [String] | ✓ | Extracted concepts for granular scoring |
| `triggerTimestamp` | Number | ✓ | Video seconds at which to trigger |
| `passingThreshold` | Number | | Minimum similarity score (default: 0.6) |
| `status` | Enum | ✓ | `draft`, `approved`, `rejected` |
| `generatedBy` | Enum | | `gemini`, `manual` |
| `sourceChunkId` | String | | ChromaDB chunk ID if auto-generated |
| `reviewedBy` | ObjectId (ref: User) | | Instructor who approved/rejected |
| `reviewedAt` | Date | | Timestamp of review |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes**:
- `{ lessonId: 1, triggerTimestamp: 1 }` — Query assessments for a lesson ordered by time
- `{ status: 1, lessonId: 1 }` — Filter by approval status
- `{ courseId: 1 }` — Course-level queries

**Validation Rules**:
- `triggerTimestamp` must be >= 0
- `passingThreshold` must be between 0 and 1
- `keyConcepts` array must have at least 1 item
- `questionText` max length 1000 characters
- `referenceAnswer` max length 5000 characters

---

### StudentResponse

Captures a student's oral answer attempt for an assessment.

**Collection**: `studentresponses`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `assessmentId` | ObjectId (ref: OralAssessment) | ✓ | Parent assessment |
| `userId` | ObjectId (ref: User) | ✓ | Student who responded |
| `lessonId` | ObjectId (ref: Lesson) | ✓ | Denormalized for queries |
| `transcription` | String | ✓ | Whisper transcription of audio |
| `similarityScore` | Number | ✓ | 0-1 cosine similarity |
| `conceptsCovered` | [String] | | Concepts addressed |
| `conceptsMissing` | [String] | | Concepts not addressed |
| `passed` | Boolean | ✓ | Score >= threshold |
| `inputMethod` | Enum | ✓ | `voice`, `text` |
| `attemptNumber` | Number | ✓ | 1, 2, 3... for retries |
| `responseTimeMs` | Number | | Time to complete response |
| `createdAt` | Date | auto | |

**Indexes**:
- `{ assessmentId: 1, userId: 1 }` — User's attempts for an assessment
- `{ userId: 1, lessonId: 1 }` — User's responses in a lesson
- `{ lessonId: 1, createdAt: -1 }` — Recent responses in lesson

**Validation Rules**:
- `similarityScore` must be between 0 and 1
- `attemptNumber` must be >= 1
- `transcription` required even for text input (it's the text itself)

**Note**: No `audioUrl` field — audio is deleted after transcription per privacy requirement.

---

### TutorInteraction

Records a student-initiated RAG query and the tutor's response.

**Collection**: `tutorinteractions`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `userId` | ObjectId (ref: User) | ✓ | Student who asked |
| `lessonId` | ObjectId (ref: Lesson) | ✓ | Context lesson |
| `courseId` | ObjectId (ref: Course) | ✓ | Context course |
| `question` | String | ✓ | Transcribed student question |
| `questionInputMethod` | Enum | ✓ | `voice`, `text` |
| `response` | String | ✓ | Tutor's generated answer |
| `isGrounded` | Boolean | ✓ | True if context found |
| `retrievedChunks` | [RetrievedChunk] | | ChromaDB chunks used |
| `timestampLinks` | [TimestampLink] | | Video timestamp references |
| `satisfactionRating` | Number | | Optional 1-5 rating |
| `reciteBackRequired` | Boolean | | Whether recite-back was triggered |
| `createdAt` | Date | auto | |

**Embedded Schema: RetrievedChunk**
```javascript
{
    chunkId: String,
    content: String,       // First 500 chars
    similarity: Number
}
```

**Embedded Schema: TimestampLink**
```javascript
{
    seconds: Number,
    label: String          // Preview text
}
```

**Indexes**:
- `{ userId: 1, lessonId: 1, createdAt: -1 }` — Rate limiting query
- `{ lessonId: 1, createdAt: -1 }` — Lesson activity feed
- `{ courseId: 1 }` — Course-level analytics

**Validation Rules**:
- `question` max length 1000 characters
- `response` max length 10000 characters
- `satisfactionRating` if present, must be 1-5

---

### ReciteBackAttempt

Tracks student attempts to recite back tutor explanations.

**Collection**: `recitebackattempts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `interactionId` | ObjectId (ref: TutorInteraction) | ✓ | Parent tutor interaction |
| `userId` | ObjectId (ref: User) | ✓ | Student |
| `lessonId` | ObjectId (ref: Lesson) | ✓ | Denormalized |
| `originalExplanation` | String | ✓ | Tutor's response being recited |
| `recitation` | String | ✓ | Student's recitation transcription |
| `similarityScore` | Number | ✓ | 0-1 similarity to original |
| `passed` | Boolean | ✓ | Score >= 0.5 (configurable) |
| `attemptNumber` | Number | ✓ | 1, 2, 3 |
| `inputMethod` | Enum | ✓ | `voice`, `text` |
| `createdAt` | Date | auto | |

**Indexes**:
- `{ interactionId: 1, attemptNumber: 1 }` — Attempts for an interaction
- `{ userId: 1, lessonId: 1 }` — User's recite-back history

**Validation Rules**:
- `attemptNumber` must be between 1 and 3 (configurable max)
- `similarityScore` must be between 0 and 1

---

### ConceptGap

Logs concepts a student failed to articulate, flagged for later review.

**Collection**: `conceptgaps`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `userId` | ObjectId (ref: User) | ✓ | Student |
| `lessonId` | ObjectId (ref: Lesson) | ✓ | Source lesson |
| `courseId` | ObjectId (ref: Course) | ✓ | Parent course |
| `concept` | String | ✓ | The concept description |
| `source` | Enum | ✓ | `assessment`, `recite_back` |
| `sourceId` | ObjectId | ✓ | StudentResponse or ReciteBackAttempt ID |
| `failureCount` | Number | ✓ | Times failed to articulate |
| `flaggedForReview` | Boolean | | Shown in session summary |
| `resolvedAt` | Date | | When student demonstrated understanding |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes**:
- `{ userId: 1, lessonId: 1 }` — User's gaps in a lesson
- `{ userId: 1, courseId: 1, flaggedForReview: 1 }` — Unresolved gaps in course
- `{ concept: "text" }` — Text search on concept

**Validation Rules**:
- `concept` max length 500 characters
- `failureCount` must be >= 1

---

## State Transitions

### OralAssessment Status

```
[draft] ──(instructor approves)──> [approved]
   │                                    │
   │                                    └──(instructor revokes)──> [draft]
   │
   └──(instructor rejects)──> [rejected]
                                   │
                                   └──(instructor reconsiders)──> [draft]
```

### StudentResponse Flow

```
[Assessment Triggered]
         │
         ▼
[Recording/Text Input]
         │
         ▼
[Transcription] ──(Whisper)──> [Evaluation] ──(Gemini)──> [Result Displayed]
         │                                                        │
         │                                                        ├── passed=true: Continue
         │                                                        │
         │                                                        └── passed=false: Suggest review
         │
         └── Audio deleted immediately after transcription
```

### TutorInteraction + ReciteBack Flow

```
[Student asks question]
         │
         ▼
[RAG Query] ──(ChromaDB)──> [Response Generated]
         │                           │
         │                           ▼
         │                  [Response Displayed]
         │                           │
         │              ┌────────────┴────────────┐
         │              │                         │
         │    (reciteBack disabled)      (reciteBack enabled)
         │              │                         │
         │              ▼                         ▼
         │        [Resume video]         [Recite-Back Prompt]
         │                                        │
         │                               ┌────────┴────────┐
         │                               │                 │
         │                          [Passed]          [Failed]
         │                               │                 │
         │                               ▼                 ▼
         │                        [Resume]          [Retry or Log Gap]
         │                                                 │
         │                                    (max attempts reached)
         │                                                 │
         │                                                 ▼
         │                                          [ConceptGap created]
         └─────────────────────────────────────────────────┘
```

## Migration Strategy

This feature introduces new collections only. No changes to existing models required.

**Backward Compatibility**: 
- Existing lessons without `OralAssessment` records simply won't trigger assessment checkpoints
- No schema changes to existing `Lesson`, `Question`, or `Quiz` models

**Data Volume Estimates**:
- ~5-10 OralAssessments per lesson
- ~1-3 StudentResponses per user per assessment
- ~5-10 TutorInteractions per user per lesson session
- ~0-2 ReciteBackAttempts per TutorInteraction
- ~0-5 ConceptGaps per user per lesson
