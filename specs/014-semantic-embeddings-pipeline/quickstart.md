# Quickstart: Semantic Embeddings Pipeline

**Feature**: 014-semantic-embeddings-pipeline  
**Date**: 2026-03-12

## Prerequisites

- Node.js 18+ with npm
- MongoDB running (from 011-configure-databases)
- ChromaDB running (from 011-configure-databases)
- Gemini API key (free tier available)
- Completed 012-docx-text-extraction setup

## Environment Variables

Add to your `.env.local`:

```bash
# Existing (from 011-configure-databases)
MONGODB_URI=mongodb://localhost:27017/lms
CHROMA_HOST=http://localhost:8000
CHROMA_COLLECTION=lms_embeddings

# New for this feature
GEMINI_API_KEY=your-gemini-api-key-here
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API key" → "Create API key"
4. Copy the key to your `.env.local`

Free tier includes 1,500 requests/minute, sufficient for development.

## Installation

```bash
# Install new dependency
npm install @google/generative-ai
```

## Verify Setup

### 1. Check ChromaDB Connection

```bash
curl http://localhost:8000/api/v1/heartbeat
# Expected: {"nanosecond heartbeat":...}
```

### 2. Test Gemini API

Create a test file `test-gemini.js`:

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

async function test() {
  const result = await model.embedContent('Hello world');
  console.log('Embedding dimension:', result.embedding.values.length);
  console.log('First 5 values:', result.embedding.values.slice(0, 5));
}

test();
```

Run:
```bash
node --env-file=.env.local test-gemini.js
# Expected: Embedding dimension: 768
```

### 3. Run the Development Server

```bash
npm run dev
```

## Usage Flow

### For Instructors (Indexing)

1. Upload a lecture document to a lesson (via 012-docx-text-extraction)
2. System automatically queues the document for embedding
3. View indexing status on the lesson page
4. When status shows "Indexed", content is searchable

### For Students (Search)

1. Navigate to an enrolled course
2. Use the search component to ask questions
3. View results ranked by relevance
4. Click results to navigate to source lessons

## Development Commands

```bash
# Run all tests
npm test

# Run specific tests for this feature
npm test -- --testPathPattern="embedding|semantic-search"

# Run linter
npm run lint

# Type check (if using JSDoc types)
npx tsc --noEmit
```

## Troubleshooting

### "GEMINI_API_KEY not configured"

Ensure `.env.local` contains the API key and restart the dev server.

### "ChromaDB unavailable"

1. Check ChromaDB is running: `docker ps | grep chroma`
2. Verify host in `.env.local` matches container port
3. Check health endpoint: `curl http://localhost:8000/api/v1/heartbeat`

### "No results found" when content exists

1. Verify document status is "indexed" (not "processing" or "failed")
2. Check query is at least 3 characters
3. Try broader search terms
4. Verify you're searching the correct course

### Indexing stuck in "processing"

1. Check server logs for errors
2. Verify Gemini API key is valid
3. Check job queue for failed jobs:
   ```javascript
   // In MongoDB shell
   db.indexingjobs.find({ status: 'failed' })
   ```

## API Quick Reference

### Search Content

```bash
curl -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"query": "your question", "courseId": "<course-id>"}'
```

### Check Status

```bash
curl "http://localhost:3000/api/semantic-search/status?courseId=<course-id>" \
  -H "Cookie: <your-session-cookie>"
```

## File Structure After Implementation

```text
lib/
├── embeddings/
│   ├── gemini.js         # Embedding generation
│   └── chunker.js        # Heading-aware chunking

service/
├── embedding-queue.js    # Job queue (max 5 concurrent)
└── semantic-search.js    # Search with enrollment check

model/
└── indexing-job.model.js # Job tracking

app/
├── actions/
│   ├── semantic-search.js
│   └── indexing.js
└── api/semantic-search/
    └── route.js
```
