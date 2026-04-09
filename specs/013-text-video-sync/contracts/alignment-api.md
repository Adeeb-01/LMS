# API Contract: Text-Video Alignment

**Feature**: 013-text-video-sync  
**Date**: 2026-03-12

## Server Actions

Located in `app/actions/alignment.js`

### triggerAlignment

Queues a new alignment job for a lesson with uploaded document.

**Signature**:
```javascript
async function triggerAlignment(lessonId, courseId)
```

**Authorization**: Course instructor only

**Preconditions**:
- Lesson must have associated LectureDocument with status "ready"
- Lesson must have video (local or external)
- Video duration must be ≤ 2 hours
- No existing alignment job in "queued" or "processing" status

**Input Validation** (Zod):
```javascript
const triggerAlignmentSchema = z.object({
  lessonId: z.string().min(1),
  courseId: z.string().min(1)
});
```

**Response**:
```javascript
// Success
{ 
  success: true, 
  jobId: "65f...", 
  message: "Alignment queued successfully" 
}

// Error cases
{ success: false, error: "Lesson has no uploaded document" }
{ success: false, error: "Document extraction not complete" }
{ success: false, error: "Lesson has no video" }
{ success: false, error: "Video exceeds 2-hour limit" }
{ success: false, error: "Alignment already in progress" }
```

---

### getAlignmentStatus

Gets the current alignment status for a lesson.

**Signature**:
```javascript
async function getAlignmentStatus(lessonId, courseId)
```

**Authorization**: Course instructor or enrolled student

**Response**:
```javascript
// No alignment exists
{ 
  hasAlignment: false,
  canTrigger: true,  // true if preconditions met
  message: "No alignment data available"
}

// Job in progress
{
  hasAlignment: false,
  jobStatus: "processing",
  phase: "transcription",
  progress: 45,
  message: "Generating video transcript..."
}

// Alignment complete
{
  hasAlignment: true,
  alignmentStatus: "completed",
  totalBlocks: 24,
  alignedBlocks: 20,
  notSpokenBlocks: 4,
  lowConfidenceBlocks: 3,  // blocks < 70% confidence
  lastUpdated: "2026-03-12T10:30:00Z"
}

// Alignment failed
{
  hasAlignment: false,
  jobStatus: "failed",
  errorMessage: "Audio extraction failed",
  canRetry: true
}
```

---

### getAlignments

Gets all text block alignments for a lesson.

**Signature**:
```javascript
async function getAlignments(lessonId, courseId)
```

**Authorization**: Course instructor or enrolled student

**Response**:
```javascript
{
  success: true,
  alignments: [
    {
      blockIndex: 0,
      startSeconds: 12.5,
      endSeconds: 45.3,
      confidence: 92,
      status: "aligned",
      manuallyVerified: false
    },
    {
      blockIndex: 1,
      startSeconds: null,
      endSeconds: null,
      confidence: 0,
      status: "not-spoken",
      manuallyVerified: false
    },
    // ... more blocks
  ],
  videoDuration: 1823.5,  // total video length in seconds
  transcriptLanguage: "en"
}
```

---

### adjustTimestamp

Manually adjusts the timestamp for a text block (instructor only).

**Signature**:
```javascript
async function adjustTimestamp(lessonId, courseId, blockIndex, startSeconds, endSeconds)
```

**Authorization**: Course instructor only

**Input Validation** (Zod):
```javascript
const adjustTimestampSchema = z.object({
  blockIndex: z.number().int().min(0),
  startSeconds: z.number().min(0).nullable(),
  endSeconds: z.number().min(0).nullable()
}).refine(
  data => data.startSeconds === null || data.endSeconds === null || 
          data.startSeconds <= data.endSeconds,
  { message: 'Start time must be before end time' }
);
```

**Response**:
```javascript
// Success
{
  success: true,
  message: "Timestamp updated and marked as verified"
}

// Error
{ success: false, error: "Block index out of range" }
{ success: false, error: "No alignment data exists" }
```

---

### retryAlignment

Manually triggers a retry for a failed alignment job.

**Signature**:
```javascript
async function retryAlignment(lessonId, courseId)
```

**Authorization**: Course instructor only

**Preconditions**:
- Must have a failed alignment job for this lesson
- Must not exceed retry limit (automatic + manual combined)

**Response**:
```javascript
// Success
{ success: true, jobId: "65f...", message: "Retry queued" }

// Error
{ success: false, error: "No failed alignment to retry" }
{ success: false, error: "Retry limit exceeded" }
```

---

## REST API Endpoints

### GET /api/alignments/lesson/[lessonId]

Gets alignment data for a lesson. Used for client-side data fetching.

**Authorization**: Course instructor or enrolled student (verified via session + enrollment)

**Response**: Same as `getAlignments` Server Action

---

### GET /api/alignments/job/[jobId]

Gets status of a specific alignment job.

**Authorization**: Course instructor only

**Response**:
```javascript
{
  id: "65f...",
  lessonId: "65e...",
  status: "processing",
  phase: "alignment",
  progress: 78,
  startedAt: "2026-03-12T10:25:00Z",
  estimatedCompletion: "2026-03-12T10:35:00Z"
}
```

---

## WebSocket Events (Future Enhancement)

Not implemented in MVP. Client polls `/api/alignments/job/[jobId]` every 5 seconds during processing.

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| ALIGNMENT_NOT_FOUND | 404 | No alignment data for this lesson |
| JOB_NOT_FOUND | 404 | Alignment job not found |
| DOCUMENT_NOT_READY | 400 | Document extraction not complete |
| NO_VIDEO | 400 | Lesson has no associated video |
| VIDEO_TOO_LONG | 400 | Video exceeds 2-hour limit |
| ALIGNMENT_IN_PROGRESS | 409 | Alignment already queued or processing |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized for this course |

---

## Client Integration

### Click-to-Seek Pattern

```javascript
// In study-materials.jsx
import { getAlignments } from '@/app/actions/alignment';

function StudyMaterials({ lessonId, courseId, videoRef }) {
  const [alignments, setAlignments] = useState([]);
  
  useEffect(() => {
    getAlignments(lessonId, courseId).then(res => {
      if (res.success) setAlignments(res.alignments);
    });
  }, [lessonId, courseId]);
  
  const handleBlockClick = (blockIndex) => {
    const alignment = alignments.find(a => a.blockIndex === blockIndex);
    if (alignment?.startSeconds != null) {
      videoRef.current.currentTime = alignment.startSeconds;
      videoRef.current.play();
    } else {
      toast.info("This content was not covered in the video");
    }
  };
  
  return (
    <div>
      {textBlocks.map((block, idx) => (
        <TextBlock 
          key={idx}
          content={block.content}
          alignment={alignments.find(a => a.blockIndex === idx)}
          onClick={() => handleBlockClick(idx)}
        />
      ))}
    </div>
  );
}
```

### Playback Position Sync Pattern

```javascript
// In video-text-sync.jsx
function VideoTextSync({ alignments }) {
  const [activeBlock, setActiveBlock] = useState(null);
  
  const handleTimeUpdate = useCallback((e) => {
    const time = e.target.currentTime;
    const current = alignments.find(a => 
      a.status === 'aligned' &&
      a.startSeconds <= time && 
      time <= a.endSeconds
    );
    setActiveBlock(current?.blockIndex ?? null);
  }, [alignments]);
  
  return { activeBlock, handleTimeUpdate };
}
```
