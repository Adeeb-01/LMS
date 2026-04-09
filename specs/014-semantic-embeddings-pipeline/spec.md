# Feature Specification: Semantic Embeddings Pipeline

**Feature Branch**: `014-semantic-embeddings-pipeline`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "As an AI Developer, I want to parse the text based on its structural headings, convert these chunks into embeddings using Gemini, and store them in ChromaDB, so that I can build a robust semantic knowledge base capable of instantly and accurately answering student queries later"

## Clarifications

### Session 2026-03-12

- Q: Who can search which content? → A: Students can only search content from courses they are enrolled in.
- Q: What happens if a document is re-uploaded while still being indexed? → A: Cancel in-progress job and start fresh with new document.
- Q: How should Gemini API failures be handled? → A: Retry with exponential backoff (same as ChromaDB).
- Q: What should the minimum relevance threshold be? → A: 0.7 (balanced threshold for semantic search).
- Q: Should there be a limit on concurrent indexing jobs? → A: 5 concurrent jobs maximum (system-wide).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Content Indexing (Priority: P1)

When a teacher uploads a lecture document to a lesson, the system automatically processes the document content by splitting it into logical chunks based on structural headings, generates embeddings using Gemini, and stores them in ChromaDB for future semantic search.

**Why this priority**: This is the core pipeline functionality. Without automatic indexing, there is no knowledge base to query. This enables all downstream search and Q&A capabilities.

**Independent Test**: Can be fully tested by uploading a lecture document with multiple headings and verifying that chunks appear in ChromaDB with correct metadata. Delivers the foundational knowledge base storage.

**Acceptance Scenarios**:

1. **Given** a lesson with an uploaded lecture document containing multiple headings, **When** the document is processed, **Then** the system creates separate chunks for each heading section and stores them in ChromaDB with lesson/course metadata.

2. **Given** a document with nested headings (H1, H2, H3), **When** processing occurs, **Then** chunks preserve the heading hierarchy in their metadata for context-aware retrieval.

3. **Given** a document has already been processed, **When** a new version is uploaded, **Then** the previous embeddings are replaced with the new content's embeddings.

---

### User Story 2 - Student Semantic Search (Priority: P2)

Students can ask questions in natural language about course content, and the system retrieves the most relevant chunks from the indexed knowledge base to provide accurate answers.

**Why this priority**: This is the primary value delivery to students. It depends on P1 (indexing) being complete but represents the core user-facing functionality.

**Independent Test**: Can be tested by querying the indexed content with various question phrasings and verifying relevant chunks are returned. Delivers immediate learning value to students.

**Acceptance Scenarios**:

1. **Given** indexed lecture content for a course, **When** a student asks a question related to the content, **Then** the system returns the top relevant chunks ranked by semantic similarity.

2. **Given** a query that matches multiple sections, **When** search is performed, **Then** results include the heading context and source lesson information.

3. **Given** a query with no relevant matches in the course, **When** search is performed, **Then** the system indicates no relevant content was found rather than returning irrelevant results.

---

### User Story 3 - Processing Status Visibility (Priority: P3)

Teachers and administrators can see the indexing status of lecture documents to know when content is ready for student queries.

**Why this priority**: Provides transparency into the pipeline state. Important for user confidence but not blocking core functionality.

**Independent Test**: Can be tested by uploading a document and observing status updates through the UI. Delivers operational visibility.

**Acceptance Scenarios**:

1. **Given** a document is being processed, **When** a teacher views the lesson, **Then** they see an "Indexing in progress" status indicator.

2. **Given** processing completes successfully, **When** a teacher views the lesson, **Then** they see "Indexed" status with the number of chunks created.

3. **Given** processing fails, **When** a teacher views the lesson, **Then** they see an error status with a retry option.

---

### Edge Cases

