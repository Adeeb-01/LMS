# Research: Text-Video Timestamp Synchronization

**Feature**: 013-text-video-sync  
**Date**: 2026-03-12

## Research Tasks

### 1. Speech-to-Text Service Selection

**Decision**: Use OpenAI Whisper via `@xenova/transformers` (Transformers.js) for local STT processing.

**Rationale**:
- Runs locally in Node.js without external API dependencies or costs
- Whisper provides word-level timestamps out of the box
- `@xenova/transformers` is the official ONNX port, well-maintained (5M+ weekly downloads)
- Supports multiple languages (matches assumption that doc/video are same language)
- `whisper-small` model balances accuracy (~95% WER) vs speed (~0.5x real-time on CPU)
- No data leaves the server (privacy benefit for educational content)
- MIT licensed

**Alternatives considered**:
- OpenAI Whisper API: Excellent accuracy but adds per-minute costs and external dependency
- Google Cloud Speech-to-Text: Requires GCP setup, per-minute billing
- AWS Transcribe: Requires AWS setup, per-minute billing
- Vosk: Lighter but less accurate, no word-level timestamps by default
- `whisper.cpp` + node binding: Faster but requires native compilation

**Installation**: `npm install @xenova/transformers`

**Model**: `Xenova/whisper-small` (244MB download, cached after first use)

### 2. Audio Extraction from Video

**Decision**: Use `fluent-ffmpeg` npm package for audio extraction.

**Rationale**:
- FFmpeg is the industry standard for audio/video processing
- `fluent-ffmpeg` provides clean Node.js API
- Extracts audio track without re-encoding (fast copy mode)
- Supports all video formats already accepted by the LMS (MP4, WebM)
- Output as WAV for Whisper compatibility (16kHz mono)
- Well-maintained with 1M+ weekly downloads

**Alternatives considered**:
- Direct ffmpeg CLI: Works but less clean integration with Node.js
- `node-ffmpeg`: Less maintained than fluent-ffmpeg
- `ffmpeg-static`: Can bundle with fluent-ffmpeg for self-contained deployment

**Installation**: 
```bash
npm install fluent-ffmpeg
npm install ffmpeg-static  # Bundled ffmpeg binary
```

**Command pattern**:
```javascript
ffmpeg(videoPath)
  .noVideo()
  .audioFrequency(16000)
  .audioChannels(1)
  .format('wav')
  .save(outputPath);
```

### 3. Text Alignment Algorithm

**Decision**: Use fuzzy sequence matching with sliding window approach.

**Rationale**:
- Document text blocks need to match against transcript segments
- Speakers often paraphrase, reorder, or skip content
- Fuzzy matching handles minor variations (word substitution, contractions)
- Sliding window limits search space for efficiency

**Algorithm outline**:
1. Tokenize document text blocks (paragraphs, headings)
2. Tokenize transcript into sentences with timestamps
3. For each document block:
   - Compute similarity scores against transcript segments
   - Use `string-similarity` or Levenshtein distance
   - Find best match above threshold (confidence score)
   - Record start/end timestamps from matched transcript segment
4. Handle edge cases:
   - No match found → mark as "not-spoken"
   - Multiple possible matches → take highest confidence
   - Overlapping matches → resolve by document order

**Implementation approach**:
```javascript
import stringSimilarity from 'string-similarity';

function alignTextBlocks(docBlocks, transcriptSegments) {
  return docBlocks.map(block => {
    const matches = transcriptSegments.map(seg => ({
      segment: seg,
      similarity: stringSimilarity.compareTwoStrings(
        normalize(block.content),
        normalize(seg.text)
      )
    }));
    
    const best = matches.sort((a, b) => b.similarity - a.similarity)[0];
    
    if (best.similarity >= 0.6) {  // Threshold for "matched"
      return {
        blockIndex: block.index,
        startSeconds: best.segment.start,
        endSeconds: best.segment.end,
        confidence: Math.round(best.similarity * 100),
        status: 'aligned'
      };
    }
    
    return {
      blockIndex: block.index,
      startSeconds: null,
      endSeconds: null,
      confidence: 0,
      status: 'not-spoken'
    };
  });
}
```

**Installation**: `npm install string-similarity`

### 4. Background Job Processing

**Decision**: Use in-process job queue with retry logic, stored in MongoDB.

**Rationale**:
- Alignment can take several minutes (2x video duration target)
- Need non-blocking processing that survives server restarts
- MongoDB already available; no need for Redis/external queue for MVP
- Job state stored in `AlignmentJob` collection
- Simple polling from client to check status

**Alternatives considered**:
- BullMQ + Redis: Production-grade but adds infrastructure complexity
- Agenda: MongoDB-based scheduler, heavier than needed
- Serverless functions: Timeout limits problematic for long videos
- In-memory queue: Lost on restart, unsuitable

