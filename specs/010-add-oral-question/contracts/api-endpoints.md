# API Contracts: Oral Question Type

## 1. Request Audio Upload URL (Pre-signed URL)

Used by the frontend to get a secure, temporary URL to upload the raw audio file directly to cloud storage.

**Endpoint:** `POST /api/upload/audio-url`
**Auth Required:** Yes (Student role)

**Request Body:**
```json
{
  "contentType": "audio/webm",
  "fileSize": 1024500
}
```

**Response (200 OK):**
```json
{
  "uploadUrl": "https://s3.region.amazonaws.com/bucket/path/to/temp-file.webm?signature=...",
  "fileUrl": "https://cdn.example.com/path/to/temp-file.webm"
}
```

## 2. Submit Answer (Extended existing endpoint)

When submitting an assessment answer, the `oral` question type requires specific fields.

**Endpoint:** `POST /api/assessments/[id]/submit-answer`
**Auth Required:** Yes (Student role)

**Request Body (for Oral Question):**
```json
{
  "questionId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "audioUrl": "https://cdn.example.com/path/to/temp-file.webm",
  "skippedDueToMic": false
}
```

**Response (202 Accepted):**
```json
{
  "status": "pending",
  "message": "Answer received and queued for AI evaluation."
}
```

## 3. Poll Evaluation Status (Optional/Alternative to WebSockets)

If the client needs to poll for the grading status.

**Endpoint:** `GET /api/answers/[answerId]/status`
**Auth Required:** Yes (Student role)

**Response (200 OK):**
```json
{
  "status": "completed", // 'pending' | 'evaluating' | 'completed' | 'failed'
  "score": 85,
  "feedback": "Good pronunciation, but missed a key detail."
}
```