- What happens when a document has no recognizable headings? System treats the entire document as a single chunk.
- How does the system handle very large sections under one heading? Sections exceeding 2000 tokens are split at paragraph boundaries while maintaining heading context.
- What happens if ChromaDB is unavailable during processing? Processing is queued and retried with exponential backoff; document is marked as "pending indexing".
- What happens if Gemini API fails or is rate-limited? Processing is retried with exponential backoff; document remains in "processing" state until successful or max retries exceeded.
- How are documents with mixed languages handled? Embeddings are generated in the document's detected language; cross-language queries may have reduced accuracy.
- What happens when a lesson is deleted? Associated embeddings are removed from ChromaDB to prevent orphaned data.
- What happens if a document is re-uploaded while still being indexed? The in-progress job is cancelled and a new job starts with the latest document version.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse uploaded lecture documents and split content into chunks based on structural headings (H1-H6).
- **FR-002**: System MUST preserve heading hierarchy metadata (parent headings) for each chunk to provide context.
- **FR-003**: System MUST generate embeddings for each chunk using the Gemini embedding model.
- **FR-004**: System MUST store embeddings in ChromaDB with metadata including: lesson ID, course ID, heading path, chunk sequence, and source document reference.
- **FR-005**: System MUST support semantic similarity search across indexed content scoped to courses the student is enrolled in.
- **FR-006**: System MUST return search results with relevance scores, source heading, and lesson information.
- **FR-007**: System MUST automatically trigger indexing when a new lecture document is uploaded or replaced.
- **FR-008**: System MUST remove old embeddings when a document is re-uploaded or deleted.
- **FR-009**: System MUST track and expose processing status (pending, processing, indexed, failed) for each document.
- **FR-010**: System MUST handle chunks that exceed the 2000 token limit by splitting at paragraph boundaries while preserving heading context.
- **FR-011**: System MUST limit search results to a configurable maximum (default: 5 results) to ensure response quality.
- **FR-012**: System MUST filter search results below a minimum relevance threshold of 0.7 (configurable) to avoid returning irrelevant content.
- **FR-013**: System MUST limit concurrent indexing jobs to a maximum of 5 system-wide, queuing additional jobs until capacity is available.

### Key Entities

- **TextChunk**: A segment of lecture content extracted from a document, associated with its heading path, sequence position, and source lesson. Contains the raw text content before embedding.
- **ChunkEmbedding**: The vector representation of a TextChunk stored in ChromaDB, linked by chunk ID with metadata for filtering and retrieval.
- **IndexingJob**: Tracks the processing state of a document through the pipeline (parsing → chunking → embedding → storage), including error information for failed jobs.
- **SemanticQuery**: A student's natural language question transformed into an embedding for similarity search, with results filtered by course scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Documents are fully indexed and searchable within 60 seconds of upload for typical lecture documents (under 50 pages).
- **SC-002**: Semantic search returns relevant results for 90% of queries that have matching content in the knowledge base (measured by user feedback or expert review).
- **SC-003**: Students receive search results within 2 seconds of submitting a query.
- **SC-004**: The system correctly identifies when no relevant content exists, returning empty results rather than low-relevance matches, at least 85% of the time.
- **SC-005**: Re-uploading a document results in complete replacement of old embeddings with no orphaned data in ChromaDB.
- **SC-006**: Teachers can see accurate processing status within 5 seconds of any state change.

## Assumptions

- The existing lecture document extraction system (spec 012-docx-text-extraction) provides the raw text content with heading structure information.
- ChromaDB is already configured and operational (spec 011-configure-databases).
- Gemini API credentials are available in the application environment.
- Documents are in supported formats (primarily DOCX) with standard heading styles.
- Each course maintains a separate logical collection/namespace in ChromaDB for multi-tenant isolation.
- The embedding model produces 768-dimensional vectors (standard for Gemini text-embedding models).
- Rate limits for Gemini API are sufficient for batch processing of lecture documents.

## Dependencies

- **012-docx-text-extraction**: Provides the document parsing and text extraction functionality.
- **011-configure-databases**: Provides ChromaDB configuration and connection management.
