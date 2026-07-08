# LMS API Design Reference

Base URL: `/api` (App Router route handlers under `app/api/`).

**Authentication:** Session cookie via NextAuth (`auth()` / `getLoggedInUser()`), unless noted otherwise.

**Shared error codes** (`lib/errors.js`): `AUTH_REQUIRED`, `FORBIDDEN`, `UNAUTHORIZED`, `VALIDATION_ERROR`, `NOT_FOUND`, `ALREADY_EXISTS`, `RATE_LIMITED`, `INTERNAL_ERROR`, `DATABASE_ERROR`, `EXTERNAL_SERVICE_ERROR`, etc.

---

## Table of contents

1. [Auth & user](#1-auth--user)
2. [Health & monitoring](#2-health--monitoring)
3. [Lesson progress & certificates](#3-lesson-progress--certificates)
4. [Payments](#4-payments)
5. [Uploads & media](#5-uploads--media)
6. [Lecture documents](#6-lecture-documents)
7. [Semantic search & RAG tutor](#7-semantic-search--rag-tutor)
8. [Oral assessment & quiz grading](#8-oral-assessment--quiz-grading)
9. [AI generation jobs](#9-ai-generation-jobs)
10. [Pipeline, alignments, remediation](#10-pipeline-alignments-remediation)
11. [HTTP status summary](#http-status-summary)

---

## 1. Auth & user

### `GET /api/me`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Required (session) |
| **Parameters** | None |

**Return (200):** Full user document from MongoDB.

**Errors:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 404 | `{ "error": "User not found" }` |
| 500 | `{ "error": "Internal server error" }` |

---

### `POST /api/register`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | None (public) |
| **Body (JSON)** | `firstName`, `lastName`, `email`, `password`, `confirmPassword`, `userRole` |

**Return (201):**

```json
{ "message": "Account created successfully. You can now log in." }
```

**Errors:**

| Status | Body / code |
|--------|-------------|
| 400 | `VALIDATION_ERROR` — validation failed; `details.fieldErrors` |
| 400 | Password mismatch |
| 409 | `ALREADY_EXISTS` — email already exists |
| 429 | `RATE_LIMITED` — IP or email (header `Retry-After: 60`) |
| 500 | `INTERNAL_ERROR` |

---

### `GET` / `POST /api/auth/[...nextauth]`

| Field | Value |
|-------|-------|
| **Method** | GET, POST |
| **Auth** | NextAuth v5 handlers |
| **Parameters** | NextAuth standard routes (`signin`, `callback`, `session`, `csrf`, etc.) |

**Return:** Per NextAuth (redirects / session JSON).

---

### `POST /api/profile/avatar`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Required |
| **Body (multipart)** | `file` — JPEG/PNG/WebP, max 5MB |

**Return (200):**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "imageUrl": "/uploads/avatars/...",
  "filename": "..."
}
```

**Errors:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized: Authentication required" }` |
| 400 | Invalid / missing file or type |
| 413 | File too large |
| 429 | Too many uploads (`Retry-After: 60`) |
| 500 | Upload or profile update failed |

---

## 2. Health & monitoring

### `GET /api/health`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | None |
| **Query** | `detailed=true` or `refresh=true` — bypass cache |

**Return:**

| Status | Body |
|--------|------|
| 200 | Healthy or degraded |
| 503 | Unhealthy |

```json
{
  "status": "healthy | degraded | unhealthy",
  "timestamp": "ISO-8601",
  "responseTimeMs": 0,
  "services": {
    "mongodb": { "status": "...", "responseTimeMs": 0 },
    "chroma": { "status": "...", "responseTimeMs": 0 }
  },
  "cached": false
}
```

**Errors:**

| Status | Body |
|--------|------|
| 500 | `{ "message": "...", "errorCode": "INTERNAL_ERROR" }` |

---

## 3. Lesson progress & certificates

### `POST /api/lesson-watch`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Required |
| **Body (JSON)** | `courseId`, `lessonId`, `moduleSlug`, `state` (`"started"` \| `"completed"`), optional `lastTime` (number) |

**Return (200):**

```json
{ "message": "Watch record added successfully" }
```

**Errors:**

| Status | Body |
|--------|------|
| 400 | Invalid or missing fields / invalid ObjectId |
| 401 | Not authenticated |
| 403 | Not enrolled / lesson not in module |
| 404 | Lesson, module, or course not found |
| 500 | Internal server error |

---

### `GET /api/certificates/[courseId]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Required; course must be 100% complete |
| **Path** | `courseId` — MongoDB ObjectId |

**Return (200):** PDF binary (`Content-Type: application/pdf`, `Content-Disposition: attachment`).

**Errors:**

| Status | errorCode |
|--------|-----------|
| 401 | `AUTH_REQUIRED` |
| 400 | `VALIDATION_ERROR` — invalid courseId |
| 403 | `FORBIDDEN` — not complete or no access |
| 404 | `NOT_FOUND` |
| 429 | `RATE_LIMITED` (5/min per user+IP) |
| 500 | `INTERNAL_ERROR` |

---

## 4. Payments

### `GET /api/payments/status`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | None |
| **Query** | `session_id` — must start with `cs_` |

**Return (200):**

```json
{
  "ok": true,
  "isPaid": false,
  "isEnrolled": false,
  "paymentStatus": "succeeded | not_found | ...",
  "paymentId": "optional",
  "userId": "optional",
  "courseId": "optional",
  "state": "WAITING_FOR_WEBHOOK",
  "message": "optional"
}
```

**Errors:**

| Status | Body |
|--------|------|
| 400 | `{ "ok": false, "error": "Invalid session_id. Must start with \"cs_\"." }` |
| 500 | `{ "ok": false, "error": "..." }` |

---

### `POST /api/payments/mock/confirm`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Required |
| **Body (JSON)** | `courseId`, optional `simulateFailure` (boolean) |

**Return (200):**

```json
{
  "ok": true,
  "referenceId": "mock_...",
  "courseId": "...",
  "paymentId": "..."
}
```

**Errors:**

| Status | Body |
|--------|------|
| 401 | Authentication required |
| 400 | Missing/invalid courseId, free course, already enrolled, simulated failure |
| 404 | Course not found |
| 500 | Processing error |

---

## 5. Uploads & media

### `POST /api/upload`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Required |
| **Body (multipart)** | `files`, `destination`, optional `courseId` |

Allowed destinations: `public/uploads/courses`, `public/uploads/thumbnails`, `public/uploads/avatars`, `public/assets/images/courses`, `public/assets/images/categories`, etc.

Allowed MIME: JPEG, PNG, WebP, GIF. Max 5MB.

**Return (200):**

```json
{
  "message": "File uploaded successfully",
  "filename": "...",
  "path": "/assets/images/courses/..."
}
```

**Errors:** 401, 400 (file/destination), 403 (course), 429, 500.

---

### `POST /api/upload/audio-url`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Required |
| **Body (JSON)** | `fileName`, `contentType` |

**Return (200):** Presigned S3 upload payload from `getPresignedUploadUrl`.

**Errors:** 401, 400 (missing fields), 500.

---

### `POST /api/upload/video`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Instructor or admin |
| **Body (multipart)** | `file` (mp4/webm/quicktime, max 300MB), `lessonId` |

**Return (200):**

```json
{
  "ok": true,
  "message": "Video uploaded successfully.",
  "data": {
    "videoUrl": "/api/videos/...",
    "filename": "...",
    "size": 0,
    "mimeType": "video/mp4"
  }
}
```

**Errors:**

| Status | errorCode |
|--------|-----------|
| 401 | `AUTH_REQUIRED` |
| 403 | `FORBIDDEN` |
| 400 | `VALIDATION_ERROR` |
| 404 | `NOT_FOUND` |
| 500 | `INTERNAL_ERROR` |

---

### `DELETE /api/upload/video`

| Field | Value |
|-------|-------|
| **Method** | DELETE |
| **Auth** | Instructor or admin |
| **Query** | `lessonId` |

**Return (200):**

```json
{
  "ok": true,
  "message": "Video deleted successfully.",
  "data": null
}
```

**Errors:** Same pattern as POST video.

---

### `GET /api/videos/[filename]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Enrolled student, course instructor, or admin |
| **Path** | `filename` |
| **Headers** | Optional `Range` for seeking |

**Return:**

| Status | Body |
|--------|------|
| 200 | Full video stream |
| 206 | Partial content (range) |

Headers: `Content-Type`, `Content-Length`, `Accept-Ranges`, `Content-Range` (206).

**Errors:**

| Status | Body |
|--------|------|
| 401 | Unauthorized |
| 400 | Invalid filename (path traversal) |
| 403 | Forbidden / not enrolled |
| 404 | Video file not found |
| 416 | Invalid range |
| 500 | Stream failure |

---

## 6. Lecture documents

### `POST /api/lecture-documents`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Course instructor |
| **Body (multipart)** | `file` (.docx), `lessonId`, `courseId` |

**Return (201):**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "lessonId": "...",
    "courseId": "...",
    "originalFilename": "...",
    "fileSize": 0,
    "status": "ready",
    "createdAt": "..."
  }
}
```

**Errors:** 401, 400, 403, 409 (`DOCUMENT_EXISTS`), 500 (`EXTRACTION_FAILED`).

---

### `GET /api/lecture-documents/[id]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Enrolled, instructor, or admin |
| **Path** | `id` — document ObjectId |

**Return (200):** `{ success: true, data: { id, lessonId, courseId, originalFilename, fileSize, status, extractedText, createdAt, updatedAt } }`

**Errors:** 401, 403, 404, 500.

---

### `PUT /api/lecture-documents/[id]`

| Field | Value |
|-------|-------|
| **Method** | PUT |
| **Auth** | Instructor (owns course) |
| **Body (multipart)** | `file` (.docx) |

**Return (200):** `{ success: true, data: { id, originalFilename, status, updatedAt }, message }`

**Errors:** Same as GET + `EXTRACTION_FAILED` (500).

---

### `DELETE /api/lecture-documents/[id]`

| Field | Value |
|-------|-------|
| **Method** | DELETE |
| **Auth** | Instructor |

**Return (200):** `{ success: true, message: "Document deleted successfully" }`

**Errors:** 401, 403, 404, 500.

---

### `GET /api/lecture-documents/by-lesson/[lessonId]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Enrolled / instructor / admin |
| **Path** | `lessonId` |

**Return:** 200 with document JSON, or **204** if no document.

**Errors:** 401, 403, 500.

---

### `GET /api/lecture-documents/[id]/download`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Enrolled / instructor / admin |
| **Path** | `id` |
| **Query** | `format` = `txt` (default) \| `html` |

**Return (200):** File attachment (`text/plain` or `text/html`).

**Errors:** 400 (`NOT_READY`, `INVALID_FORMAT`), 401, 403, 404, 500.

---

## 7. Semantic search & RAG tutor

### `POST /api/semantic-search`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Required |
| **Body (JSON)** | `query` (3–500 chars), `courseId`, optional `limit` (1–10, default 5), `threshold` (0–1, default 0.7) |

**Return (200):**

```json
{
  "query": "...",
  "results": [],
  "totalMatches": 0,
  "searchTimeMs": 0,
  "degraded": false
}
```

**Errors:**

| Status | error |
|--------|-------|
| 401 | `UNAUTHORIZED` |
| 400 | `VALIDATION_ERROR` |
| 403 | `FORBIDDEN` |
| 500 | `INTERNAL_ERROR` |

---

### `GET /api/semantic-search/status`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Required |
| **Query** | `courseId` (required), optional `lessonId` |

**Return (200) — lesson level:**

```json
{
  "lessonId": "...",
  "lectureDocumentId": "...",
  "status": "indexed | pending | processing | failed | none",
  "chunksIndexed": 0,
  "lastIndexedAt": null,
  "jobId": null
}
```

**Return (200) — course level:**

```json
{
  "courseId": "...",
  "totalLessons": 0,
  "indexedLessons": 0,
  "pendingLessons": 0,
  "failedLessons": 0,
  "totalChunks": 0,
  "lastIndexedAt": null
}
```

**Errors:** 401, 400, 403, 500.

---

### `POST /api/rag-tutor/query`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Required; enrolled in `courseId` (or admin/instructor) |
| **Body (JSON)** | `lessonId`, `courseId`, and one of: `question`, `audioUrl`, `audioBase64` (+ optional `audioMimeType`) |

**Return (200):**

```json
{
  "ok": true,
  "result": {
    "interactionId": "...",
    "question": "...",
    "response": "...",
    "isGrounded": true,
    "timestampLinks": [],
    "reciteBackRequired": true,
    "rateLimitWarning": null
  }
}
```

**Errors:**

| Status | error |
|--------|-------|
| 401 | `UNAUTHORIZED` |
| 400 | `MISSING_REQUIRED_FIELDS`, `TRANSCRIPTION_FAILED`, validation |
| 403 | `FORBIDDEN` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_SERVER_ERROR` |

---

### `POST /api/rag-tutor/recite-back`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Required; must own `interactionId` |
| **Body (JSON)** | `interactionId`, `lessonId`, `inputMethod`, `attemptNumber`, `recitation` or `audioUrl` (for voice) |

**Return (200):**

```json
{
  "ok": true,
  "result": {
    "id": "...",
    "similarityScore": 0.0,
    "passed": false,
    "feedback": "..."
  }
}
```

**Errors:** 401, 400, 403, 404, 500.

---

## 8. Oral assessment & quiz grading

### `GET /api/oral-assessment/lesson/[lessonId]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Required |
| **Path** | `lessonId` |

**Return (200):**

```json
{
  "ok": true,
  "assessments": [
    {
      "id": "...",
      "questionText": "...",
      "triggerTimestamp": 0,
      "passingThreshold": 0.6
    }
  ]
}
```

**Errors:** 401, 400, 500.

---

### `POST /api/oral-assessment/[assessmentId]/submit`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Enrolled (or admin/instructor) |
| **Path** | `assessmentId` |
| **Body (JSON)** | `lessonId`, `courseId`, optional `attemptNumber`, `inputMethod`, plus `audioUrl` or `textResponse` |

**Return (200):**

```json
{
  "ok": true,
  "result": {
    "id": "...",
    "similarityScore": 0.0,
    "conceptsCovered": [],
    "conceptsMissing": [],
    "passed": false,
    "feedback": "..."
  }
}
```

**Errors:** 401, 400, 403, 500.

---

### `POST /api/evaluate-oral`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | None in handler (call from trusted client) |
| **Body (JSON)** | `attemptId`, `answerId` |

**Return (200):**

```json
{ "ok": true, "message": "Evaluation started" }
```

**Errors:** 400 (missing IDs), 500.

---

### `GET /api/quizv2/attempts/[attemptId]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Student owns attempt, or instructor/admin for course |
| **Path** | `attemptId` |

**Return (200):**

```json
{ "ok": true, "attempt": { } }
```

**Errors:** 400, 401, 403, 404, 500.

---

### `GET /api/answers/[answerId]/status`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Same BOLA rules as attempt |
| **Path** | `answerId` |

**Return (200):**

```json
{
  "ok": true,
  "status": "pending | evaluating | completed | failed",
  "score": 0,
  "feedback": "transcribedText or feedback"
}
```

**Errors:** 400, 401, 403, 404, 500.

---

## 9. AI generation jobs

### `POST /api/mcq-generation`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Instructor (owns course) or admin |
| **Body (JSON)** | `lessonId`, `quizId` |

**Return (200):**

```json
{ "ok": true, "jobId": "..." }
```

**Errors:** 401, 400 (no indexed content), 403, 409 (job in progress), 400 (parse).

---

### `GET /api/mcq-generation/[jobId]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Instructor / admin |
| **Path** | `jobId` |

**Return (200):**

```json
{
  "ok": true,
  "job": {
    "id": "...",
    "status": "pending | processing | completed | failed",
    "progress": {
      "chunksTotal": 0,
      "chunksProcessed": 0,
      "questionsGenerated": 0,
      "questionsFlagged": 0,
      "percentComplete": 0
    },
    "chunkErrors": [],
    "startedAt": null,
    "completedAt": null,
    "errorMessage": null
  }
}
```

**Errors:** 401, 403, 404, 500.

---

### `POST /api/oral-generation`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | Instructor / admin |
| **Body (JSON)** | `lessonId` |

**Return (200):** `{ "ok": true, "jobId": "..." }`

**Errors:** 401, 400, 403, 409.

---

### `GET /api/oral-generation/[jobId]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Instructor owns lesson |
| **Path** | `jobId` |

**Return (200):**

```json
{
  "ok": true,
  "job": {
    "id": "...",
    "status": "...",
    "progress": { "chunksTotal", "chunksProcessed", "chunksSkipped", "questionsGenerated", "questionsFlagged", "percentComplete" },
    "errors": [],
    "startedAt": null,
    "completedAt": null
  }
}
```

**Errors:** 401, 403, 404, 500.

---

## 10. Pipeline, alignments, remediation

### `GET /api/pipeline/[lessonId]/status`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Instructor / admin |
| **Path** | `lessonId` |

**Return (200):**

```json
{ "success": true, "pipeline": { } }
```

**Errors:** 401, 403, 404, 500.

---

### `GET /api/alignments/lesson/[lessonId]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Enrolled / instructor / admin |
| **Path** | `lessonId` |
| **Query** | `courseId` (required) |

**Return (200):**

```json
{
  "success": true,
  "data": {
    "alignments": [],
    "alignmentStatus": "...",
    "language": "...",
    "duration": 0
  }
}
```

**Errors:** 400, 401, 403, 404, 500.

---

### `GET /api/alignments/job/[jobId]`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | Instructor / admin |
| **Path** | `jobId` |

**Return (200):**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "lessonId": "...",
    "courseId": "...",
    "status": "...",
    "phase": "...",
    "progress": {},
    "errorMessage": null,
    "startedAt": null,
    "completedAt": null,
    "failedAt": null
  }
}
```

**Errors:** 401, 403, 404, 500.

---

### `POST /api/remediation/aggregate`

| Field | Value |
|-------|-------|
| **Method** | POST |
| **Auth** | `Authorization: Bearer <REMEDIATION_AGGREGATE_SECRET>` or header `x-remediation-secret` |
| **Body (JSON)** | `courseId`, `studentId` (strings) |

**Return (200):**

```json
{
  "success": true,
  "data": {
    "profileId": "...",
    "lastAggregatedAt": "ISO-8601 | null"
  }
}
```

**Errors:**

| Status | Body |
|--------|------|
| 503 | Secret not configured |
| 401 | Unauthorized |
| 400 | Invalid JSON or missing fields |
| 500 | Aggregation failed |

---

## HTTP status summary

| Code | Typical use |
|------|-------------|
| 200 | Success (JSON, stream, PDF) |
| 201 | Created (register, lecture document) |
| 204 | No lecture document for lesson |
| 206 | Video range response |
| 400 | Validation, bad input, business rule |
| 401 | Not authenticated |
| 403 | Not authorized (enrollment, ownership) |
| 404 | Resource not found |
| 409 | Conflict (duplicate doc, job running, email exists) |
| 413 | Avatar too large |
| 416 | Invalid video range |
| 429 | Rate limited |
| 500 | Server error |
| 503 | Health unhealthy / remediation secret missing |

---

## Notes

1. Most routes use **session cookies**, not Bearer tokens (except `/api/remediation/aggregate`).
2. **Server Actions** under `app/actions/` (e.g. `rag-tutor.js`, `oral-assessment.js`) mirror some flows but are not REST endpoints under `/api`.
3. Response envelopes vary: `{ ok, error }`, `{ success, error }`, and plain `{ error }` — normalize in client SDKs if needed.
4. Source of truth: `app/api/**/route.js` in this repository.

*Generated from codebase route handlers.*
