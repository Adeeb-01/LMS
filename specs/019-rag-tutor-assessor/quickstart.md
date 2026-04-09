# Quickstart: Interactive RAG Tutor & Semantic Assessor

**Feature**: 019-rag-tutor-assessor  
**Date**: 2026-04-07

## Prerequisites

Before implementing this feature, ensure the following are in place:

### 1. Environment Variables

Add to `.env.local`:

```bash
# Existing (verify present)
OPENAI_API_KEY=sk-...           # Required for Whisper transcription
GEMINI_API_KEY=...              # Required for embeddings & generation
MONGODB_URI=mongodb://...       # Database connection

# Optional (existing)
GEMINI_EMBEDDING_MODEL=gemini-embedding-001  # Default if not set
```

### 2. Feature Dependencies

These features must be implemented and functional:

| Feature | Status | Required For |
|---------|--------|--------------|
| 013-text-video-sync | ✅ Implemented | Video player hooks, timestamp handling |
| 014-semantic-embeddings-pipeline | ✅ Implemented | ChromaDB lecture indexing |
| 010-add-oral-question | ✅ Implemented | AudioRecorder component, transcription |

### 3. Database Indexes

Run after model creation:

```javascript
// Can be added to model files or run as migration
db.oralassessments.createIndex({ lessonId: 1, triggerTimestamp: 1 });
db.oralassessments.createIndex({ status: 1, lessonId: 1 });
db.studentresponses.createIndex({ assessmentId: 1, userId: 1 });
db.studentresponses.createIndex({ userId: 1, lessonId: 1 });
db.tutorinteractions.createIndex({ userId: 1, lessonId: 1, createdAt: -1 });
db.recitebackattempts.createIndex({ interactionId: 1, attemptNumber: 1 });
db.conceptgaps.createIndex({ userId: 1, lessonId: 1 });
```

## Quick Verification

### Test Whisper Transcription

```javascript
// Run in Node REPL or test file
import { transcribeAudio } from '@/lib/ai/transcription';

const testUrl = 'https://example.com/test-audio.webm';
const result = await transcribeAudio(testUrl);
console.log('Transcription:', result);
```

### Test Semantic Similarity

```javascript
// After implementing lib/ai/semantic-similarity.js
import { computeSemanticSimilarity } from '@/lib/ai/semantic-similarity';

const text1 = "The mitochondria is the powerhouse of the cell";
const text2 = "Mitochondria generate energy for cellular functions";
const similarity = await computeSemanticSimilarity(text1, text2);
console.log('Similarity:', similarity); // Expected: ~0.7-0.9
```

### Test RAG Search

```javascript
import { searchCourseContent } from '@/app/actions/semantic-search';

const result = await searchCourseContent(
  "What is the role of ATP?",
  "COURSE_ID_HERE",
  { limit: 5 }
);
console.log('Search results:', result);
```

## Implementation Order

Follow this order for smooth incremental delivery:

### Phase 1: Core Assessment (P1)

1. **Models** (Day 1)
   - `model/oral-assessment.model.js`
   - `model/student-response.model.js`

2. **Semantic Similarity** (Day 1)
   - `lib/ai/semantic-similarity.js`
   - `__tests__/lib/semantic-similarity.test.js`

3. **Server Actions** (Day 2)
   - `app/actions/oral-assessment.js` (submitOralResponse, getAssessmentPoints)

4. **Video Player Integration** (Day 3)
   - Modify `lesson-video.jsx` for assessment triggers
   - Create `oral-assessment-panel.jsx`

5. **Instructor Authoring** (Day 4)
   - Add manual assessment creation UI
   - Add auto-generation trigger

### Phase 2: RAG Tutor (P2)

6. **Models** (Day 5)
   - `model/tutor-interaction.model.js`

7. **RAG Response Generation** (Day 5)
   - `lib/rag/tutor-response.js`

8. **Server Actions** (Day 6)
   - `app/actions/rag-tutor.js` (askTutor)

9. **Tutor UI** (Day 7)
   - `rag-tutor-panel.jsx`
   - Integration with video player

### Phase 3: Recite-Back Loop (P3)

