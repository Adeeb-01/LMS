# Data Model: Automatic MCQ Generation

**Feature**: 015-auto-mcq-generation  
**Date**: 2026-03-12

## Entity Relationship Diagram

```text
┌─────────────────┐       1:1        ┌──────────────────┐
│ LectureDocument │─────────────────▶│  GenerationJob   │
│   (existing)    │                  │     (new)        │
└─────────────────┘                  └──────────────────┘
        │                                     │
        │ indexed content                     │ creates
        ▼                                     ▼
┌─────────────────┐                  ┌──────────────────┐
│  TextChunk      │                  │    Question      │
│ (in ChromaDB)   │                  │   (extended)     │
└─────────────────┘                  └──────────────────┘
        │                                     │
        │ source reference                    │ belongs to
        └─────────────────────────────────────▶
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │      Quiz        │
                                     │   (existing)     │
                                     └──────────────────┘
```

## Entities

### GenerationJob (NEW)

Tracks the MCQ generation process for a lesson's lecture content.

**Collection**: `generationjobs`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `lessonId` | ObjectId | yes | Reference to Lesson |
| `courseId` | ObjectId | yes | Reference to Course (for authorization) |
| `quizId` | ObjectId | yes | Target quiz for generated questions |
| `lectureDocumentId` | ObjectId | yes | Source document |
| `triggeredBy` | ObjectId | yes | User who triggered generation |
| `status` | String | yes | Job status enum |
| `chunksTotal` | Number | no | Total chunks to process |
| `chunksProcessed` | Number | no | Chunks processed so far |
| `questionsGenerated` | Number | no | Questions successfully created |
| `questionsFlagged` | Number | no | Questions flagged as duplicates |
| `chunkErrors` | Array | no | Chunks that failed with error details |
| `errorMessage` | String | no | Job-level error if failed |
| `startedAt` | Date | no | Processing start timestamp |
| `completedAt` | Date | no | Processing completion timestamp |
| `createdAt` | Date | auto | Job creation timestamp |
| `updatedAt` | Date | auto | Last modified timestamp |

**Status enum values**: `pending`, `processing`, `completed`, `failed`, `cancelled`

**Indexes**:
- `{ lessonId: 1 }` - for lookup by lesson
- `{ status: 1, createdAt: 1 }` - for job queue polling
- `{ courseId: 1, status: 1 }` - for course-scoped status queries
- `{ triggeredBy: 1 }` - for user's job history

### Question (EXTENDED - existing)

Add generation metadata to existing Question model.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `generatedBy` | String | no | Source: 'manual' or 'gemini' |
| `sourceChunkId` | String | no | ChromaDB chunk ID for source linking |
| `difficultyReasoning` | String | no | Explanation of b-value estimate |
| `isDraft` | Boolean | no | Draft status (not visible to students) |
| `generationJobId` | ObjectId | no | Reference to GenerationJob |
| `duplicateOf` | ObjectId | no | If flagged, reference to similar question |
| `irtParams.a` | Number | no | Discrimination parameter (default 1.0) |
| `irtParams.b` | Number | no | Difficulty parameter (default 0.0) |
| `irtParams.c` | Number | no | Guessing parameter (default 0.0) |

**Note**: IRT params may already exist from spec 009. If so, reuse existing fields.

**New Index**:
- `{ generationJobId: 1 }` - for fetching questions by generation job

## Mongoose Schemas

### GenerationJob Schema

```javascript
import mongoose, { Schema } from "mongoose";

const chunkErrorSchema = new Schema({
  chunkId: { type: String, required: true },
  error: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const generationJobSchema = new Schema({
  lessonId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Lesson', 
    required: true,
    index: true
  },
  courseId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    index: true 
  },
  quizId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Quiz', 
    required: true 
  },
  lectureDocumentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'LectureDocument', 
    required: true 
  },
  triggeredBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  chunksTotal: { type: Number, default: 0 },
  chunksProcessed: { type: Number, default: 0 },
  questionsGenerated: { type: Number, default: 0 },
  questionsFlagged: { type: Number, default: 0 },
  chunkErrors: { type: [chunkErrorSchema], default: [] },
  errorMessage: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date }
}, { 
  timestamps: true,
  collection: 'generationjobs'
});

// Compound indexes
generationJobSchema.index({ status: 1, createdAt: 1 });
generationJobSchema.index({ courseId: 1, status: 1 });

export const GenerationJob = mongoose.models.GenerationJob ?? 
  mongoose.model("GenerationJob", generationJobSchema);
```

