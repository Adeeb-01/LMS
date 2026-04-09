# Data Model: DOCX Text Extraction

**Feature**: 012-docx-text-extraction  
**Date**: 2026-03-11

## Entity Relationship Diagram

```text
┌─────────────┐       1:1        ┌──────────────────┐
│   Lesson    │─────────────────▶│ LectureDocument  │
│  (existing) │                  │     (new)        │
└─────────────┘                  └──────────────────┘
                                          │
                                          │ embeds
                                          ▼
                                 ┌──────────────────┐
                                 │  ExtractedText   │
                                 │   (embedded)     │
                                 └──────────────────┘
```

## Entities

### LectureDocument (NEW)

Represents an uploaded .docx file associated with a lesson/lecture.

**Collection**: `lecturedocuments`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `lessonId` | ObjectId | yes | Reference to Lesson (unique constraint) |
| `courseId` | ObjectId | yes | Reference to Course (for access control) |
| `originalFilename` | String | yes | Original uploaded filename |
| `fileSize` | Number | yes | File size in bytes |
| `mimeType` | String | yes | MIME type (application/vnd.openxmlformats-officedocument.wordprocessingml.document) |
| `status` | String | yes | Processing status enum |
| `errorMessage` | String | no | Error details if status is 'failed' |
| `extractedText` | ExtractedText | no | Embedded document with extracted content |
| `uploadedBy` | ObjectId | yes | Reference to User (instructor) |
| `createdAt` | Date | auto | Upload timestamp |
| `updatedAt` | Date | auto | Last modified timestamp |

**Status enum values**: `uploading`, `processing`, `ready`, `failed`

**Indexes**:
- `{ lessonId: 1 }` - unique, for 1:1 relationship
- `{ courseId: 1 }` - for course-scoped queries
- `{ status: 1 }` - for monitoring processing queue

### ExtractedText (EMBEDDED in LectureDocument)

Represents the text content extracted from a .docx document.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fullText` | String | yes | Complete extracted text (UTF-8) |
| `wordCount` | Number | yes | Total word count |
| `structuredContent` | Array | yes | Array of content blocks |
| `extractedAt` | Date | yes | Extraction completion timestamp |
| `extractionDurationMs` | Number | yes | Processing time in milliseconds |

**StructuredContent block schema**:

| Field | Type | Description |
|-------|------|-------------|
| `type` | String | Block type: 'paragraph', 'heading', 'list', 'table' |
| `level` | Number | Heading level (1-6) or list nesting level |
| `content` | String | Text content of the block |
| `style` | Object | Optional: { bold: Boolean, italic: Boolean } |

### Lesson (EXTENDED - existing)

Add optional reference to LectureDocument.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lectureDocumentId` | ObjectId | no | Reference to LectureDocument |

## Mongoose Schemas

### LectureDocument Schema

```javascript
const extractedTextSchema = new Schema({
  fullText: { type: String, required: true },
  wordCount: { type: Number, required: true },
  structuredContent: [{
    type: { type: String, enum: ['paragraph', 'heading', 'list', 'table'], required: true },
    level: { type: Number, default: 0 },
    content: { type: String, required: true },
    style: {
      bold: { type: Boolean, default: false },
      italic: { type: Boolean, default: false }
    }
  }],
  extractedAt: { type: Date, required: true },
  extractionDurationMs: { type: Number, required: true }
}, { _id: false });

const lectureDocumentSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, unique: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  originalFilename: { type: String, required: true, maxlength: 255 },
  fileSize: { type: Number, required: true, max: 52428800 }, // 50 MB
  mimeType: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['uploading', 'processing', 'ready', 'failed'], 
    default: 'uploading',
    index: true 
  },
  errorMessage: { type: String },
  extractedText: extractedTextSchema,
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
```

### Lesson Schema Extension

```javascript
// Add to existing lessonSchema
lectureDocumentId: {
  type: Schema.Types.ObjectId,
  ref: 'LectureDocument',
  required: false
}
```

## Zod Validation Schemas

### Upload Validation

```javascript
export const lectureDocumentUploadSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  courseId: z.string().min(1, 'Course ID is required')
}).strict();
```

### File Validation (separate, applied to File object)

```javascript
export const docxFileSchema = z.object({
  name: z.string().regex(/\.docx$/i, 'File must be a .docx document'),
  size: z.number().max(52428800, 'File must be under 50 MB'),
  type: z.literal('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}).strict();
```

## State Transitions

```text
                    ┌─────────────┐
                    │  uploading  │
                    └──────┬──────┘
                           │ upload complete
                           ▼
                    ┌─────────────┐
            ┌───────│ processing  │───────┐
            │       └─────────────┘       │
            │ extraction                  │ extraction
            │ success                     │ error
            ▼                             ▼
     ┌─────────────┐              ┌─────────────┐
     │    ready    │              │   failed    │
     └─────────────┘              └─────────────┘
            │                             │
            │ re-upload                   │ re-upload
            └──────────────┬──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  uploading  │ (new document replaces old)
                    └─────────────┘
```

## Cascade Delete Rules

- When a **Lesson** is deleted → Delete associated **LectureDocument**
- When a **LectureDocument** is deleted → Remove ChromaDB embeddings for that document
- When a **Course** is deleted → All Lessons cascade → All LectureDocuments cascade

## Search Integration

ChromaDB document structure for extracted text:

```javascript
{
  id: `lecture-doc-${lectureDocumentId}-chunk-${chunkIndex}`,
  document: chunkText,  // ~500 word chunks
  metadata: {
    type: 'lecture_document',
    lectureDocumentId: String,
    lessonId: String,
    courseId: String,
    chunkIndex: Number
  }
}
```

Query pattern: Search returns metadata, then fetch full content from MongoDB.
