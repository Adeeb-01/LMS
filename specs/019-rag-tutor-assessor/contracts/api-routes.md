# API Contracts: Interactive RAG Tutor & Semantic Assessor

**Feature**: 019-rag-tutor-assessor  
**Date**: 2026-04-07

## Server Actions

### `submitOralResponse`

Submit a student's oral response to an assessment.

**File**: `app/actions/oral-assessment.js`

**Input**:
```typescript
{
  assessmentId: string;        // OralAssessment._id
  audioBlob?: Blob;            // Voice recording (optional if text)
  textResponse?: string;       // Text fallback (optional if audio)
  inputMethod: 'voice' | 'text';
}
```

**Output**:
```typescript
{
  ok: boolean;
  error?: string;
  result?: {
    responseId: string;
    transcription: string;
    similarityScore: number;      // 0-1
    passed: boolean;
    conceptsCovered: string[];
    conceptsMissing: string[];
    feedback?: string;            // Optional GPT feedback
  }
}
```

**Authorization**: Student enrolled in course

**Validation** (Zod):
```javascript
const submitOralResponseSchema = z.object({
  assessmentId: z.string().min(1),
  textResponse: z.string().max(5000).optional(),
  inputMethod: z.enum(['voice', 'text'])
}).refine(
  data => data.inputMethod === 'text' ? !!data.textResponse : true,
  { message: 'Text response required when input method is text' }
);
```

---

### `askTutor`

Submit a question to the RAG tutor.

**File**: `app/actions/rag-tutor.js`

**Input**:
```typescript
{
  lessonId: string;
  audioBlob?: Blob;            // Voice question (optional if text)
  textQuestion?: string;       // Text question (optional if audio)
  inputMethod: 'voice' | 'text';
}
```

**Output**:
```typescript
{
  ok: boolean;
  error?: string;
  result?: {
    interactionId: string;
    question: string;           // Transcribed/provided question
    response: string;           // Tutor's answer
    isGrounded: boolean;        // False if no context found
    timestampLinks: Array<{
      seconds: number;
      label: string;
    }>;
    rateLimitWarning?: string;  // Warning if approaching limit
    reciteBackRequired: boolean;
  }
}
```

**Authorization**: Student enrolled in course

**Validation** (Zod):
```javascript
const askTutorSchema = z.object({
  lessonId: z.string().min(1),
  textQuestion: z.string().max(1000).optional(),
  inputMethod: z.enum(['voice', 'text'])
}).refine(
  data => data.inputMethod === 'text' ? !!data.textQuestion : true,
  { message: 'Text question required when input method is text' }
);
```

---

### `submitReciteBack`

Submit a recite-back attempt after tutor explanation.

**File**: `app/actions/rag-tutor.js`

**Input**:
```typescript
{
  interactionId: string;       // TutorInteraction._id
  audioBlob?: Blob;
  textRecitation?: string;
  inputMethod: 'voice' | 'text';
}
```

**Output**:
```typescript
{
  ok: boolean;
  error?: string;
  result?: {
    attemptId: string;
    similarityScore: number;
    passed: boolean;
    attemptNumber: number;
    attemptsRemaining: number;
    conceptGapLogged?: boolean;  // True if max attempts reached
  }
}
```

**Authorization**: Student enrolled in course, owns the interaction

---

### `getAssessmentPoints`

Fetch assessment checkpoints for a lesson.

**File**: `app/actions/oral-assessment.js`

**Input**:
```typescript
{
  lessonId: string;
}
```

**Output**:
```typescript
{
  ok: boolean;
  error?: string;
  assessments?: Array<{
    id: string;
    questionText: string;
    triggerTimestamp: number;
    completed: boolean;          // Has user responded?
    passed?: boolean;            // If completed, did they pass?
  }>
}
```

**Authorization**: Student enrolled in course

---

### `getConceptGapSummary`

Get session summary of concept gaps for a lesson.

**File**: `app/actions/oral-assessment.js`

**Input**:
```typescript
{
  lessonId: string;
}
```

**Output**:
```typescript
{
  ok: boolean;
  error?: string;
  summary?: {
    totalGaps: number;
    gaps: Array<{
      id: string;
      concept: string;
      source: 'assessment' | 'recite_back';
      failureCount: number;
      relatedTimestamp?: number;
    }>
  }
}
```

**Authorization**: Student enrolled in course

---

## Instructor Actions

### `createOralAssessment`

Manually create an oral assessment point.

**File**: `app/actions/oral-assessment.js`

**Input**:
```typescript
{
  lessonId: string;
  questionText: string;
  referenceAnswer: string;
  keyConcepts: string[];
  triggerTimestamp: number;
  passingThreshold?: number;    // Default 0.6
}
```

**Output**:
```typescript
{
  ok: boolean;
  error?: string;
  assessmentId?: string;
}
```

**Authorization**: Instructor owns course

---

### `reviewOralAssessment`

Approve or reject an auto-generated assessment.

**File**: `app/actions/oral-assessment.js`

**Input**:
```typescript
{
  assessmentId: string;
  action: 'approve' | 'reject';
}
```

**Output**:
```typescript
{
  ok: boolean;
  error?: string;
}
```

**Authorization**: Instructor owns course

---

### `triggerOralAssessmentGeneration`

Auto-generate oral assessments from lecture content.

**File**: `app/actions/oral-assessment.js`

**Input**:
```typescript
{
  lessonId: string;
  targetCount?: number;         // Default 5
}
```

**Output**:
```typescript
{
  ok: boolean;
  error?: string;
  jobId?: string;               // Background job ID
}
```

**Authorization**: Instructor owns course

---

## API Routes

### `POST /api/oral-assessment/[assessmentId]/submit`

Upload audio and get evaluation. Used when client needs multipart form data.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `{ audio: File, inputMethod: 'voice' }`

**Response**: Same as `submitOralResponse` output

---

### `POST /api/rag-tutor/query`

Submit voice question to RAG tutor. Used for audio uploads.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `{ audio: File, lessonId: string, inputMethod: 'voice' }`

**Response**: Same as `askTutor` output

---

### `GET /api/oral-assessment/lesson/[lessonId]`

Get assessment points for a lesson (used by video player on load).

**Response**: Same as `getAssessmentPoints` output

---

## WebSocket Events (Future Enhancement)

For real-time transcription feedback, consider WebSocket events:

```typescript
// Client → Server
{ type: 'audio_chunk', data: ArrayBuffer }
{ type: 'audio_end' }

// Server → Client  
{ type: 'transcription_partial', text: string }
{ type: 'transcription_final', text: string }
{ type: 'evaluation_complete', result: EvaluationResult }
```

*Note: WebSocket streaming is a future enhancement. Initial implementation uses request/response.*

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | Not enrolled / not instructor |
| `NOT_FOUND` | 404 | Assessment/lesson not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `TRANSCRIPTION_FAILED` | 500 | Whisper API error |
| `EVALUATION_FAILED` | 500 | Gemini/GPT API error |
| `RATE_LIMITED` | 429 | Tutor question limit exceeded (hard limit future) |
| `CONTENT_NOT_INDEXED` | 400 | Lesson not indexed in ChromaDB |
