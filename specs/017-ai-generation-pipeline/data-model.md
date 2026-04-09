# Data Model: AI Generation & Vectorization Pipeline

**Feature**: 017-ai-generation-pipeline  
**Date**: 2026-03-16

## Entities

### PipelineJob (New)

Orchestrates the end-to-end processing workflow for a lesson.

**Schema**:
```javascript
const pipelineJobSchema = new Schema({
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
  triggeredBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Overall pipeline status
  status: { 
    type: String, 
    enum: ['pending', 'extracting', 'aligning', 'indexing', 'generating', 'completed', 'failed', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  
  // References to child jobs
  extractionJobId: { type: Schema.Types.ObjectId, ref: 'LectureDocument' },
  alignmentJobId: { type: Schema.Types.ObjectId, ref: 'AlignmentJob' },
  indexingJobId: { type: Schema.Types.ObjectId, ref: 'IndexingJob' },
  mcqGenerationJobId: { type: Schema.Types.ObjectId, ref: 'GenerationJob' },
  oralGenerationJobId: { type: Schema.Types.ObjectId, ref: 'OralGenerationJob' },
  
  // Stage statuses for dashboard display
  stages: {
    extraction: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String
    },
    alignment: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String,
      confidence: Number // Average alignment confidence
    },
    indexing: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String,
      chunksIndexed: Number
    },
    mcqGeneration: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String,
      questionsGenerated: Number,
      questionsFlagged: Number
    },
    oralGeneration: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String,
      questionsGenerated: Number,
      questionsFlagged: Number
    }
  },
  
  // Summary statistics
  summary: {
    totalChunks: Number,
    mcqsGenerated: Number,
    oralQuestionsGenerated: Number,
    averageAlignmentConfidence: Number,
    processingTimeMs: Number
  },
  
  // Notification tracking
  notificationSent: { type: Boolean, default: false },
  
  startedAt: Date,
  completedAt: Date
}, { 
  timestamps: true,
  collection: 'pipelinejobs'
});

// Indexes
pipelineJobSchema.index({ status: 1, createdAt: 1 });
pipelineJobSchema.index({ lessonId: 1, status: 1 });
pipelineJobSchema.index({ courseId: 1, createdAt: -1 });
```

**Validation Rules**:
- `lessonId` must reference an existing Lesson
- `courseId` must match the Lesson's course
- `triggeredBy` must be the course owner (enforced at action level)

**State Transitions**:
```
pending → extracting → aligning → indexing → generating → completed
    ↓          ↓           ↓          ↓           ↓
 cancelled   failed      failed     failed      failed
                                                  ↑
                                              (partial success allowed)
```

---

### OralGenerationJob (New)

Tracks the oral question generation process for a lesson.

**Schema**:
```javascript
const oralGenerationJobSchema = new Schema({
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
  pipelineJobId: {
    type: Schema.Types.ObjectId,
    ref: 'PipelineJob'
  },
  triggeredBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  
  // Progress tracking
  chunksTotal: { type: Number, default: 0 },
  chunksProcessed: { type: Number, default: 0 },
  chunksSkipped: { type: Number, default: 0 },
  questionsGenerated: { type: Number, default: 0 },
  questionsFlagged: { type: Number, default: 0 }, // Potential duplicates
  
  // Error tracking
  chunkErrors: [{
    chunkId: { type: String, required: true },
    error: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  errorMessage: String,
  retryCount: { type: Number, default: 0 },
  
  startedAt: Date,
  completedAt: Date
}, { 
  timestamps: true,
  collection: 'oralgenerationjobs'
});

// Indexes
oralGenerationJobSchema.index({ status: 1, createdAt: 1 });
oralGenerationJobSchema.index({ pipelineJobId: 1 });
```

**Validation Rules**:
- Mirrors GenerationJob (MCQ) structure for consistency
- `chunksSkipped` tracks chunks under 100 words

---

### Question (Extended)

Extends existing Question schema with oral question support.

**New/Modified Fields**:
```javascript
// Add to existing questionSchema (model/questionv2-model.js)

type: {
  type: String,
  enum: ['single', 'multiple', 'text', 'oral'],
  required: true
},

// For oral questions only
referenceAnswer: {
  keyPoints: [{ type: String }],
  requiredTerminology: [{ type: String }],
  acceptableVariations: [{ type: String }],
  gradingCriteria: { type: String },
  sampleResponse: { type: String }
},

// Shared generation metadata (MCQ and Oral)
generatedBy: {
  type: String,
  enum: ['manual', 'gemini'],
  default: 'manual'
},
sourceChunkId: { type: String },  // ChromaDB chunk reference
difficultyReasoning: { type: String },
bloomLevel: { type: String },    // For MCQ
cognitiveLevel: { type: String }, // For Oral (application/analysis/synthesis/evaluation)
generationJobId: { type: Schema.Types.ObjectId }, // MCQ or Oral job
oralGenerationJobId: { type: Schema.Types.ObjectId, ref: 'OralGenerationJob' },
isDraft: { type: Boolean, default: false },
duplicateOf: { type: Schema.Types.ObjectId, ref: 'Question' }, // Flagged duplicate

// IRT parameters (from spec 009)
irt: {
  a: { type: Number, default: 1.0 },
  b: { type: Number, default: 0.0 },
  c: { type: Number, default: 0.0 }
}
```

**Validation Rules**:
- If `type === 'oral'`, `referenceAnswer.keyPoints` must have at least 1 item
- If `generatedBy === 'gemini'`, `sourceChunkId` should be present
- `duplicateOf` present only when flagged for instructor review

---

### Notification (Existing - Usage Pattern)

Use existing notification system for pipeline completion.

**Pipeline Completion Notification**:
```javascript
{
  userId: triggeredBy,
  type: 'pipeline_complete',
  title: 'Content Processing Complete',
  message: `Generated ${mcqCount} MCQs and ${oralCount} oral questions for "${lessonTitle}"`,
  metadata: {
    lessonId,
    courseId,
    pipelineJobId,
    summary: {
      mcqsGenerated,
      oralQuestionsGenerated,
      processingTimeMs
    }
  },
  read: false,
  createdAt: Date
}
```

## Entity Relationships

```
Course (1) ─────────────────────────────── (*) PipelineJob
   │                                              │
   └──── (1) Lesson (1) ────────────────── (0..1) │
              │                                    │
              ├── (0..1) LectureDocument ─────────┤
              ├── (0..1) AlignmentJob ────────────┤
              ├── (0..1) IndexingJob ─────────────┤
              ├── (0..1) GenerationJob (MCQ) ─────┤
              └── (0..1) OralGenerationJob ───────┘
                              │
                              └──── (*) Question (type: 'oral')
                                        │
                                        └── referenceAnswer: { keyPoints, ... }
```

## Index Strategy

| Collection | Index | Purpose |
|------------|-------|---------|
| pipelinejobs | `{ status, createdAt }` | Queue processing |
| pipelinejobs | `{ lessonId, status }` | Lesson status lookup |
| pipelinejobs | `{ courseId, createdAt }` | Course history |
| oralgenerationjobs | `{ status, createdAt }` | Queue processing |
| oralgenerationjobs | `{ pipelineJobId }` | Parent job lookup |
| questions | `{ quizId, type }` | Filter by question type |
| questions | `{ sourceChunkId }` | Timestamp lookup |

## Migration Notes

1. **Question schema extension**: Add new fields as optional with defaults; no migration required for existing questions.
2. **New collections**: `pipelinejobs` and `oralgenerationjobs` are new; no migration needed.
3. **Backward compatibility**: Existing MCQ generation continues to work independently; PipelineJob orchestration is additive.
