# Research: Semantic Embeddings Pipeline

**Feature**: 014-semantic-embeddings-pipeline  
**Date**: 2026-03-12

## Research Tasks

### 1. Gemini Embedding API Selection

**Decision**: Use `@google/generative-ai` package with `text-embedding-004` model.

**Rationale**:
- Official Google SDK for JavaScript/Node.js
- `text-embedding-004` produces 768-dimensional embeddings (matches spec assumption)
- Supports batch embedding for efficiency (up to 100 texts per request)
- Rate limits: 1,500 requests/minute on free tier, sufficient for batch processing
- Well-documented with TypeScript types

**Alternatives considered**:
- `@xenova/transformers`: Local embedding models, but requires significant memory
- OpenAI embeddings: Additional API key management, higher cost
- Cohere embeddings: Less common, additional vendor relationship

**Installation**: `npm install @google/generative-ai`

**API usage pattern**:
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

const result = await model.embedContent(text);
const embedding = result.embedding.values; // 768-dim array
```

### 2. Heading-Aware Chunking Strategy

**Decision**: Extend existing `lib/docx/chunker.js` with heading detection from `structuredContent`.

**Rationale**:
- LectureDocument already stores `structuredContent` array with heading types/levels
- Chunking by headings preserves semantic boundaries (spec FR-001, FR-002)
- Fall back to paragraph chunking for documents without headings (spec edge case)
- 2000 token limit with paragraph-boundary splitting (spec FR-010)

**Implementation approach**:
1. Parse `structuredContent` array from LectureDocument
2. Group content blocks by heading hierarchy
3. For each heading section:
   - If section < 2000 tokens: single chunk with heading path metadata
   - If section > 2000 tokens: split at paragraph boundaries, preserve heading context
4. Generate heading path (e.g., "Chapter 1 > Section 1.1 > Subsection 1.1.1")

**Token estimation**: ~4 characters per token (English text average)

### 3. ChromaDB Integration Pattern

**Decision**: Extend existing `service/chroma.js` with course-namespaced collections.

**Rationale**:
- Spec assumption: "Each course maintains a separate logical collection/namespace"
- Existing `getCollection()` returns single collection
- Course namespacing via metadata filter is more practical than separate collections
- ChromaDB `where` filter supports efficient metadata filtering

**Implementation approach**:
1. Use single `lms_embeddings` collection (existing)
2. Add `courseId` to all embedding metadata for filtering
3. Search with `where: { courseId }` to scope results
4. Delete with `where: { courseId, lectureDocumentId }` for cleanup

**Chunk ID format**: `embed-${courseId}-${lectureDocId}-${chunkIndex}`

### 4. Job Queue Implementation

**Decision**: Implement simple in-memory job queue with MongoDB persistence for crash recovery.

**Rationale**:
- Spec FR-013: Max 5 concurrent jobs
- In-memory queue provides immediate job tracking
- MongoDB `IndexingJob` model provides crash recovery
- No external queue service needed for this scale

**Implementation approach**:
```text
Job States: pending → processing → completed → failed
                ↓
             cancelled (when re-upload during processing)
```

1. On document upload: Create `IndexingJob` with status `pending`
2. Queue processor: Poll for pending jobs, process up to 5 concurrently
3. On cancel (re-upload): Mark current job `cancelled`, create new job
4. On failure: Mark `failed`, increment retry count, re-queue if retries < 3
5. On success: Mark `completed`, update LectureDocument `embeddingStatus`

**Retry strategy**: Exponential backoff (1s, 2s, 4s) with max 3 retries

### 5. Search Implementation

**Decision**: Two-phase search with enrollment verification.

**Rationale**:
- Spec FR-005: Students search only enrolled courses
- ChromaDB returns chunk IDs + similarity scores
- Full content fetched from MongoDB with access control
- Spec FR-011/FR-012: Max 5 results, 0.7 threshold

**Implementation approach**:
1. Validate user enrollment for requested course
2. Generate query embedding via Gemini
3. Search ChromaDB with course filter
4. Filter results by 0.7 threshold
5. Enrich results with heading path, lesson info from MongoDB
6. Return top 5 results

**Response format**:
```javascript
{
  query: "original query",
  results: [
    {
      chunkId: "embed-...",
      score: 0.85,
      text: "chunk content...",
      headingPath: "Chapter 1 > Section 1.1",
      lessonId: "...",
      lessonTitle: "Introduction to...",
      courseId: "..."
    }
  ],
  totalMatches: 12,  // before threshold filter
  searchTimeMs: 150
}
```

### 6. Concurrent Re-upload Handling

**Decision**: Cancel in-progress job atomically and start fresh.

**Rationale**:
- Spec clarification: "Cancel in-progress job and start fresh with new document"
- Must handle race conditions between job processor and cancel request

**Implementation approach**:
1. On re-upload: Set `IndexingJob.status = 'cancelled'` atomically
2. Job processor checks status before each step (chunk, embed, store)
3. If cancelled detected mid-processing: stop, clean up partial embeddings
4. New job created with fresh document content

### 7. Error Handling and Retry Strategy

**Decision**: Unified retry with exponential backoff for both Gemini and ChromaDB.

**Rationale**:
- Spec clarification: Same retry strategy for Gemini API and ChromaDB
- Consistent error handling simplifies implementation
- Max 3 retries covers transient network issues

**Error categories**:
| Error Type | Handling | User Message |
|------------|----------|--------------|
| Gemini rate limit | Retry with backoff | (silent, background) |
| Gemini API error | Retry with backoff | (silent, background) |
| ChromaDB unavailable | Retry with backoff | "Search temporarily unavailable" |
| Invalid document | Fail immediately | "Document could not be processed" |
| Max retries exceeded | Mark failed | "Indexing failed, please retry" |

### 8. Environment Variables

**Required variables**:
```
GEMINI_API_KEY=your-api-key           # Required for embeddings
CHROMA_HOST=http://localhost:8000     # Existing from 011
CHROMA_COLLECTION=lms_embeddings      # Existing from 011
```

## Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| @google/generative-ai | ^0.21.0 | Gemini embedding generation |
| (existing) chromadb | - | Vector storage and search |
| (existing) mongoose | ^8.x | MongoDB ODM |
| (existing) zod | ^3.x | Schema validation |

## Open Questions Resolved

All technical questions resolved via spec clarifications:
- ✅ Access control: Enrollment-scoped search
- ✅ Concurrent re-upload: Cancel and restart
- ✅ API failure: Exponential backoff retry
- ✅ Relevance threshold: 0.7
- ✅ Concurrent jobs: Max 5

Ready for Phase 1 design.
