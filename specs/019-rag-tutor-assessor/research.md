# Research: Interactive RAG Tutor & Semantic Assessor

**Feature**: 019-rag-tutor-assessor  
**Date**: 2026-04-07

## Research Tasks Completed

### 1. Semantic Similarity Computation

**Question**: How to compute semantic similarity between student responses and reference answers?

**Decision**: Use Gemini embedding cosine similarity via existing `lib/embeddings/gemini.js`

**Rationale**: 
- Existing infrastructure already configured and tested
- `generateEmbedding()` function available for text → vector conversion
- Cosine similarity is standard practice for embedding comparison
- Gemini embeddings (3072 dimensions) provide high-quality semantic representation

**Alternatives Considered**:
- GPT-4 evaluation (current `evaluateOralAnswer`) — More expensive per call, slower, but provides natural language feedback
- Sentence-BERT — Would require new dependency and model hosting
- Simple keyword matching — Too brittle, doesn't capture semantic equivalence

**Implementation**:
```javascript
// lib/ai/semantic-similarity.js
import { generateEmbedding } from '@/lib/embeddings/gemini';

export async function computeSemanticSimilarity(text1, text2) {
    const [embedding1, embedding2] = await Promise.all([
        generateEmbedding(text1),
        generateEmbedding(text2)
    ]);
    return cosineSimilarity(embedding1, embedding2);
}

function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
```

### 2. Concept Coverage Extraction

**Question**: How to identify which key concepts from a reference answer were addressed/missing?

**Decision**: Hybrid approach — extract key concepts from reference answer, then check semantic proximity of each concept to student response

**Rationale**:
- Key concepts can be extracted via Gemini text generation (already used in MCQ generation)
- Per-concept similarity scoring provides granular feedback
- Avoids binary "right/wrong" — shows partial understanding

**Alternatives Considered**:
- Named Entity Recognition — Too narrow, misses conceptual relationships
- Full GPT evaluation — Expensive, but provides better natural language feedback (keep as optional)
- Keyword extraction — Doesn't capture paraphrasing

**Implementation**:
```javascript
// Extract concepts using Gemini, then score each against student response
export async function analyzeConcept Coverage(studentResponse, referenceAnswer, keyConcepts) {
    const studentEmbedding = await generateEmbedding(studentResponse);
    const results = await Promise.all(keyConcepts.map(async (concept) => {
        const conceptEmbedding = await generateEmbedding(concept);
        const similarity = cosineSimilarity(studentEmbedding, conceptEmbedding);
        return {
            concept,
            addressed: similarity >= 0.6, // Threshold
            similarity
        };
    }));
    return {
        addressed: results.filter(r => r.addressed).map(r => r.concept),
        missing: results.filter(r => !r.addressed).map(r => r.concept),
        details: results
    };
}
```

### 3. RAG Response Grounding

**Question**: How to ensure RAG tutor responses are strictly grounded in lecture content?

**Decision**: Use existing `searchCourse` to retrieve chunks, then generate response with explicit grounding prompt

**Rationale**:
- `searchCourse` in `app/actions/semantic-search.js` already handles ChromaDB queries
- Explicit system prompt instructs model to only use provided context
- Include citation of chunk sources for transparency

**Alternatives Considered**:
- Fine-tuned model on lecture content — Expensive, not practical per-course
- Keyword-based retrieval — Less accurate than semantic search
- No grounding (general knowledge) — Violates spec requirement, risk of hallucination

**Implementation**:
```javascript
// lib/rag/tutor-response.js
export async function generateTutorResponse(question, lessonId, courseId) {
    // 1. Retrieve relevant chunks
    const searchResults = await searchCourse(question, courseId, { lessonId, limit: 5 });
    
    if (!searchResults.results?.length) {
        return { 
            response: "This topic is not covered in the current lecture.",
            grounded: false,
            relatedTopics: await suggestRelatedTopics(courseId, question)
        };
    }
    
    // 2. Generate grounded response
    const context = searchResults.results.map(r => r.content).join('\n\n');
    const response = await generateGroundedAnswer(question, context);
    
    // 3. Extract timestamp references
    const timestamps = searchResults.results
        .filter(r => r.metadata?.startSeconds)
        .map(r => ({
            seconds: r.metadata.startSeconds,
            text: r.content.substring(0, 100)
        }));
    
    return { response, grounded: true, timestamps, chunks: searchResults.results };
}
```

### 4. Assessment Point Triggering

**Question**: How to pause video and trigger assessment at specific timestamps?

**Decision**: Extend `lesson-video.jsx` with assessment checkpoint detection in `onTimeUpdate`

**Rationale**:
- Video player already has `onTimeUpdate` callback (line 109-114 in existing code)
- Assessment points stored with `triggerTimestamp` field
- Check current time against upcoming checkpoints, pause and show overlay

