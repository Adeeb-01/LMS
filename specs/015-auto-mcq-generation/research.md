# Research: Automatic MCQ Generation

**Feature**: 015-auto-mcq-generation  
**Date**: 2026-03-12

## Research Topics

### 1. Gemini Model Selection for MCQ Generation

**Decision**: Use `gemini-1.5-flash` for question generation

**Rationale**:
- Fast response times (important for batch processing multiple chunks)
- Cost-effective for high-volume generation
- Sufficient quality for structured MCQ output
- Native JSON mode support for reliable parsing
- Already using @google/generative-ai package in codebase (lib/embeddings/gemini.js)

**Alternatives Considered**:
| Model | Pros | Cons | Decision |
|-------|------|------|----------|
| gemini-1.5-pro | Higher quality reasoning | Slower, more expensive | Overkill for MCQ generation |
| gemini-1.5-flash | Fast, cheap, good quality | Slightly less nuanced | **Selected** |
| GPT-4 | High quality | Different SDK, higher cost | Stay with Gemini ecosystem |

### 2. Prompt Engineering for University-Level MCQs

**Decision**: Structured JSON prompt with Bloom's taxonomy guidance

**Rationale**:
- JSON mode ensures parseable output
- Bloom's taxonomy levels provide difficulty estimation framework
- Including heading context improves question relevance
- Explicit distractor quality criteria reduce low-quality outputs

**Prompt Structure**:
```
System: You are an expert university-level exam creator.

Input:
- Content chunk with heading context
- Target difficulty range
- Existing questions (for duplicate avoidance)

Output (JSON):
{
  "questions": [
    {
      "text": "Question stem",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        ...
      ],
      "correctOptionId": "a",
      "explanation": "Why A is correct...",
      "difficulty": {
        "bValue": 0.5,
        "bloomLevel": "application",
        "reasoning": "Requires applying concept X to scenario Y"
      }
    }
  ],
  "skipped": false,
  "skipReason": null
}
```

**Bloom's Taxonomy to B-Value Mapping**:
| Bloom Level | Typical B-Value Range | Description |
|-------------|----------------------|-------------|
| Remember | -2.0 to -0.5 | Basic recall of facts/definitions |
| Understand | -0.5 to 0.5 | Comprehension, explanation |
| Apply | 0.0 to 1.0 | Using concepts in new situations |
| Analyze | 0.5 to 1.5 | Breaking down, comparing |
| Evaluate | 1.0 to 2.0 | Judging, critiquing |
| Create | 1.5 to 2.5 | Synthesizing new ideas |

### 3. Duplicate Detection Strategy

**Decision**: Two-phase detection using semantic similarity

**Rationale**:
- Phase 1: Quick text similarity check (Jaccard/cosine on tokens) - fast filter
- Phase 2: Semantic embedding similarity via ChromaDB - accurate but slower
- 0.85 threshold balances catching paraphrases vs false positives

**Implementation**:
```javascript
async function isDuplicate(newQuestion, existingQuestions, threshold = 0.85) {
  // Phase 1: Quick text similarity (< 10ms)
  const textSimilar = existingQuestions.filter(eq => 
    jaccardSimilarity(tokenize(newQuestion.text), tokenize(eq.text)) > 0.7
  );
  
  if (textSimilar.length === 0) return { isDuplicate: false };
  
  // Phase 2: Semantic check only for candidates (< 100ms)
  const newEmbedding = await generateEmbedding(newQuestion.text);
  for (const candidate of textSimilar) {
    const similarity = cosineSimilarity(newEmbedding, candidate.embedding);
    if (similarity >= threshold) {
      return { isDuplicate: true, matchedQuestion: candidate.id, similarity };
    }
  }
  
  return { isDuplicate: false };
}
```

### 4. Background Processing Architecture

**Decision**: Server Action triggers + polling pattern (matches IndexingJob)

**Rationale**:
- Consistent with existing 014-semantic-embeddings-pipeline pattern
- No additional infrastructure (no Redis/Bull required)
- Progress polling via API route (simple, stateless)
- Job state persisted in MongoDB

