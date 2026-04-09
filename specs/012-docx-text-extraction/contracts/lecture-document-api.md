# API Contract: Lecture Document

**Feature**: 012-docx-text-extraction  
**Date**: 2026-03-11

## Overview

REST API endpoints for managing lecture documents (.docx uploads and extracted text).

**Base Path**: `/api/lecture-documents`

**Authentication**: All endpoints require authenticated session via NextAuth.

**Authorization**: 
- Upload/Delete: Course instructor only
- Read/Download: Course instructor OR enrolled student

---

## Endpoints

### POST /api/lecture-documents

Upload a .docx file and extract text content.

**Request**:
- Content-Type: `multipart/form-data`
- Body:
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `file` | File | yes | The .docx file (max 50 MB) |
  | `lessonId` | string | yes | Target lesson ID |
  | `courseId` | string | yes | Course ID (for authorization) |

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "lessonId": "507f1f77bcf86cd799439012",
    "courseId": "507f1f77bcf86cd799439013",
    "originalFilename": "lecture-notes.docx",
    "fileSize": 245760,
    "status": "processing",
    "createdAt": "2026-03-11T14:30:00.000Z"
  }
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | INVALID_FILE_TYPE | "Please upload a .docx file" |
| 400 | FILE_TOO_LARGE | "File must be under 50 MB" |
| 400 | MISSING_LESSON_ID | "Lesson ID is required" |
| 401 | UNAUTHORIZED | "Authentication required" |
| 403 | FORBIDDEN | "You don't have permission to upload to this course" |
| 409 | DOCUMENT_EXISTS | "A document already exists for this lesson. Use PUT to replace." |

---

### GET /api/lecture-documents/[id]

Retrieve lecture document metadata and extracted text.

**Request**:
- Path Parameters:
  | Param | Type | Description |
  |-------|------|-------------|
  | `id` | string | LectureDocument ID |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "lessonId": "507f1f77bcf86cd799439012",
    "courseId": "507f1f77bcf86cd799439013",
    "originalFilename": "lecture-notes.docx",
    "fileSize": 245760,
    "status": "ready",
    "extractedText": {
      "fullText": "Chapter 1: Introduction to Oral Pathology...",
      "wordCount": 5432,
      "structuredContent": [
        { "type": "heading", "level": 1, "content": "Chapter 1: Introduction to Oral Pathology" },
        { "type": "paragraph", "content": "Oral pathology is the specialty of dentistry..." }
      ],
      "extractedAt": "2026-03-11T14:30:15.000Z",
      "extractionDurationMs": 1250
    },
    "createdAt": "2026-03-11T14:30:00.000Z",
    "updatedAt": "2026-03-11T14:30:15.000Z"
  }
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | "Authentication required" |
| 403 | FORBIDDEN | "You don't have access to this document" |
| 404 | NOT_FOUND | "Document not found" |

---

### GET /api/lecture-documents/[id]/download

Download extracted text as a file.

**Request**:
- Path Parameters:
  | Param | Type | Description |
  |-------|------|-------------|
  | `id` | string | LectureDocument ID |
- Query Parameters:
  | Param | Type | Default | Description |
  |-------|------|---------|-------------|
  | `format` | string | `txt` | Download format: `txt` or `html` |

**Response** (200 OK):
- Content-Type: `text/plain; charset=utf-8` (for txt) or `text/html; charset=utf-8` (for html)
- Content-Disposition: `attachment; filename="lecture-notes.txt"`
- Body: Extracted text content

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | INVALID_FORMAT | "Format must be 'txt' or 'html'" |
| 400 | NOT_READY | "Document is still processing" |
| 401 | UNAUTHORIZED | "Authentication required" |
| 403 | FORBIDDEN | "You don't have access to this document" |
| 404 | NOT_FOUND | "Document not found" |

---

### PUT /api/lecture-documents/[id]

Replace an existing document with a new upload.

**Request**:
- Content-Type: `multipart/form-data`
- Path Parameters:
  | Param | Type | Description |
  |-------|------|-------------|
  | `id` | string | LectureDocument ID |
- Body:
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `file` | File | yes | The replacement .docx file |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "originalFilename": "lecture-notes-v2.docx",
    "status": "processing",
    "updatedAt": "2026-03-11T15:00:00.000Z"
  },
  "message": "Document replaced successfully"
}
```

**Error Responses**: Same as POST endpoint.

---

### DELETE /api/lecture-documents/[id]

Delete a lecture document and its extracted text.

**Request**:
- Path Parameters:
  | Param | Type | Description |
  |-------|------|-------------|
  | `id` | string | LectureDocument ID |

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | "Authentication required" |
| 403 | FORBIDDEN | "You don't have permission to delete this document" |
| 404 | NOT_FOUND | "Document not found" |

---

### GET /api/lecture-documents/by-lesson/[lessonId]

Get lecture document for a specific lesson.

**Request**:
- Path Parameters:
  | Param | Type | Description |
  |-------|------|-------------|
  | `lessonId` | string | Lesson ID |

**Response** (200 OK): Same as GET /api/lecture-documents/[id]

**Response** (204 No Content): Lesson has no associated document.

---

## Server Actions

For client-side usage, Server Actions are provided in `/app/actions/lecture-document.js`:

```javascript
// Upload document
uploadLectureDocument(formData: FormData): Promise<Result>

// Get document by lesson
getLectureDocumentByLesson(lessonId: string): Promise<LectureDocument | null>

// Replace document  
replaceLectureDocument(documentId: string, formData: FormData): Promise<Result>

// Delete document
deleteLectureDocument(documentId: string): Promise<Result>

// Check processing status
getLectureDocumentStatus(documentId: string): Promise<{ status: string, errorMessage?: string }>
```

---

## Webhook Events (Future)

For async processing notifications (v2):

| Event | Payload |
|-------|---------|
| `lecture-document.processing.complete` | `{ documentId, lessonId, courseId, status: 'ready' }` |
| `lecture-document.processing.failed` | `{ documentId, lessonId, courseId, status: 'failed', error }` |
