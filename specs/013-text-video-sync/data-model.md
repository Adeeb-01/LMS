# Data Model: Text-Video Timestamp Synchronization

**Feature**: 013-text-video-sync  
**Date**: 2026-03-12

## Entity Relationship Diagram

```text
┌─────────────────┐       1:1        ┌──────────────────┐
│     Lesson      │─────────────────▶│ LectureDocument  │
│   (existing)    │                  │   (existing)     │
└─────────────────┘                  └──────────────────┘
        │                                    │
        │ 1:1                                │ has alignment
        ▼                                    ▼
┌─────────────────┐                  ┌──────────────────┐
│ VideoTranscript │◀─────────────────│  AlignmentJob    │
│     (new)       │     references   │     (new)        │
└─────────────────┘                  └──────────────────┘
        │
        │ embeds
        ▼
┌─────────────────┐
│TextBlockTimestamp│
│   (embedded)    │
└─────────────────┘
```

## Entities

### VideoTranscript (NEW)

Represents the speech-to-text output from a lesson's video audio. Stored permanently.

**Collection**: `videotranscripts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `lessonId` | ObjectId | yes | Reference to Lesson (unique constraint) |
| `courseId` | ObjectId | yes | Reference to Course (for access control) |
| `language` | String | yes | Detected language code (e.g., "en", "ar") |
| `duration` | Number | yes | Video duration in seconds |
| `segments` | Array | yes | Array of transcript segments with timestamps |
| `words` | Array | yes | Array of word-level timestamps |
| `alignments` | Array | no | Array of TextBlockTimestamp (embedded) |
| `alignmentStatus` | String | yes | Alignment processing status |
| `errorMessage` | String | no | Error details if alignment failed |
| `processingDurationMs` | Number | no | STT processing time in milliseconds |
| `createdAt` | Date | auto | Transcript creation timestamp |
| `updatedAt` | Date | auto | Last modified timestamp |

**Alignment status enum**: `pending`, `processing`, `completed`, `failed`

**Indexes**:
- `{ lessonId: 1 }` - unique, for 1:1 relationship
- `{ courseId: 1 }` - for course-scoped queries
- `{ alignmentStatus: 1 }` - for monitoring

### Segment (EMBEDDED in VideoTranscript)

| Field | Type | Description |
|-------|------|-------------|
| `start` | Number | Start time in seconds (float) |
| `end` | Number | End time in seconds (float) |
| `text` | String | Transcript text for this segment |

### Word (EMBEDDED in VideoTranscript)

| Field | Type | Description |
|-------|------|-------------|
| `start` | Number | Start time in seconds (float) |
| `end` | Number | End time in seconds (float) |
| `word` | String | Individual word |

### TextBlockTimestamp (EMBEDDED in VideoTranscript)

Represents the alignment link between a document text block and video timestamp.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blockIndex` | Number | yes | Index in LectureDocument.extractedText.structuredContent |
| `startSeconds` | Number | no | Start timestamp in seconds (null if not-spoken) |
| `endSeconds` | Number | no | End timestamp in seconds (null if not-spoken) |
| `confidence` | Number | yes | Alignment confidence score (0-100) |
| `status` | String | yes | Block alignment status |
| `manuallyVerified` | Boolean | no | True if instructor manually verified/adjusted |
| `verifiedBy` | ObjectId | no | Reference to User who verified |
| `verifiedAt` | Date | no | Verification timestamp |

**Status enum**: `aligned`, `not-spoken`, `unable-to-align` (used when video has no audio or alignment fails)

### AlignmentJob (NEW)

Represents a queued or in-progress alignment processing job.

**Collection**: `alignmentjobs`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `lessonId` | ObjectId | yes | Reference to Lesson |
| `courseId` | ObjectId | yes | Reference to Course |
| `lectureDocumentId` | ObjectId | yes | Reference to LectureDocument |
| `videoTranscriptId` | ObjectId | no | Reference to VideoTranscript (once created) |
| `status` | String | yes | Job processing status |
| `phase` | String | yes | Current processing phase |
| `progress` | Number | no | Progress percentage (0-100) |
| `errorMessage` | String | no | Error details if failed |
| `retryCount` | Number | yes | Number of retry attempts (max 1) |
| `scheduledFor` | Date | yes | When job should be processed |
| `startedAt` | Date | no | Processing start timestamp |
| `completedAt` | Date | no | Processing completion timestamp |
| `failedAt` | Date | no | Failure timestamp |
| `triggeredBy` | ObjectId | yes | Reference to User who triggered |
| `createdAt` | Date | auto | Job creation timestamp |
| `updatedAt` | Date | auto | Last modified timestamp |

**Status enum**: `queued`, `processing`, `completed`, `failed`

**Phase enum**: `audio-extraction`, `transcription`, `alignment`, `saving`

**Indexes**:
- `{ lessonId: 1 }` - for lookup by lesson
- `{ status: 1, scheduledFor: 1 }` - for job queue processing
- `{ courseId: 1 }` - for course-scoped queries

### LectureDocument (EXTENDED - existing)

Add reference to VideoTranscript for alignment data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `videoTranscriptId` | ObjectId | no | Reference to VideoTranscript |

