# Quickstart: Text-Video Timestamp Synchronization

**Feature**: 013-text-video-sync  
**Date**: 2026-03-12

## Prerequisites

1. **012-docx-text-extraction** must be implemented and working
2. FFmpeg must be available (installed via `ffmpeg-static`)
3. Node.js 18+ for Transformers.js compatibility

## Installation

```bash
# Install new dependencies
npm install @xenova/transformers fluent-ffmpeg ffmpeg-static string-similarity
```

## Environment Variables

No new environment variables required. Uses existing:
- `MONGODB_URI` - Database connection
- Existing auth configuration

## Database Setup

Models are created automatically on first use. No manual migrations required.

## Quick Verification Steps

### 1. Verify FFmpeg Installation

```javascript
// Run in Node.js REPL or test file
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

// Should output ffmpeg version info
ffmpeg.getAvailableFormats((err, formats) => {
  if (err) console.error('FFmpeg not working:', err);
  else console.log('FFmpeg ready, formats available:', Object.keys(formats).length);
});
```

### 2. Verify Whisper Model Loading

```javascript
// First run downloads ~244MB model
import { pipeline } from '@xenova/transformers';

const transcriber = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-small',
  { quantized: true }
);

console.log('Whisper model loaded successfully');
```

### 3. Test Alignment Trigger (after implementation)

1. Create a lesson with a video
2. Upload a DOCX document via 012-docx-text-extraction
3. Wait for document extraction to complete
4. Trigger alignment:

```javascript
import { triggerAlignment } from '@/app/actions/alignment';

const result = await triggerAlignment(lessonId, courseId);
console.log(result);
// { success: true, jobId: "...", message: "Alignment queued successfully" }
```

5. Poll for status:

```javascript
import { getAlignmentStatus } from '@/app/actions/alignment';

const status = await getAlignmentStatus(lessonId, courseId);
console.log(status);
// { hasAlignment: false, jobStatus: "processing", phase: "transcription", progress: 45 }
```

## Development Workflow

### 1. Implement Core Library Functions

```text
lib/alignment/
├── audio-extractor.js   # Extract audio from video
├── transcriber.js       # Whisper STT integration
├── text-aligner.js      # Match document to transcript
└── job-processor.js     # Background job runner
```

### 2. Create Database Models

```text
model/
├── video-transcript.model.js
└── alignment-job.model.js
```

### 3. Implement Server Actions

```text
app/actions/alignment.js
├── triggerAlignment()
├── getAlignmentStatus()
├── getAlignments()
├── adjustTimestamp()
└── retryAlignment()
```

### 4. Create UI Components

```text
components/alignment/
├── timestamp-badge.jsx
└── confidence-indicator.jsx

app/[locale]/dashboard/.../alignment/_components/
├── alignment-status.jsx
└── alignment-review.jsx
```

### 5. Extend Existing Components

- `study-materials.jsx` - Add click-to-seek
- Video player - Add time sync callbacks

## Testing

### Unit Tests

```bash
# Run alignment-specific tests
npm test -- --grep "alignment"
```

### Manual Testing Checklist

- [ ] Trigger alignment on lesson with document + video
- [ ] Verify job progresses through phases
- [ ] Check alignment results after completion
- [ ] Click text block → video seeks to timestamp
- [ ] Video playback → correct text block highlighted
- [ ] Instructor can adjust timestamp manually
- [ ] Failed job retries automatically after 5 minutes
- [ ] Video >2 hours rejected with error

## Troubleshooting

### "FFmpeg not found"

Ensure `ffmpeg-static` is installed and path is set:
```javascript
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
```

### "Model download failed"

Whisper model downloads on first use (~244MB). Ensure:
- Stable internet connection
- Sufficient disk space
- No corporate proxy blocking HuggingFace

### "Alignment takes too long"

Processing target is 2x video duration. For a 1-hour video:
- Expected: ~2 hours processing time
- STT is the bottleneck; runs on CPU by default
- Consider GPU acceleration for production (CUDA/WebGPU)

### "Low confidence scores"

Common causes:
- Speaker paraphrases significantly
- Document contains content not spoken
- Audio quality issues (background noise)
- Language mismatch between document and video

## Performance Notes

- First Whisper run downloads model (one-time)
- Model stays in memory after first transcription
- Audio extraction is fast (~10s for 1-hour video)
- Transcription is CPU-bound (~0.5x real-time on modern CPU)
- Alignment algorithm is fast (<5s for typical documents)
