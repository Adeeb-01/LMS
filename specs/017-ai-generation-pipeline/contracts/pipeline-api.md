# API Contract: Pipeline Orchestration

**Feature**: 017-ai-generation-pipeline  
**Date**: 2026-03-16

## Server Actions

### `triggerPipeline`

Initiates the full AI generation pipeline for a lesson.

**Location**: `app/actions/pipeline.js`

**Signature**:
```javascript
async function triggerPipeline(lessonId: string): Promise<{
  success: boolean;
  pipelineJobId?: string;
  error?: string;
}>
```

**Authorization**: Course owner only (FR-006a)

**Behavior**:
1. Validates user is course owner
2. Cancels any existing pending/processing pipeline for this lesson
3. Creates new PipelineJob with status 'pending'
4. Triggers extraction stage (if document exists)
5. Returns pipeline job ID for status polling

**Error Codes**:
| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | User is not course owner |
| `LESSON_NOT_FOUND` | Invalid lesson ID |
| `NO_CONTENT` | Lesson has no video or document |
| `QUEUE_FULL` | 5 concurrent pipelines already running |

---

### `triggerOralGeneration`

Manually triggers oral question generation for a lesson with indexed content.

**Location**: `app/actions/oral-generation.js`

**Signature**:
```javascript
async function triggerOralGeneration(lessonId: string): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}>
```

**Authorization**: Course owner only

**Behavior**:
1. Validates user is course owner
2. Checks lesson has indexed content in ChromaDB
3. Cancels any existing pending/processing oral generation job
4. Creates new OralGenerationJob
5. Schedules background processing

---

### `retryPipelineStage`

Retries a specific failed stage in the pipeline.

**Location**: `app/actions/pipeline.js`

**Signature**:
```javascript
async function retryPipelineStage(
  pipelineJobId: string, 
  stage: 'extraction' | 'alignment' | 'indexing' | 'mcqGeneration' | 'oralGeneration'
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Authorization**: Course owner only (FR-005)

**Behavior**:
1. Validates pipeline job exists and user owns the course
2. Validates the specified stage is in 'failed' status
3. Resets stage status to 'pending'
4. Triggers stage processing

---

## API Routes

### `GET /api/pipeline/[lessonId]/status`

Returns unified pipeline status for a lesson.

**Response**:
```typescript
{
  hasPipeline: boolean;
  pipeline?: {
    id: string;
    status: 'pending' | 'extracting' | 'aligning' | 'indexing' | 'generating' | 'completed' | 'failed' | 'cancelled';
    stages: {
      extraction: StageStatus;
      alignment: StageStatus;
      indexing: StageStatus;
      mcqGeneration: StageStatus;
      oralGeneration: StageStatus;
    };
    summary?: {
      totalChunks: number;
      mcqsGenerated: number;
      oralQuestionsGenerated: number;
      averageAlignmentConfidence: number;
      processingTimeMs: number;
    };
    startedAt: string;       // ISO date
    completedAt?: string;    // ISO date
  };
}

interface StageStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  // Stage-specific fields
  chunksIndexed?: number;      // indexing stage
  questionsGenerated?: number; // generation stages
  questionsFlagged?: number;   // generation stages
  confidence?: number;         // alignment stage
}
```

**Authorization**: Course instructor or enrolled student (read-only)

**Polling Pattern**:
- Client polls every 2-5 seconds while status is active
- Stop polling when status is 'completed', 'failed', or 'cancelled'

---

### `GET /api/oral-generation/[jobId]`

Returns oral generation job progress.

**Response**:
```typescript
{
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    chunksTotal: number;
    chunksProcessed: number;
    chunksSkipped: number;
    questionsGenerated: number;
    questionsFlagged: number;
  };
  errors: Array<{
    chunkId: string;
    error: string;
    timestamp: string;
  }>;
  startedAt?: string;
  completedAt?: string;
}
```

**Authorization**: Course owner only

---

### `POST /api/oral-generation`

Triggers oral question generation (alternative to Server Action).

**Request**:
```typescript
{
  lessonId: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  jobId?: string;
  error?: string;
}
```

**Authorization**: Course owner only

---

## Zod Schemas

### Pipeline Trigger Input

```javascript
// lib/validations.js

export const triggerPipelineSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required')
});

export const retryPipelineStageSchema = z.object({
  pipelineJobId: z.string().min(1, 'Pipeline job ID is required'),
  stage: z.enum(['extraction', 'alignment', 'indexing', 'mcqGeneration', 'oralGeneration'])
});

export const triggerOralGenerationSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required')
});
```

### Reference Answer Schema

```javascript
export const referenceAnswerSchema = z.object({
  keyPoints: z.array(z.string()).min(1, 'At least one key point required'),
  requiredTerminology: z.array(z.string()).optional().default([]),
  acceptableVariations: z.array(z.string()).optional().default([]),
  gradingCriteria: z.string().optional(),
  sampleResponse: z.string().optional()
});

export const oralQuestionSchema = z.object({
  text: z.string().min(10, 'Question must be at least 10 characters'),
  cognitiveLevel: z.enum(['application', 'analysis', 'synthesis', 'evaluation']),
  referenceAnswer: referenceAnswerSchema,
  difficulty: z.object({
    bValue: z.number().min(-3).max(3),
    reasoning: z.string()
  }),
  estimatedResponseTime: z.string().optional()
});
```

## Error Handling

All endpoints return errors in consistent format:

```typescript
{
  success: false;
  error: string;       // Human-readable message
  code?: string;       // Machine-readable code
  details?: object;    // Additional context
}
```

**HTTP Status Codes**:
| Code | Usage |
|------|-------|
| 200 | Success |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized (not course owner) |
| 404 | Resource not found |
| 429 | Queue full (5 concurrent pipelines) |
| 500 | Server error |

## Rate Limiting

- Pipeline triggers: Max 5 concurrent system-wide (FR-006b)
- Individual Gemini calls: 1 second delay between chunks
- Polling endpoints: No rate limit (stateless reads)