## Mongoose Schemas

### VideoTranscript Schema

```javascript
const segmentSchema = new Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  text: { type: String, required: true }
}, { _id: false });

const wordSchema = new Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  word: { type: String, required: true }
}, { _id: false });

const textBlockTimestampSchema = new Schema({
  blockIndex: { type: Number, required: true },
  startSeconds: { type: Number, default: null },
  endSeconds: { type: Number, default: null },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  status: { 
    type: String, 
    enum: ['aligned', 'not-spoken', 'unable-to-align'], // unable-to-align: video has no audio or alignment failed
    required: true 
  },
  manuallyVerified: { type: Boolean, default: false },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date }
}, { _id: false });

const videoTranscriptSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, unique: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  language: { type: String, required: true, default: 'en' },
  duration: { type: Number, required: true },
  segments: [segmentSchema],
  words: [wordSchema],
  alignments: [textBlockTimestampSchema],
  alignmentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  errorMessage: { type: String },
  processingDurationMs: { type: Number }
}, { timestamps: true });
```

### AlignmentJob Schema

```javascript
const alignmentJobSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lectureDocumentId: { type: Schema.Types.ObjectId, ref: 'LectureDocument', required: true },
  videoTranscriptId: { type: Schema.Types.ObjectId, ref: 'VideoTranscript' },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
    index: true
  },
  phase: {
    type: String,
    enum: ['audio-extraction', 'transcription', 'alignment', 'saving'],
    default: 'audio-extraction'
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0, max: 1 },
  scheduledFor: { type: Date, required: true, default: Date.now, index: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Compound index for queue processing
alignmentJobSchema.index({ status: 1, scheduledFor: 1 });
```

### LectureDocument Extension

```javascript
// Add to existing lectureDocumentSchema
videoTranscriptId: {
  type: Schema.Types.ObjectId,
  ref: 'VideoTranscript',
  required: false
}
```

## Zod Validation Schemas

### Trigger Alignment Request

```javascript
export const triggerAlignmentSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  courseId: z.string().min(1, 'Course ID is required')
}).strict();
```

### Manual Timestamp Adjustment

```javascript
export const adjustTimestampSchema = z.object({
  blockIndex: z.number().int().min(0),
  startSeconds: z.number().min(0).nullable(),
  endSeconds: z.number().min(0).nullable()
}).strict().refine(
  data => data.startSeconds === null || data.endSeconds === null || 
          data.startSeconds <= data.endSeconds,
  { message: 'Start time must be before end time' }
);
```

## State Transitions

### AlignmentJob Lifecycle

```text
                    ┌─────────────┐
    trigger         │   queued    │
    alignment ─────▶│             │
                    └──────┬──────┘
                           │ scheduledFor reached
                           ▼
                    ┌─────────────┐
            ┌───────│ processing  │───────┐
            │       │ (phases:    │       │
            │       │  extraction │       │
            │       │  transcript │       │
            │       │  alignment  │       │
            │       │  saving)    │       │
            │       └─────────────┘       │
            │ all phases                  │ error
            │ complete                    │
            ▼                             ▼
     ┌─────────────┐              ┌─────────────┐
     │  completed  │              │   failed    │
     └─────────────┘              └──────┬──────┘
                                         │ retryCount < 1
                                         │ schedule retry
                                         ▼
                                  ┌─────────────┐
                                  │   queued    │ (5 min delay)
                                  └─────────────┘
```

### VideoTranscript Alignment Status

```text
┌─────────────┐
│   pending   │ (initial state after transcript created)
└──────┬──────┘
       │ alignment job starts
       ▼
┌─────────────┐
│ processing  │
└──────┬──────┘
       │ success / error
       ├─────────────────┐
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  completed  │   │   failed    │
└─────────────┘   └─────────────┘
```

## Cascade Delete Rules

- When a **Lesson** is deleted → Delete associated **VideoTranscript** and **AlignmentJob**
- When a **LectureDocument** is deleted → Delete associated **VideoTranscript** (alignment depends on document)
- When a **VideoTranscript** is deleted → Remove from **LectureDocument.videoTranscriptId**
- When a **Course** is deleted → All Lessons cascade → All VideoTranscripts and AlignmentJobs cascade

## Access Control Rules

| Entity | Instructor (course owner) | Enrolled Student | Admin |
|--------|--------------------------|------------------|-------|
| VideoTranscript | Read, Trigger alignment | Read alignments only | Full |
| AlignmentJob | Read, Trigger, Cancel | No access | Full |
| TextBlockTimestamp | Read, Adjust (manual verify) | Read only | Full |

## Indexes Summary

| Collection | Index | Purpose |
|------------|-------|---------|
| videotranscripts | `{ lessonId: 1 }` unique | 1:1 with Lesson |
| videotranscripts | `{ courseId: 1 }` | Course-scoped queries |
| videotranscripts | `{ alignmentStatus: 1 }` | Status monitoring |
| alignmentjobs | `{ lessonId: 1 }` | Lookup by lesson |
| alignmentjobs | `{ status: 1, scheduledFor: 1 }` | Job queue processing |
| alignmentjobs | `{ courseId: 1 }` | Course-scoped queries |