**Flow**:
```
1. Instructor clicks "Generate Questions"
2. Server Action creates GenerationJob (status: pending)
3. Server Action triggers background processor via internal fetch
4. Processor iterates chunks, calls Gemini, saves questions
5. Client polls /api/mcq-generation/[jobId] for progress
6. On completion, UI refreshes question list
```

**Error Handling**:
- Per-chunk errors logged but don't stop job
- Gemini API failures: exponential backoff (2s, 4s, 8s, max 3 retries)
- Job-level failure if >50% chunks fail

### 5. Question Model Extension Strategy

**Decision**: Add optional fields to existing Question schema

**Rationale**:
- Maintains backward compatibility with manually created questions
- No migration needed for existing questions
- Source chunk link enables "watch explanation" feature
- Draft status can be a simple boolean field

**New Fields**:
```javascript
// Add to existing questionSchema
generatedBy: {
  type: String,
  enum: ['manual', 'gemini'],
  default: 'manual'
},
sourceChunkId: {
  type: String,  // ChromaDB chunk ID
  default: null
},
difficultyReasoning: {
  type: String,
  default: ''
},
isDraft: {
  type: Boolean,
  default: false
},
// IRT parameters already exist from spec 009
irtParams: {
  a: { type: Number, default: 1.0 },
  b: { type: Number, default: 0.0 },
  c: { type: Number, default: 0.0 }
}
```

### 6. Content Quality Filtering

**Decision**: Pre-filter chunks before sending to Gemini

**Rationale**:
- Reduces API costs by skipping non-educational content
- Improves question quality by focusing on substantive material
- Combines short adjacent chunks for better context

**Filter Criteria**:
1. **Minimum length**: Skip chunks < 50 words after whitespace normalization
2. **Content classification**: Skip if detected as TOC, bibliography, or metadata
3. **Chunk merging**: Combine adjacent chunks under same heading if < 100 words each

**Classification Signals**:
- TOC: Lines matching "Chapter X....." or numbered lists with page numbers
- Bibliography: Lines starting with [1], common citation patterns
- Metadata: Headers like "Table of Contents", "References", "Appendix"

### 7. IRT Parameter Integration

**Decision**: Extend existing Question model IRT fields (from spec 009)

**Rationale**:
- Spec 009 already added a, b, c parameters to Question schema
- B-value from Gemini becomes initial estimate
- A and C use defaults (a=1.0, c=0.0 for MCQ)
- Values reset when question content edited (per spec 009 FR-005)

**Note**: Need to verify current Question schema includes IRT params. If not implemented yet, this feature will add them.

### 8. Rate Limiting and Quota Management

**Decision**: Implement request throttling with configurable limits

**Rationale**:
- Gemini API has rate limits (typically 60 RPM for flash)
- Batch multiple chunks per request when possible
- Track daily quota usage to prevent unexpected costs

**Implementation**:
- Max 5 concurrent generation jobs system-wide (mirrors 014 indexing limit)
- 1 second delay between Gemini API calls within a job
- Daily quota tracking via simple counter in MongoDB

## Dependencies Verification

| Dependency | Status | Notes |
|------------|--------|-------|
| 014-semantic-embeddings-pipeline | ✅ Ready | Provides structural chunks via ChromaDB |
| 009-question-irt-parameters | ⚠️ Check | May need to add IRT fields if not yet implemented |
| 001-improve-quiz-system | ✅ Ready | Quiz/Question CRUD operations exist |
| @google/generative-ai | ✅ Installed | Already in package.json for embeddings |
| ChromaDB | ✅ Ready | Already configured from 011/014 |

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Which Gemini model? | gemini-1.5-flash (fast, cost-effective) |
| How to estimate b-value? | Bloom's taxonomy mapping via prompt |
| How to detect duplicates? | Two-phase: token similarity → semantic embedding |
| Where to run generation? | Background via internal fetch (mirrors IndexingJob) |
| How to extend Question? | Add optional fields, maintain backward compatibility |
