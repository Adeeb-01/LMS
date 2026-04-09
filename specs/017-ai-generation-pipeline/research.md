# Research: AI Generation & Vectorization Pipeline (Epic 1)

**Feature**: 017-ai-generation-pipeline  
**Date**: 2026-03-16

## Research Topics

### 1. Oral Question Generation Prompt Strategy

**Decision**: Use `gemini-2.5-flash` with structured JSON output, optimized for higher-order thinking questions.

**Rationale**:
- Consistent with MCQ generation (015) for unified API usage
- Flash model is sufficient for question generation with cost efficiency
- JSON mode ensures parseable output with reference answers
- Higher-order thinking focus aligns with FR-014 requirement

**Prompt Structure**:
```
System: You are an expert university-level oral examination creator. 
Generate open-ended questions that require verbal explanation, analysis, 
or synthesis. Questions should be answerable in 1-3 minutes of speaking.

Input:
- Content chunk with heading context
- Target cognitive level (application, analysis, synthesis, evaluation)
- Existing oral questions (for duplicate avoidance)

Output (JSON):
{
  "questions": [
    {
      "text": "Explain why...",
      "cognitiveLevel": "analysis",
      "referenceAnswer": {
        "keyPoints": ["Point 1", "Point 2", "Point 3"],
        "requiredTerminology": ["term1", "term2"],
        "acceptableVariations": ["alternative phrasing..."],
        "gradingCriteria": "Award full marks if student covers all key points..."
      },
      "difficulty": {
        "bValue": 1.0,
        "reasoning": "Requires analysis of multiple concepts"
      },
      "estimatedResponseTime": "2 minutes"
    }
  ],
  "skipped": false,
  "skipReason": null
}
```

**Cognitive Level to B-Value Mapping (Oral Questions)**:
| Cognitive Level | Typical B-Value Range | Description |
|-----------------|----------------------|-------------|
| Application | 0.0 to 1.0 | Apply concepts to explain scenarios |
| Analysis | 0.5 to 1.5 | Break down, compare, contrast |
| Synthesis | 1.0 to 2.0 | Combine ideas, propose solutions |
| Evaluation | 1.5 to 2.5 | Critique, justify, defend positions |

### 2. Reference Answer Structure

**Decision**: Structured reference answer with key points, terminology, and grading hints.

**Rationale**:
- Key points enable semantic matching during AI evaluation (spec 010)
- Required terminology ensures domain accuracy assessment
- Acceptable variations reduce false negatives in grading
- Grading criteria provides consistency across evaluations

**Schema**:
```javascript
referenceAnswer: {
  keyPoints: [String],           // 3-5 essential concepts
  requiredTerminology: [String], // Domain-specific terms expected
  acceptableVariations: [String], // Alternative valid approaches
  gradingCriteria: String,       // Guidance for AI evaluator
  sampleResponse: String         // Optional full example response
}
```

### 3. Oral Question Duplicate Detection

**Decision**: 0.90 semantic similarity threshold (vs 0.85 for MCQs)

**Rationale**:
- Oral questions are intentionally open-ended and may legitimately cover similar topics
- Higher threshold reduces false positives for conceptually related but distinct questions
- Questions like "Explain X" vs "Describe X" should not be flagged as duplicates
- Aligns with clarification session decision

**Implementation**:
```javascript
async function isDuplicateOral(newQuestion, existingQuestions, threshold = 0.90) {
  // Same two-phase approach as MCQ
  // Phase 1: Quick text similarity (Jaccard) - threshold 0.75
  // Phase 2: Semantic embedding check - threshold 0.90
  
  // Only flag as duplicate if semantic similarity >= 0.90
  // This accounts for the naturally varied phrasing of oral questions
}
```

### 4. Pipeline Orchestration Pattern

**Decision**: Parent PipelineJob with child job references, event-driven stage transitions.

**Rationale**:
- Single source of truth for pipeline status
- Each stage (extraction, alignment, indexing, MCQ, oral) has its own job model
- PipelineJob aggregates status from child jobs
- Decoupled design allows individual stage retries (FR-005)

**State Machine**:
```
PipelineJob States:
  pending → extracting → aligning → indexing → generating → completed
                ↓           ↓          ↓           ↓
             failed      failed     failed      failed
                ↑           ↑          ↑           ↑
             (retry)     (retry)   (retry)     (retry)

Child Job Lifecycle:
  pending → processing → completed
              ↓
           failed → (retry via parent)
```

