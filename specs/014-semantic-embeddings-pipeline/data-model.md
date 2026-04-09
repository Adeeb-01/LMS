# Data Model: Semantic Embeddings Pipeline

**Feature**: 014-semantic-embeddings-pipeline  
**Date**: 2026-03-12

## Entity Relationship Diagram

```text
┌─────────────────┐       1:1        ┌──────────────────┐
│ LectureDocument │─────────────────▶│   IndexingJob    │
│   (existing)    │                  │     (new)        │
└─────────────────┘                  └──────────────────┘
        │                                     │
        │ content source                      │ tracks processing
        ▼                                     ▼
┌─────────────────┐                  ┌──────────────────┐
│  TextChunk      │                  │  ChunkEmbedding  │
│  (transient)    │                  │  (in ChromaDB)   │
└─────────────────┘                  └──────────────────┘
                                              │
                                              │ queried by
                                              ▼
                                     ┌──────────────────┐
                                     │  SemanticQuery   │
                                     │   (transient)    │
                                     └──────────────────┘
```

## Entities

### IndexingJob (NEW)

Tracks the processing state of a document through the embedding pipeline.

**Collection**: `indexingjobs`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `lectureDocumentId` | ObjectId | yes | Reference to LectureDocument |
| `courseId` | ObjectId | yes | Reference to Course (for filtering) |
| `lessonId` | ObjectId | yes | Reference to Lesson (for metadata) |
| `status` | String | yes | Processing status enum |
| `chunksTotal` | Number | no | Total chunks to process |
| `chunksProcessed` | Number | no | Chunks successfully embedded |
| `errorMessage` | String | no | Error details if failed |
| `retryCount` | Number | yes | Number of retry attempts (default 0) |
| `startedAt` | Date | no | Processing start timestamp |
| `completedAt` | Date | no | Processing completion timestamp |
| `createdAt` | Date | auto | Job creation timestamp |
| `updatedAt` | Date | auto | Last modified timestamp |

**Status enum values**: `pending`, `processing`, `completed`, `failed`, `cancelled`

**Indexes**:
- `{ lectureDocumentId: 1 }` - for lookup by document
- `{ status: 1, createdAt: 1 }` - for job queue polling
- `{ courseId: 1 }` - for course-scoped queries

### LectureDocument (EXTENDED - existing)

Add embedding status tracking to existing model.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `embeddingStatus` | String | no | Embedding pipeline status |
| `embeddingJobId` | ObjectId | no | Reference to current IndexingJob |
| `chunksIndexed` | Number | no | Number of chunks in ChromaDB |
| `lastIndexedAt` | Date | no | Last successful indexing timestamp |

**embeddingStatus enum values**: `pending`, `processing`, `indexed`, `failed`

### TextChunk (TRANSIENT - not persisted)

Represents a segment of lecture content for embedding. Generated in-memory during processing.

| Field | Type | Description |
|-------|------|-------------|
| `content` | String | Text content of the chunk |
| `headingPath` | String | Heading hierarchy (e.g., "Chapter 1 > Section 1.1") |
| `headingLevel` | Number | Deepest heading level (1-6) |
| `chunkIndex` | Number | Sequence position in document |
| `tokenCount` | Number | Estimated token count |

### ChunkEmbedding (ChromaDB Document)

Vector representation stored in ChromaDB.

**Collection**: `lms_embeddings` (existing)

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique ID: `embed-{courseId}-{lectureDocId}-{chunkIndex}` |
| `embedding` | Float[768] | Gemini text-embedding-004 vector |
| `document` | String | Original chunk text (for retrieval) |
| `metadata.type` | String | Always `semantic_chunk` |
| `metadata.courseId` | String | Course ID for scoping |
| `metadata.lessonId` | String | Lesson ID for enrichment |
| `metadata.lectureDocumentId` | String | Source document ID |
| `metadata.headingPath` | String | Heading hierarchy |
| `metadata.chunkIndex` | Number | Sequence position |

### SemanticQuery (TRANSIENT - not persisted)

Represents a student's search query. Generated in-memory during search.

| Field | Type | Description |
|-------|------|-------------|
| `queryText` | String | Original query text |
| `queryEmbedding` | Float[768] | Gemini embedding of query |
| `courseId` | String | Course scope for search |
| `userId` | String | User making the query (for audit) |

## Mongoose Schemas

### IndexingJob Schema

```javascript
const indexingJobSchema = new Schema({
  lectureDocumentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'LectureDocument', 
    required: true,
    index: true
  },
  courseId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    index: true 
  },
  lessonId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Lesson', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  chunksTotal: { type: Number, default: 0 },
  chunksProcessed: { type: Number, default: 0 },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

// Compound index for queue polling
indexingJobSchema.index({ status: 1, createdAt: 1 });
```