**Implementation approach**:
```javascript
// Job states: queued → processing → completed → failed
// Retry: automatic once after 5 minutes (per clarification)

async function processAlignmentQueue() {
  const job = await AlignmentJob.findOneAndUpdate(
    { status: 'queued', scheduledFor: { $lte: new Date() } },
    { status: 'processing', startedAt: new Date() },
    { sort: { createdAt: 1 }, new: true }
  );
  
  if (!job) return;
  
  try {
    await runAlignment(job);
    await job.updateOne({ status: 'completed', completedAt: new Date() });
  } catch (error) {
    if (job.retryCount < 1) {
      // Schedule retry in 5 minutes
      await job.updateOne({
        status: 'queued',
        retryCount: job.retryCount + 1,
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000),
        lastError: error.message
      });
    } else {
      await job.updateOne({
        status: 'failed',
        errorMessage: error.message,
        failedAt: new Date()
      });
    }
  }
}

// Run queue processor on interval
setInterval(processAlignmentQueue, 10000);
```

### 5. Video Duration Validation

**Decision**: Check video duration before queuing alignment job.

**Rationale**:
- Spec requires 2-hour maximum (FR-020)
- FFprobe can extract duration without processing entire file
- Reject early with clear error message

**Implementation**:
```javascript
import ffmpeg from 'fluent-ffmpeg';

async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration); // in seconds
    });
  });
}

const MAX_DURATION_SECONDS = 2 * 60 * 60; // 2 hours

async function validateVideoForAlignment(videoPath) {
  const duration = await getVideoDuration(videoPath);
  if (duration > MAX_DURATION_SECONDS) {
    throw new Error(`Video exceeds 2-hour limit (${Math.round(duration / 60)} minutes)`);
  }
  return duration;
}
```

### 6. Confidence Score Calculation

**Decision**: Use fuzzy match similarity as confidence (0-100 scale).

**Rationale**:
- String similarity naturally produces 0-1 score
- Scale to 0-100 for user display
- 70% threshold for "low confidence" (per clarification)
- Simple, explainable metric

**Interpretation**:
| Score Range | Meaning | UI Treatment |
|-------------|---------|--------------|
| 85-100 | High confidence | Green indicator, no flag |
| 70-84 | Moderate confidence | Yellow indicator, no flag |
| 0-69 | Low confidence | Red indicator, flagged for review |

### 7. Transcript Storage Strategy

**Decision**: Store full transcript in MongoDB, permanently (per clarification).

**Rationale**:
- Enables re-alignment without re-running STT (expensive)
- Supports future features: search within video, transcript display
- Storage cost minimal vs video files
- Delete only when video is deleted (cascade rule)

**Structure**:
```javascript
{
  lessonId: ObjectId,
  courseId: ObjectId,
  language: "en",  // detected by Whisper
  duration: 1800,  // seconds
  segments: [
    { start: 0.0, end: 2.5, text: "Welcome to today's lecture" },
    { start: 2.5, end: 5.1, text: "on oral pathology" },
    // ... word-level timestamps
  ],
  words: [
    { start: 0.0, end: 0.3, word: "Welcome" },
    { start: 0.3, end: 0.5, word: "to" },
    // ... full word list
  ],
  createdAt: Date,
  processingDurationMs: Number
}
```

### 8. Click-to-Seek Implementation

**Decision**: Use existing video player's programmatic seek API.

**Rationale**:
- Project uses standard HTML5 video player
- `videoElement.currentTime = seconds` is native API
- React ref to video element from parent component
- Pass timestamp via callback/context

**Implementation pattern**:
```javascript
// In study-materials.jsx
function handleTextClick(blockTimestamp) {
  if (!blockTimestamp.startSeconds) {
    toast.info("This content was not covered in the video");
    return;
  }
  videoRef.current.currentTime = blockTimestamp.startSeconds;
  videoRef.current.play();
}
```

### 9. Playback Position Highlighting

**Decision**: Use video `timeupdate` event to track current text block.

**Rationale**:
- HTML5 video fires `timeupdate` ~4 times per second
- Compare currentTime against text block timestamp ranges
- Update highlighted block via React state
- Debounce to avoid excessive re-renders

**Implementation pattern**:
```javascript
function VideoTextSync({ alignments }) {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(null);
  
  const handleTimeUpdate = useCallback((e) => {
    const time = e.target.currentTime;
    const activeBlock = alignments.find(a => 
      a.startSeconds <= time && time <= a.endSeconds
    );
    setCurrentBlockIndex(activeBlock?.blockIndex ?? null);
  }, [alignments]);
  
  return (
    <video onTimeUpdate={handleTimeUpdate} ... />
  );
}
```

## Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| @xenova/transformers | ^2.17.0 | Whisper STT (local) |
| fluent-ffmpeg | ^2.1.2 | Audio extraction |
| ffmpeg-static | ^5.2.0 | Bundled ffmpeg binary |
| string-similarity | ^4.0.4 | Text alignment scoring |
| (existing) mongoose | ^8.x | MongoDB ODM |
| (existing) zod | ^3.x | Schema validation |

## Open Questions Resolved

All technical questions resolved. Ready for Phase 1 design.