### Question Schema Extension

```javascript
// Add to existing questionSchema in model/questionv2-model.js

generatedBy: {
  type: String,
  enum: ['manual', 'gemini'],
  default: 'manual'
},
sourceChunkId: {
  type: String,
  default: null
},
difficultyReasoning: {
  type: String,
  default: ''
},
isDraft: {
  type: Boolean,
  default: false,
  index: true
},
generationJobId: {
  type: Schema.Types.ObjectId,
  ref: 'GenerationJob',
  default: null,
  index: true
},
duplicateOf: {
  type: Schema.Types.ObjectId,
  ref: 'Question',
  default: null
},
irtParams: {
  a: { type: Number, default: 1.0, min: 0.01 },
  b: { type: Number, default: 0.0 },
  c: { type: Number, default: 0.0, min: 0, max: 1 }
}
```

## Zod Validation Schemas

### Generation Trigger Schema

```javascript
import { z } from 'zod';

export const triggerGenerationSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  quizId: z.string().min(1, 'Quiz ID is required'),
  // Optional: regenerate specific chunks
  chunkIds: z.array(z.string()).optional()
}).strict();
```

### Generation Job Status Schema

```javascript
export const generationJobStatusSchema = z.object({
  jobId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  progress: z.object({
    chunksTotal: z.number().int().min(0),
    chunksProcessed: z.number().int().min(0),
    questionsGenerated: z.number().int().min(0),
    questionsFlagged: z.number().int().min(0),
    percentComplete: z.number().min(0).max(100)
  }),
  errors: z.array(z.object({
    chunkId: z.string(),
    error: z.string()
  })).optional(),
  completedAt: z.string().datetime().optional()
});
```

### Generated Question Schema (from Gemini)

```javascript
export const generatedQuestionSchema = z.object({
  text: z.string().min(10, 'Question text too short'),
  options: z.array(z.object({
    id: z.string(),
    text: z.string().min(1)
  })).min(4).max(5),
  correctOptionId: z.string(),
  explanation: z.string(),
  difficulty: z.object({
    bValue: z.number().min(-3).max(3),
    bloomLevel: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']),
    reasoning: z.string()
  })
});

export const geminiResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema),
  skipped: z.boolean(),
  skipReason: z.string().nullable()
});
```

## State Transitions

### GenerationJob State Machine

```text
                    ┌─────────────┐
         trigger ──▶│   pending   │
                    └──────┬──────┘
                           │ processor picks up
                           ▼
                    ┌─────────────┐
          ┌─────────│ processing  │─────────┐
          │         └──────┬──────┘         │
          │                │                │
          │ re-upload      │ success        │ error (>50% chunks)
          │ cancels        │ (all chunks)   │
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │  cancelled  │  │  completed  │  │   failed    │
   └─────────────┘  └─────────────┘  └─────────────┘
```

### Question Draft State

```text
                    ┌─────────────┐
      generated ───▶│   draft     │
                    │ (isDraft=t) │
                    └──────┬──────┘
                           │ instructor activates
                           ▼
                    ┌─────────────┐
                    │   active    │
                    │ (isDraft=f) │
                    └──────┬──────┘
                           │ instructor deletes
                           ▼
                    ┌─────────────┐
                    │  (deleted)  │
                    └─────────────┘
```

## Cascade Rules

- When **GenerationJob** is deleted → Questions with `generationJobId` keep reference (orphan-safe)
- When **LectureDocument** is re-uploaded during processing → Cancel in-progress GenerationJob
- When **Quiz** is deleted → Associated Questions deleted (existing cascade)
- When **Lesson** is deleted → Cascade to Quiz → Cascade to Questions

## Migration Notes

1. **Question model extension**: Add new optional fields with defaults - no data migration needed for existing questions
2. **GenerationJob collection**: New collection, no migration needed
3. **IRT params**: If spec 009 already added these, reuse existing fields. If not, add with defaults.
4. **Index creation**: Add new indexes on existing Question collection for `isDraft` and `generationJobId`