### LectureDocument Schema Extension

```javascript
// Add to existing lectureDocumentSchema
embeddingStatus: {
  type: String,
  enum: ['pending', 'processing', 'indexed', 'failed'],
  default: null
},
embeddingJobId: {
  type: Schema.Types.ObjectId,
  ref: 'IndexingJob',
  required: false
},
chunksIndexed: {
  type: Number,
  default: 0
},
lastIndexedAt: {
  type: Date,
  required: false
}
```

## Zod Validation Schemas

### Search Query Validation

```javascript
export const semanticSearchQuerySchema = z.object({
  query: z.string()
    .min(3, 'Query must be at least 3 characters')
    .max(500, 'Query must be under 500 characters'),
  courseId: z.string().min(1, 'Course ID is required'),
  limit: z.number().int().min(1).max(10).default(5),
  threshold: z.number().min(0).max(1).default(0.7)
}).strict();
```

### Search Result Schema

```javascript
export const searchResultSchema = z.object({
  chunkId: z.string(),
  score: z.number().min(0).max(1),
  text: z.string(),
  headingPath: z.string(),
  lessonId: z.string(),
  lessonTitle: z.string(),
  courseId: z.string()
});

export const searchResponseSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
  totalMatches: z.number().int().min(0),
  searchTimeMs: z.number().int().min(0)
});
```

### Indexing Job Validation

```javascript
export const triggerIndexingSchema = z.object({
  lectureDocumentId: z.string().min(1, 'Document ID is required')
}).strict();
```

## State Transitions

### IndexingJob State Machine

```text
                    ┌─────────────┐
                    │   pending   │◀──────────────────┐
                    └──────┬──────┘                   │
                           │ job processor picks up   │ re-upload triggers
                           ▼                          │ new job
                    ┌─────────────┐                   │
          ┌─────────│ processing  │─────────┐        │
          │         └──────┬──────┘         │        │
          │                │                │        │
          │ re-upload      │ success        │ error  │
          │ during         │                │        │
          │ processing     │                │        │
          ▼                ▼                ▼        │
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
   │  cancelled  │  │  completed  │  │   failed    │─┘
   └─────────────┘  └─────────────┘  └─────────────┘
                                           │
                                           │ retryCount < 3
                                           ▼
                                    ┌─────────────┐
                                    │   pending   │ (re-queued)
                                    └─────────────┘
```

### LectureDocument.embeddingStatus State Machine

```text
                    ┌─────────────┐
         upload ───▶│   pending   │
                    └──────┬──────┘
                           │ job starts
                           ▼
                    ┌─────────────┐
            ┌───────│ processing  │───────┐
            │       └─────────────┘       │
            │ success                     │ error
            ▼                             ▼
     ┌─────────────┐              ┌─────────────┐
     │   indexed   │              │   failed    │
     └─────────────┘              └─────────────┘
            │                             │
            └──────────┬──────────────────┘
                       │ re-upload
                       ▼
                ┌─────────────┐
                │   pending   │
                └─────────────┘
```

## Cascade Delete Rules

- When a **LectureDocument** is deleted → Delete associated **IndexingJob**, remove ChromaDB embeddings
- When a **Lesson** is deleted → Cascade to LectureDocument → Cascade as above
- When a **Course** is deleted → All Lessons cascade → All embeddings removed

## ChromaDB Document Structure

```javascript
// Add embedding to ChromaDB
await collection.add({
  ids: [`embed-${courseId}-${lectureDocId}-${chunkIndex}`],
  embeddings: [embeddingVector],  // 768-dim from Gemini
  documents: [chunkText],
  metadatas: [{
    type: 'semantic_chunk',
    courseId: courseId.toString(),
    lessonId: lessonId.toString(),
    lectureDocumentId: lectureDocId.toString(),
    headingPath: 'Chapter 1 > Section 1.1',
    chunkIndex: 0
  }]
});

// Search in ChromaDB
const results = await collection.query({
  queryEmbeddings: [queryEmbedding],
  nResults: 10,  // fetch more, filter by threshold
  where: { courseId: targetCourseId }
});
```

## Migration Notes

1. **LectureDocument extension**: Add new fields with defaults, no data migration needed
2. **IndexingJob collection**: New collection, no migration needed
3. **ChromaDB**: Existing embeddings (from 012) use different ID format; new embeddings will coexist with `type: 'semantic_chunk'` vs `type: 'lecture_document'`