10. **Models** (Day 8)
    - `model/recite-back-attempt.model.js`
    - `model/concept-gap.model.js`

11. **Server Actions** (Day 8)
    - Extend `app/actions/rag-tutor.js` (submitReciteBack)
    - `app/actions/oral-assessment.js` (getConceptGapSummary)

12. **Recite-Back UI** (Day 9)
    - `recite-back-modal.jsx`
    - Session summary display

## Component Integration Points

### Video Player Hook

```javascript
// In lesson-video.jsx
import { OralAssessmentPanel } from './oral-assessment-panel';

// Add state
const [activeAssessment, setActiveAssessment] = useState(null);
const [assessmentPoints, setAssessmentPoints] = useState([]);

// Fetch on mount
useEffect(() => {
  getAssessmentPoints({ lessonId: lesson.id })
    .then(result => {
      if (result.ok) setAssessmentPoints(result.assessments);
    });
}, [lesson.id]);

// Check in progress handler
const handleOnProgress = useCallback((progress) => {
  // ... existing code ...
  
  // Assessment checkpoint detection
  const upcoming = assessmentPoints.find(
    ap => !ap.completed && Math.abs(ap.triggerTimestamp - currentTime) < 1
  );
  if (upcoming && !activeAssessment) {
    videoRef.current?.pause?.();
    setActiveAssessment(upcoming);
  }
}, [/* deps */]);

// Render overlay
return (
  <div className="relative">
    {/* Video player */}
    {activeAssessment && (
      <OralAssessmentPanel 
        assessment={activeAssessment}
        onComplete={(passed) => {
          markAssessmentComplete(activeAssessment.id, passed);
          setActiveAssessment(null);
          videoRef.current?.play?.();
        }}
      />
    )}
  </div>
);
```

### Tutor Button

```javascript
// Add "Ask Tutor" button to lesson sidebar or video controls
<Button 
  variant="outline" 
  onClick={() => setShowTutor(true)}
  disabled={!isPlaying}
>
  <MessageCircle className="mr-2 h-4 w-4" />
  {t('askTutor')}
</Button>
```

## Internationalization

Add to `messages/en.json`:

```json
{
  "OralAssessment": {
    "checkYourUnderstanding": "Check Your Understanding",
    "recordYourAnswer": "Record your answer",
    "orTypeResponse": "Or type your response",
    "submit": "Submit",
    "yourScore": "Your Score",
    "conceptsCovered": "Concepts You Explained",
    "conceptsMissing": "Concepts to Review",
    "passedMessage": "Great job! You demonstrated understanding.",
    "failedMessage": "Consider reviewing this section before continuing.",
    "continueVideo": "Continue Video"
  },
  "RagTutor": {
    "askTutor": "Ask Tutor",
    "askYourQuestion": "Ask your question",
    "tutorResponse": "Tutor Response",
    "notCovered": "This topic is not covered in the current lecture.",
    "relatedTopics": "Related topics you might find helpful:",
    "jumpToTimestamp": "Jump to this section",
    "questionsRemaining": "{{count}} questions remaining",
    "limitReached": "Question limit reached"
  },
  "ReciteBack": {
    "reciteBack": "Recite Back",
    "explainInYourWords": "Now explain this concept in your own words",
    "tryAgain": "Try Again",
    "attemptsRemaining": "{{count}} attempts remaining",
    "greatRecall": "Great recall! You can continue.",
    "conceptLogged": "This concept has been flagged for later review."
  }
}
```

Add corresponding entries to `messages/ar.json`.

## Testing Checklist

- [ ] Audio recording works (microphone permission)
- [ ] Text fallback works when voice unavailable
- [ ] Whisper transcription returns text
- [ ] Semantic similarity scores are reasonable (0.6-0.9 for similar text)
- [ ] Assessment triggers at correct video timestamp
- [ ] Video pauses when assessment appears
- [ ] Video resumes after assessment submission
- [ ] RAG tutor returns grounded responses
- [ ] RAG tutor shows "not covered" for out-of-scope questions
- [ ] Rate limiting warning appears after 8 questions
- [ ] Recite-back flow completes successfully
- [ ] Concept gaps logged on failed recite-back
- [ ] Session summary shows all flagged concepts
