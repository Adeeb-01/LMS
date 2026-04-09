# Research: DOCX Text Extraction

**Feature**: 012-docx-text-extraction  
**Date**: 2026-03-11

## Research Tasks

### 1. DOCX Parsing Library Selection

**Decision**: Use `mammoth` npm package for DOCX text extraction.

**Rationale**:
- Pure JavaScript, no native dependencies - works in Node.js without binary compilation
- Extracts text with semantic structure (paragraphs, headings, lists)
- Handles complex documents reliably
- Well-maintained with 4M+ weekly npm downloads
- MIT licensed
- Supports .docx format (Office Open XML) which is the requirement

**Alternatives considered**:
- `docx4js`: Less maintained, fewer downloads
- `officegen`: Focused on generation, not parsing
- `libreoffice-convert`: Requires LibreOffice installation (deployment complexity)
- `pandoc`: Requires external binary installation

**Installation**: `npm install mammoth`

### 2. File Upload Strategy

**Decision**: Use existing file upload pattern with chunked uploads for large files.

**Rationale**:
- Project already has `/app/api/upload/video/route.js` with proven patterns
- Next.js 15 supports streaming uploads natively
- 50 MB limit is manageable with standard multipart upload
- Store files temporarily during processing, then store extracted text in MongoDB

**Implementation approach**:
1. Client uploads .docx via multipart form
2. Server validates file type and size
3. Server processes with mammoth (in-memory, no temp file needed for <50MB)
4. Store extracted text in MongoDB
5. Optionally store original .docx in filesystem/S3 for re-extraction

### 3. Text Storage and Indexing Strategy

**Decision**: Store extracted text in MongoDB with ChromaDB for vector search.

**Rationale**:
- MongoDB: Already used for all content storage; keeps text with metadata
- ChromaDB: Already configured in `/service/chroma.js` for vector embeddings
- Unified search integration via ChromaDB collection (`lms_embeddings`)

**Implementation approach**:
1. Store full text in `ExtractedText` MongoDB document
2. Generate embeddings for text chunks
3. Index embeddings in ChromaDB with lecture/course metadata
4. Search returns lecture IDs that match query

### 4. Processing State Management

**Decision**: Use 4-state model stored in MongoDB document.

**States**: `uploading` → `processing` → `ready` → `failed`

**Rationale**:
- Matches clarification decision from spec
- Simple state machine, no external queue needed for MVP
- Processing is synchronous for documents <50MB (typically <5 seconds)
- State stored in `LectureDocument.status` field

**Transitions**:
- `uploading`: File upload in progress
- `processing`: Extraction in progress
- `ready`: Extraction complete, text available
- `failed`: Error occurred, `errorMessage` field contains details

### 5. Access Control Implementation

**Decision**: Leverage existing course enrollment checks.

**Rationale**:
- Project already has enrollment verification in `/app/actions/enrollment.js`
- Course-scoped access means: instructors of course + enrolled students
- Reuse existing `checkCourseAccess()` pattern

**Implementation approach**:
1. Instructor upload: Verify user is course instructor (existing pattern)
2. Student view/download: Verify enrollment (existing pattern)
3. API routes enforce access before returning data

### 6. Student Download Format

**Decision**: Offer both plain text (.txt) and formatted HTML download.

**Rationale**:
- Plain text: Universal compatibility, smallest size
- HTML: Preserves basic formatting (bold, italic, headings)
- Both generated from stored `ExtractedText.structuredContent`

### 7. Error Handling Strategy

**Decision**: Fail gracefully with user-friendly messages.

**Error categories**:
| Error Type | User Message | Technical Handling |
|------------|--------------|-------------------|
| Invalid file type | "Please upload a .docx file" | Check MIME type + extension |
| File too large | "File must be under 50 MB" | Check size before processing |
| Corrupted file | "Unable to read document. Please check the file." | Catch mammoth errors |
| Password protected | "Please remove password protection" | Detect encrypted .docx |
| Empty document | "No text content found in document" | Check extracted text length |
| Server error | "Processing failed. Please try again." | Log details, show generic message |

### 8. Performance Optimization

**Decision**: Process synchronously for MVP, consider background jobs later.

**Rationale**:
- mammoth processes ~100 pages in <2 seconds
- 50 MB limit with typical .docx compression = ~500 pages max
- Synchronous processing acceptable for SC-001 (30 seconds for 10 pages)
- Background processing can be added in v2 if needed

**Optimization techniques**:
- Stream file directly to mammoth (no disk write)
- Limit embedding generation to first N chunks for very long documents
- Cache ChromaDB collection reference

## Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| mammoth | ^1.6.0 | DOCX text extraction |
| (existing) chromadb | - | Vector search indexing |
| (existing) mongoose | ^8.x | MongoDB ODM |
| (existing) zod | ^3.x | Schema validation |

## Open Questions Resolved

All technical questions resolved. Ready for Phase 1 design.
