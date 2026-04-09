# Quickstart: AI Generation & Vectorization Pipeline

**Feature**: 017-ai-generation-pipeline  
**Date**: 2026-03-16

## Prerequisites

Before implementing this Epic, ensure the following dependencies are complete:

| Dependency | Verification Command | Expected Result |
|------------|---------------------|-----------------|
| 012-docx-text-extraction | Check `model/lecture-document.model.js` exists | LectureDocument schema present |
| 013-text-video-sync | Check `model/alignment-job.model.js` exists | AlignmentJob schema present |
| 014-semantic-embeddings-pipeline | Check `service/chroma.js` exists | ChromaDB integration working |
| 015-auto-mcq-generation | Check `service/mcq-generation-queue.js` exists | MCQ generation pipeline working |
| 010-add-oral-question | Check Question model has `type: 'oral'` | Oral question type supported |

## Environment Variables

Add to your `.env` file (if not already present from dependencies):

```env
# Gemini API (required for generation)
GEMINI_API_KEY=your-gemini-api-key

# ChromaDB (required for embeddings)
CHROMA_HOST=http://localhost:8000
CHROMA_COLLECTION=lms_embeddings

# MongoDB (existing)
MONGODB_URI=mongodb://localhost:27017/lms
```

## Local Development Setup

### 1. Start Dependencies

```bash
# Start MongoDB (if not running)
mongod --dbpath /data/db

# Start ChromaDB (if not running)
docker run -d -p 8000:8000 chromadb/chroma

# Verify ChromaDB is accessible
curl http://localhost:8000/api/v1/heartbeat
```

### 2. Install New Dependencies

No new npm packages required for this Epic. All dependencies are already installed from previous specs.

### 3. Create New Model Files

```bash
# Create the new model files
touch model/pipeline-job.model.js
touch model/oral-generation-job.model.js
```

### 4. Create Service Files

```bash
# Create the new service files
touch service/pipeline-orchestrator.js
touch service/oral-generation-queue.js
```

### 5. Create Library Files

```bash
# Create oral generation library
mkdir -p lib/oral-generation
touch lib/oral-generation/generator.js
touch lib/oral-generation/duplicate-detector.js
touch lib/oral-generation/reference-answer-builder.js
```

### 6. Create Server Actions

```bash
# Create new action files
touch app/actions/pipeline.js
touch app/actions/oral-generation.js
```

### 7. Create API Routes

```bash
# Create API route directories
mkdir -p "app/api/pipeline/[lessonId]/status"
mkdir -p "app/api/oral-generation/[jobId]"

# Create route files
touch "app/api/pipeline/[lessonId]/status/route.js"
touch "app/api/oral-generation/[jobId]/route.js"
touch "app/api/oral-generation/route.js"
```

### 8. Create UI Components

```bash
# Create pipeline dashboard components
mkdir -p "app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/pipeline/_components"
touch "app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/pipeline/page.jsx"
touch "app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/pipeline/_components/pipeline-dashboard.jsx"

# Create shared pipeline components
mkdir -p components/pipeline
touch components/pipeline/stage-indicator.jsx
touch components/pipeline/progress-summary.jsx
touch components/pipeline/retry-button.jsx
```

## Testing Setup

### Unit Tests

```bash
# Create test directories
mkdir -p __tests__/lib/oral-generation
mkdir -p __tests__/service

# Create test files
touch __tests__/lib/oral-generation/generator.test.js
touch __tests__/lib/oral-generation/duplicate-detector.test.js
touch __tests__/service/pipeline-orchestrator.test.js
touch __tests__/service/oral-generation-queue.test.js
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/lib/oral-generation/generator.test.js

# Run with coverage
npm test -- --coverage
```

## Manual Testing Workflow

### 1. Create Test Data

1. Create a course as an instructor
2. Create a lesson with both video and DOCX document
3. Verify document extraction completes (012)
4. Verify alignment completes (013)
5. Verify indexing completes (014)

### 2. Test Pipeline Orchestration

```javascript
// In browser console or via API client
const response = await fetch('/api/pipeline', {
  method: 'POST',
  body: JSON.stringify({ lessonId: 'your-lesson-id' }),
  headers: { 'Content-Type': 'application/json' }
});
console.log(await response.json());
```

### 3. Monitor Pipeline Status

```javascript
// Poll for status
const checkStatus = async (lessonId) => {
  const response = await fetch(`/api/pipeline/${lessonId}/status`);
  const data = await response.json();
  console.log('Pipeline status:', data);
  return data;
};

// Poll every 3 seconds
const interval = setInterval(async () => {
  const status = await checkStatus('your-lesson-id');
  if (status.pipeline?.status === 'completed' || status.pipeline?.status === 'failed') {
    clearInterval(interval);
    console.log('Pipeline finished!', status);
  }
}, 3000);
```

### 4. Verify Generated Questions

1. Navigate to the quiz editor for the lesson
2. Verify MCQs were generated (from 015)
3. Verify oral questions were generated (new)
4. Check that oral questions have:
   - `type: 'oral'`
   - `referenceAnswer` with key points
   - `isDraft: true`
   - `sourceChunkId` linking to content

## Troubleshooting

### Pipeline Stuck in 'pending'

1. Check if 5 concurrent pipelines are already running:
   ```javascript
   db.pipelinejobs.countDocuments({ status: 'processing' })
   ```
2. If at limit, wait for existing pipelines to complete

### Oral Generation Skipping All Chunks

1. Verify chunks have sufficient content (100+ words)
2. Check ChromaDB has indexed content:
   ```javascript
   const chunks = await getChunksByLesson(lessonId);
   console.log('Chunks:', chunks.length);
   ```

### Gemini API Errors

1. Verify `GEMINI_API_KEY` is set correctly
2. Check API quota: https://console.cloud.google.com/
3. Look for rate limit errors in logs

### Questions Not Appearing in Quiz

1. Verify questions were created with `isDraft: true`
2. Check quiz ID matches:
   ```javascript
   db.questions.find({ oralGenerationJobId: ObjectId('job-id') })
   ```

## Next Steps

After completing setup:

1. Implement models: `model/pipeline-job.model.js`, `model/oral-generation-job.model.js`
2. Implement services: `service/pipeline-orchestrator.js`, `service/oral-generation-queue.js`
3. Implement generator: `lib/oral-generation/generator.js`
4. Implement actions: `app/actions/pipeline.js`, `app/actions/oral-generation.js`
5. Implement API routes
6. Implement UI components
7. Add i18n strings to `messages/en.json` and `messages/ar.json`

See [tasks.md](./tasks.md) for detailed implementation breakdown.