**Orchestration Flow**:
```javascript
// On document upload (or video upload if document exists)
async function startPipeline(lessonId, triggeredBy) {
  // 1. Create PipelineJob
  const pipeline = await PipelineJob.create({
    lessonId,
    triggeredBy,
    status: 'pending'
  });
  
  // 2. Trigger extraction (handled by 012)
  // On extraction complete → trigger alignment (013)
  // On alignment complete → trigger indexing (014)
  // On indexing complete → trigger MCQ + Oral generation in parallel
  // On both generation complete → mark pipeline complete
}
```

### 5. Parallel Generation Strategy

**Decision**: MCQ and Oral generation run concurrently after indexing completes.

**Rationale**:
- Clarification confirmed parallel execution (session Q4)
- Maximizes throughput for instructor
- Independent jobs with no data dependencies between them
- Both read from same ChromaDB chunks (read-only)

**Implementation**:
```javascript
// In pipeline orchestrator
async function onIndexingComplete(pipelineId) {
  const pipeline = await PipelineJob.findById(pipelineId);
  
  // Trigger both in parallel
  await Promise.all([
    triggerMcqGeneration(pipeline),
    triggerOralGeneration(pipeline)
  ]);
  
  // Pipeline monitors both jobs for completion
}
```

### 6. In-App Notification Strategy

**Decision**: Use existing notification system with toast + bell icon.

**Rationale**:
- Clarification confirmed in-app only (session Q5)
- Consistent with existing LMS notification patterns
- No email infrastructure dependency
- Immediate feedback when instructor is in app

**Implementation**:
- Use existing `NotificationContext` from the app
- Create notification record in MongoDB for bell icon
- Fire toast via existing `useToast` hook on client
- Poll for completion or use existing WebSocket if available

### 7. Content Filtering for Oral Questions

**Decision**: Minimum 100 words per chunk for oral question generation (vs 50 for MCQ)

**Rationale**:
- Oral questions require richer context than MCQs
- Short chunks don't provide enough material for explanation-style questions
- Prevents low-quality "what is X?" questions from brief definitions
- FR-013 explicitly requires 100-word minimum

**Implementation**:
```javascript
function shouldGenerateOralQuestion(chunk) {
  const wordCount = chunk.document.trim().split(/\s+/).length;
  if (wordCount < 100) {
    return { generate: false, reason: 'Insufficient content (< 100 words)' };
  }
  // Additional checks: not TOC, not bibliography, etc.
  return { generate: true };
}
```

### 8. Video Timestamp Propagation

**Decision**: Inherit timestamps from TextBlockTimestamp (013) via source chunk reference.

**Rationale**:
- FR-018 requires timestamp propagation to generated questions
- Chunks already have timestamp associations from alignment
- Link via `sourceChunkId` → lookup timestamp from alignment data
- "Watch Explanation" feature reuses existing video player seek

**Implementation**:
```javascript
async function getQuestionTimestamp(question) {
  if (!question.sourceChunkId) return null;
  
  // Source chunk ID format: embed-{courseId}-{lectureDocId}-{chunkIndex}
  const alignment = await TextBlockTimestamp.findOne({
    lectureDocumentId: extractLectureDocId(question.sourceChunkId),
    chunkIndex: extractChunkIndex(question.sourceChunkId)
  });
  
  return alignment ? {
    start: alignment.startSeconds,
    end: alignment.endSeconds,
    confidence: alignment.confidence
  } : null;
}
```

## Dependencies Verification

| Dependency | Status | Notes |
|------------|--------|-------|
| 012-docx-text-extraction | ✅ Ready | LectureDocument model exists |
| 013-text-video-sync | ✅ Ready | AlignmentJob, VideoTranscript models exist |
| 014-semantic-embeddings-pipeline | ✅ Ready | IndexingJob, ChromaDB integration exists |
| 015-auto-mcq-generation | ✅ Ready | GenerationJob, MCQ generator exists |
| 010-add-oral-question | ✅ Ready | Oral question type, referenceAnswer field exists |
| 011-configure-databases | ✅ Ready | ChromaDB configured |
| 009-question-irt-parameters | ✅ Ready | IRT params in Question schema |

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Which model for oral generation? | gemini-1.5-flash (consistent with MCQ) |
| How to structure reference answers? | Key points + terminology + variations + criteria |
| What duplicate threshold for oral? | 0.90 (higher than MCQ's 0.85) |
| How to orchestrate pipeline? | Parent PipelineJob with child job references |
| Parallel or sequential generation? | Parallel after indexing completes |
| How to notify completion? | In-app only (toast + bell) |
| Minimum chunk size for oral? | 100 words (vs 50 for MCQ) |
| How to propagate timestamps? | Via sourceChunkId → TextBlockTimestamp lookup |

Ready for Phase 1 design.