**Alternatives Considered**:
- Video chapter markers — Not supported by YouTube/local video consistently
- Manual student trigger — Doesn't ensure comprehension checkpoints
- Post-video only — Loses temporal context, less effective

**Implementation**:
```javascript
// In lesson-video.jsx
const [assessmentPoints, setAssessmentPoints] = useState([]);
const [activeAssessment, setActiveAssessment] = useState(null);

const handleOnProgress = useCallback((progress) => {
    const currentTime = typeof progress === 'number' ? progress : progress.playedSeconds;
    handleTimeUpdate(currentTime);
    
    // Check for assessment trigger
    const upcoming = assessmentPoints.find(
        ap => !ap.completed && 
        Math.abs(ap.triggerTimestamp - currentTime) < 1 // Within 1 second
    );
    if (upcoming && !activeAssessment) {
        videoRef.current?.pause?.();
        setActiveAssessment(upcoming);
    }
}, [handleTimeUpdate, assessmentPoints, activeAssessment]);
```

### 5. Audio Recording & Deletion

**Question**: How to handle audio recording with immediate post-transcription deletion?

**Decision**: Use existing `AudioRecorder` component, upload to temporary storage, transcribe, delete

**Rationale**:
- `components/ui/AudioRecorder.jsx` already exists
- Upload to S3 with short TTL or use in-memory processing
- Call transcription API, then explicitly delete audio file
- Only persist transcription text to database

**Alternatives Considered**:
- Client-side transcription (Web Speech API) — Inconsistent accuracy, no Whisper quality
- Keep audio for appeals — Privacy concern per clarification decision
- Streaming transcription — More complex, Whisper doesn't support well

**Implementation**:
```javascript
// app/api/oral-assessment/[assessmentId]/submit/route.js
export async function POST(req, { params }) {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    
    // 1. Upload to temp storage
    const tempUrl = await uploadToTempStorage(audioFile);
    
    try {
        // 2. Transcribe
        const transcription = await transcribeAudio(tempUrl);
        
        // 3. Evaluate
        const similarity = await computeSemanticSimilarity(
            transcription, 
            assessment.referenceAnswer
        );
        
        // 4. Save result (transcription only, no audio reference)
        await StudentResponse.create({
            assessmentId,
            transcription,
            similarityScore: similarity,
            // No audioUrl field
        });
        
        return Response.json({ success: true, similarity, transcription });
    } finally {
        // 5. Always delete audio
        await deleteFromStorage(tempUrl);
    }
}
```

### 6. Rate Limiting for RAG Tutor

**Question**: How to implement soft limit of 10 questions per lesson?

**Decision**: Track count in `TutorInteraction` model, show warning at 8, advisory message after 10

**Rationale**:
- Soft limit allows continued learning while discouraging abuse
- Per-lesson scope aligns with learning session context
- Count stored server-side prevents client manipulation

**Implementation**:
```javascript
// app/actions/rag-tutor.js
export async function askTutor(question, lessonId) {
    const user = await getLoggedInUser();
    
    // Check rate limit
    const todayCount = await TutorInteraction.countDocuments({
        userId: user.id,
        lessonId,
        createdAt: { $gte: startOfDay(new Date()) }
    });
    
    const WARNING_THRESHOLD = 8;
    const SOFT_LIMIT = 10;
    
    let rateLimitWarning = null;
    if (todayCount >= SOFT_LIMIT) {
        rateLimitWarning = "You've reached the recommended question limit for this lesson. You may continue, but consider reviewing the material independently.";
    } else if (todayCount >= WARNING_THRESHOLD) {
        rateLimitWarning = `You have ${SOFT_LIMIT - todayCount} questions remaining for this lesson.`;
    }
    
    // Continue with RAG query...
    const response = await generateTutorResponse(question, lessonId);
    
    return { ...response, rateLimitWarning };
}
```

## Dependencies Verified

| Dependency | Status | Notes |
|------------|--------|-------|
| `lib/ai/transcription.js` | ✅ Exists | Whisper via OpenAI |
| `lib/ai/evaluation.js` | ✅ Exists | GPT-4o evaluation (optional use) |
| `lib/embeddings/gemini.js` | ✅ Exists | Embedding generation |
| `app/actions/semantic-search.js` | ✅ Exists | `searchCourseContent` for RAG |
| `components/ui/AudioRecorder.jsx` | ✅ Exists | Voice recording UI |
| `model/questionv2-model.js` | ✅ Exists | Has `oral` type, `referenceAnswer` |
| ChromaDB embeddings | ✅ Via 014 | Lecture content indexed |

## Open Questions Resolved

All NEEDS CLARIFICATION items from Technical Context have been resolved through this research phase. No blocking unknowns remain.
