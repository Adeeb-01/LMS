# API Contract: MCQ Generation

**Feature**: 015-auto-mcq-generation  
**Date**: 2026-03-12

## Overview

Server Actions and API routes for automatic MCQ generation from lecture content.

## Server Actions

Located in `app/actions/mcq-generation.js`

### triggerGeneration

Initiates MCQ generation for a lesson's indexed lecture content.

**Signature**:
```javascript
async function triggerGeneration(lessonId, quizId)
```

**Authorization**: Course owner/primary instructor only

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lessonId | string | yes | Target lesson ID |
| quizId | string | yes | Target quiz ID for generated questions |

**Output**:
```javascript
// Success
{ ok: true, jobId: "507f1f77bcf86cd799439011" }

// Error
{ ok: false, error: "Lesson has no indexed content" }
{ ok: false, error: "Generation already in progress" }
{ ok: false, error: "Unauthorized" }
```

**Behavior**:
1. Verify user is course owner for the lesson's course
2. Check lesson has indexed lecture document
3. Check no pending/processing job exists for this lesson
4. Create GenerationJob with status 'pending'
5. Trigger background processor via internal fetch
6. Return job ID for polling

---

### getGenerationStatus

Get current status of a generation job.

**Signature**:
```javascript
async function getGenerationStatus(jobId)
```

**Authorization**: Course owner/instructor who triggered the job

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| jobId | string | yes | Generation job ID |

**Output**:
```javascript
{
  ok: true,
  job: {
    id: "507f1f77bcf86cd799439011",
    status: "processing",
    progress: {
      chunksTotal: 25,
      chunksProcessed: 12,
      questionsGenerated: 28,
      questionsFlagged: 2,
      percentComplete: 48
    },
    startedAt: "2026-03-12T10:30:00Z",
    completedAt: null
  }
}
```

---

### cancelGeneration

Cancel an in-progress generation job.

**Signature**:
```javascript
async function cancelGeneration(jobId)
```

**Authorization**: Course owner or user who triggered the job

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| jobId | string | yes | Generation job ID |

**Output**:
```javascript
{ ok: true }
{ ok: false, error: "Job already completed" }
```

---

### activateGeneratedQuestions

Move generated questions from draft to active status.

**Signature**:
```javascript
async function activateGeneratedQuestions(questionIds)
```

**Authorization**: Course owner/primary instructor

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| questionIds | string[] | yes | Array of question IDs to activate |

**Output**:
```javascript
{ ok: true, activatedCount: 15 }
{ ok: false, error: "Some questions not found" }
```

---

### deleteGeneratedQuestions

Delete draft generated questions.

**Signature**:
```javascript
async function deleteGeneratedQuestions(questionIds)
```

**Authorization**: Course owner/primary instructor

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| questionIds | string[] | yes | Array of question IDs to delete |

**Output**:
```javascript
{ ok: true, deletedCount: 5 }
```

---

### regenerateForChunk

Regenerate questions for a specific chunk.

**Signature**:
```javascript
async function regenerateForChunk(lessonId, quizId, chunkId)
```

**Authorization**: Course owner/primary instructor

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lessonId | string | yes | Lesson ID |
| quizId | string | yes | Target quiz ID |
| chunkId | string | yes | ChromaDB chunk ID to regenerate from |

**Output**:
```javascript
{ ok: true, jobId: "507f1f77bcf86cd799439012" }
```

---

## API Routes

### POST /api/mcq-generation

Trigger MCQ generation (webhook for background processing).

**Internal use only** - called by Server Action to start background job.

**Request**:
```javascript
{
  jobId: "507f1f77bcf86cd799439011"
}
```

**Response**:
```javascript
{ started: true }
```

---

### GET /api/mcq-generation/[jobId]

Poll for job status (client-side polling).

**Authorization**: Authenticated user with access to course

**Response**:
```javascript
{
  job: {
    id: "507f1f77bcf86cd799439011",
    status: "processing",
    progress: {
      chunksTotal: 25,
      chunksProcessed: 12,
      questionsGenerated: 28,
      questionsFlagged: 2,
      percentComplete: 48
    },
    chunkErrors: [],
    startedAt: "2026-03-12T10:30:00Z",
    completedAt: null
  }
}
```

**Status Codes**:
- 200: Success
- 401: Unauthorized
- 404: Job not found

---

### POST /api/mcq-generation/job/[jobId]/process

Internal endpoint for job processor (not externally accessible).

Called by the queue processor to process chunks for a job.

---

## Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| NO_INDEXED_CONTENT | Lesson has no indexed lecture content | 400 |
| GENERATION_IN_PROGRESS | Generation already running for this lesson | 409 |
| JOB_NOT_FOUND | Generation job not found | 404 |
| UNAUTHORIZED | User not authorized for this course | 403 |
| GEMINI_ERROR | Failed to generate questions from Gemini | 500 |
| CHUNK_ERROR | Error processing specific chunk | 500 |

## Rate Limits

- Maximum 5 concurrent generation jobs system-wide
- 1 generation job per lesson at a time
- Gemini API calls throttled to 1 per second per job

## Webhook Events (Future)

For integration with external systems:

```javascript
// Job completed
{
  event: "mcq_generation.completed",
  jobId: "507f1f77bcf86cd799439011",
  lessonId: "...",
  questionsGenerated: 28,
  questionsFlagged: 2
}

// Job failed
{
  event: "mcq_generation.failed",
  jobId: "507f1f77bcf86cd799439011",
  error: "Too many chunk failures"
}
```
