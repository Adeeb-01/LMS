# Quickstart: Automatic MCQ Generation

**Feature**: 015-auto-mcq-generation  
**Date**: 2026-03-12

## Prerequisites

Before implementing this feature, ensure:

1. **014-semantic-embeddings-pipeline** is complete
   - Lecture documents are being indexed into ChromaDB chunks
   - `lib/embeddings/gemini.js` exists with embedding functions
   - `service/chroma.js` provides ChromaDB access

2. **009-question-irt-parameters** schema changes applied
   - Question model has IRT parameter fields (or we add them here)

3. **Environment variables** configured:
   ```bash
   GEMINI_API_KEY=your_api_key_here  # Already set for embeddings
   ```

## Implementation Order

### Phase 1: Core Generation (P1)

1. **Model setup** (~30 min)
   - Create `model/generation-job.model.js`
   - Extend `model/questionv2-model.js` with new fields
   - Add Zod schemas to `lib/validations.js`

2. **Gemini generator** (~2 hours)
   - Create `lib/mcq-generation/generator.js`
   - Implement prompt engineering for MCQ generation
   - Add JSON parsing with validation

3. **Server Actions** (~1 hour)
   - Create `app/actions/mcq-generation.js`
   - Implement `triggerGeneration`, `getGenerationStatus`

4. **Background processor** (~1.5 hours)
   - Create `service/mcq-generation-queue.js`
   - Implement chunk iteration and Gemini calls
   - Add error handling and progress updates

5. **API routes** (~1 hour)
   - Create `app/api/mcq-generation/route.js`
   - Create `app/api/mcq-generation/[jobId]/route.js`

6. **Basic UI** (~2 hours)
   - Create generation trigger button component
   - Create progress indicator component
   - Add to lesson dashboard page

### Phase 2: Difficulty Estimation (P2)

7. **Difficulty estimator** (~1 hour)
   - Create `lib/mcq-generation/difficulty-estimator.js`
   - Implement Bloom's taxonomy to b-value mapping

8. **UI for difficulty display** (~1 hour)
   - Create `components/mcq-generation/difficulty-badge.jsx`
   - Add difficulty reasoning tooltip

### Phase 3: Progress & Polish (P3)

9. **Duplicate detector** (~1.5 hours)
   - Create `lib/mcq-generation/duplicate-detector.js`
   - Implement two-phase similarity detection

10. **Question validator** (~1 hour)
    - Create `lib/mcq-generation/question-validator.js`
    - Add quality checks before saving

11. **Enhanced UI** (~2 hours)
    - Add generated questions preview
    - Add bulk activate/delete actions
    - Add regenerate per-chunk option

### Phase 4: Testing

12. **Unit tests** (~2 hours)
    - Generator prompt/parsing tests
    - Difficulty estimator tests
    - Duplicate detector tests

13. **Integration tests** (~1.5 hours)
    - Full generation flow test
    - Error handling tests

## Quick Verification Steps

After each phase, verify:

### After Phase 1
```bash
# 1. Check model creation
node -e "require('./model/generation-job.model.js')"

# 2. Test generation trigger (requires running app)
# Navigate to a lesson with indexed content
# Click "Generate Questions" button
# Verify job appears in MongoDB: generationjobs collection

# 3. Check questions created
# Verify questions in quiz with isDraft=true
```

### After Phase 2
```javascript
// Verify b-values are in expected range
const questions = await Question.find({ generationJobId: jobId });
questions.forEach(q => {
  console.log(`Q: ${q.text.substring(0, 50)}... b=${q.irtParams.b}`);
  // b-values should be between -3 and +3
});
```

### After Phase 3
```bash
# Run test suite
npm test -- --grep "mcq-generation"
```

## File Checklist

```text
[ ] model/generation-job.model.js
[ ] model/questionv2-model.js (extended)
[ ] lib/validations.js (extended)
[ ] lib/mcq-generation/generator.js
[ ] lib/mcq-generation/difficulty-estimator.js
[ ] lib/mcq-generation/duplicate-detector.js
[ ] lib/mcq-generation/question-validator.js
[ ] service/mcq-generation-queue.js
[ ] app/actions/mcq-generation.js
[ ] app/api/mcq-generation/route.js
[ ] app/api/mcq-generation/[jobId]/route.js
[ ] components/mcq-generation/difficulty-badge.jsx
[ ] components/mcq-generation/generation-status.jsx
[ ] app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions/page.jsx
[ ] tests/unit/mcq-generator.test.js
[ ] tests/unit/difficulty-estimator.test.js
[ ] tests/unit/duplicate-detector.test.js
[ ] tests/integration/mcq-generation.test.js
[ ] messages/en.json (i18n strings)
[ ] messages/ar.json (i18n strings)
```

## Common Issues

### "No indexed content" error
- Ensure 014-semantic-embeddings-pipeline has completed for the lesson
- Check `lectureDocument.embeddingStatus === 'indexed'`
- Verify chunks exist in ChromaDB for the lesson

### Gemini API errors
- Check `GEMINI_API_KEY` is set correctly
- Verify API quota hasn't been exceeded
- Check rate limiting (max 60 RPM for flash model)

### Questions not appearing
- Check `isDraft` field - generated questions start as drafts
- Verify quiz ID is correct
- Check for validation errors in job's `chunkErrors`

### Duplicate detection false positives
- Adjust threshold in `lib/mcq-generation/duplicate-detector.js`
- Default is 0.85; try 0.90 for stricter matching

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI API key (already set for embeddings) |
| `MONGODB_URI` | Yes | MongoDB connection string (existing) |
| `CHROMA_URL` | Yes | ChromaDB URL (existing from 014) |

## Dependencies

No new npm packages required - uses existing:
- `@google/generative-ai` (already installed for embeddings)
- `chromadb` (already installed from 014)
- `mongoose`, `zod` (existing)
