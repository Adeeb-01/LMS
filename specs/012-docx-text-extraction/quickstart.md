# Quickstart: DOCX Text Extraction

**Feature**: 012-docx-text-extraction  
**Date**: 2026-03-11

## Prerequisites

- Node.js 18+ installed
- MongoDB running (local or Atlas)
- ChromaDB running (optional, for search indexing)
- Existing LMS project setup complete

## Installation

### 1. Install Dependencies

```bash
npm install mammoth
```

### 2. Environment Variables

No new environment variables required. Feature uses existing configuration:

```env
# Existing (already configured)
MONGODB_URI=mongodb://localhost:27017/lms
CHROMA_HOST=http://localhost:8000  # Optional, for search
```

### 3. Database Migration

No migration required. New collection `lecturedocuments` is created automatically on first document upload.

## Development Setup

### Start Local Services

```bash
# Terminal 1: MongoDB (if not using Atlas)
mongod

# Terminal 2: ChromaDB (optional, for search features)
docker run -p 8000:8000 chromadb/chroma

# Terminal 3: Next.js dev server
npm run dev
```

### Verify Setup

```bash
# Run tests
npm test -- --testPathPattern="lecture-document"

# Check health endpoint (after implementation)
curl http://localhost:3000/api/health
```

## Usage Examples

### Instructor: Upload Document

1. Navigate to Dashboard → Course → Lesson
2. Click "Upload Transcript" button
3. Select .docx file (max 50 MB)
4. Wait for extraction to complete
5. Preview extracted text to verify accuracy

### Student: Access Study Materials

1. Navigate to enrolled course → Lesson
2. Click "Study Materials" tab
3. View extracted text inline OR
4. Click "Download" to save as file

### API Usage

```javascript
// Upload via Server Action
import { uploadLectureDocument } from '@/app/actions/lecture-document';

const formData = new FormData();
formData.append('file', docxFile);
formData.append('lessonId', lessonId);
formData.append('courseId', courseId);

const result = await uploadLectureDocument(formData);

// Get document for a lesson
import { getLectureDocumentByLesson } from '@/app/actions/lecture-document';

const doc = await getLectureDocumentByLesson(lessonId);
if (doc?.status === 'ready') {
  console.log(doc.extractedText.fullText);
}
```

## Testing

### Unit Tests

```bash
# Test DOCX extraction logic
npm test -- tests/unit/docx-extractor.test.js
```

### Integration Tests

```bash
# Test full upload flow
npm test -- tests/integration/lecture-document.test.js
```

### Manual Testing

1. Create a test .docx with medical terminology
2. Upload via dashboard
3. Verify all terms extracted correctly
4. Test student view and download
5. Test document replacement flow

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid file type" | Not a .docx file | Ensure file extension is .docx and MIME type is correct |
| "File too large" | Exceeds 50 MB | Compress document or split into multiple files |
| "Unable to read document" | Corrupted or password-protected | Re-save document in Word, remove password |
| Processing stuck | Server timeout | Check server logs, increase timeout if needed |
| Empty extraction | Document contains only images | Add text content to document |

### Debugging

```javascript
// Enable debug logging for extraction
process.env.DEBUG = 'lms:docx-extractor';

// Check document status
const doc = await LectureDocument.findById(documentId);
console.log('Status:', doc.status);
console.log('Error:', doc.errorMessage);
```

## File Structure Reference

```text
model/
└── lecture-document.model.js   # Mongoose model

lib/
├── validations.js              # Zod schemas (extended)
└── docx/
    └── extractor.js            # mammoth wrapper

app/
├── actions/
│   └── lecture-document.js     # Server Actions
└── api/
    └── lecture-documents/      # REST endpoints
        ├── route.js
        └── [id]/
            ├── route.js
            └── download/route.js

app/[locale]/dashboard/.../
└── document/
    └── _components/
        ├── document-upload.jsx
        └── document-preview.jsx

tests/
├── unit/docx-extractor.test.js
└── integration/lecture-document.test.js
```
