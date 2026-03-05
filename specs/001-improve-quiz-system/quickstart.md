# Quickstart: Quiz System Improvements

**Feature**: 001-improve-quiz-system  
**Date**: 2026-03-05

## Overview

This guide covers the key components and patterns for implementing quiz system improvements.

## File Locations

```
app/
├── actions/
│   ├── quizv2.js              # Quiz CRUD, attempt management, grading
│   └── quizProgressv2.js      # Course completion integration
├── [locale]/(main)/courses/[id]/quizzes/
│   ├── [quizId]/
│   │   ├── _components/
│   │   │   └── quiz-taking-interface.jsx  # Main quiz UI
│   │   ├── page.jsx           # Quiz taking page
│   │   └── result/page.jsx    # Results page
│   └── page.jsx               # Quiz list
├── model/
│   ├── quizv2-model.js        # Quiz schema
│   ├── questionv2-model.js    # Question schema
│   └── attemptv2-model.js     # Attempt schema
└── lib/
    └── quiz-storage.js        # (NEW) localStorage helper
```

## Key Patterns

### 1. Server Authority for Timer

The server `expiresAt` timestamp is authoritative. Client timer is for display only.

```jsx
// ❌ Wrong: Client decides expiration
if (clientTimer <= 0) {
  setExpired(true);
}

// ✅ Correct: Server decides, client displays
const remaining = Math.floor((new Date(attempt.expiresAt) - Date.now()) / 1000);
setTimeRemaining(Math.max(0, remaining));

// On submit, server validates:
if (attempt.expiresAt && new Date() > attempt.expiresAt) {
  return { ok: false, error: "Time limit exceeded" };
}
```

### 2. Auto-Submit on Timer Expiration

```jsx
useEffect(() => {
  if (timeRemaining === null || timeRemaining > 0) return;
  
  // Timer hit zero - auto-submit
  handleSubmit(true); // true = autoSubmit flag
}, [timeRemaining]);
```

### 3. localStorage Backup Pattern

```javascript
// lib/quiz-storage.js
const STORAGE_PREFIX = 'quiz_answers_';
const STALE_HOURS = 24;

export function saveAnswers(attemptId, data) {
  const key = `${STORAGE_PREFIX}${attemptId}`;
  localStorage.setItem(key, JSON.stringify({
    ...data,
    lastSaved: new Date().toISOString()
  }));
}

export function loadAnswers(attemptId) {
  const key = `${STORAGE_PREFIX}${attemptId}`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
```

### 4. Answer Sync Strategy

```jsx
// On component mount
useEffect(() => {
  const local = loadAnswers(attemptId);
  const serverTime = new Date(attempt.updatedAt);
  const localTime = local ? new Date(local.lastSaved) : null;
  
  // Use newer data
  if (localTime && localTime > serverTime) {
    setAnswers(local.answers);
    // Sync to server
    autosaveAttempt(attemptId, local.answers);
  } else {
    setAnswers(serverAnswers);
  }
}, []);

// On answer change
const handleAnswerChange = (questionId, value) => {
  const newAnswers = { ...answers, [questionId]: value };
  setAnswers(newAnswers);
  
  // Immediate localStorage save
  saveAnswers(attemptId, { answers: newAnswers, ... });
  
  // Debounced server sync (handled by existing 30s interval)
};
```

### 5. Results Display with Policy Check

```jsx
// Results component
function QuizResults({ attemptId }) {
  const { result } = await getQuizResultWithReview(attemptId);
  
  const canShowAnswers = 
    result.quiz.showAnswersPolicy === 'after_submit' ||
    (result.quiz.showAnswersPolicy === 'after_pass' && result.attempt.passed);
  
  return (
    <div>
      <ScoreSummary score={result.attempt.scorePercent} passed={result.attempt.passed} />
      
      {canShowAnswers && result.review && (
        <AnswerReview questions={result.review.questions} />
      )}
      
      <AttemptHistory attempts={result.attemptHistory} />
    </div>
  );
}
```

### 6. Question Navigator Component

```jsx
function QuestionNavigator({ questions, answers, currentIndex, onNavigate }) {
  return (
    <nav role="navigation" aria-label="Question navigation" className="flex gap-2 overflow-x-auto">
      {questions.map((q, idx) => {
        const isAnswered = answers[q.id]?.length > 0;
        const isCurrent = idx === currentIndex;
        
        return (
          <button
            key={q.id}
            onClick={() => onNavigate(idx)}
            aria-label={`Question ${idx + 1}, ${isAnswered ? 'answered' : 'unanswered'}`}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'w-10 h-10 rounded-full font-medium',
              isAnswered ? 'bg-primary text-white' : 'bg-slate-200',
              isCurrent && 'ring-2 ring-primary ring-offset-2'
            )}
          >
            {idx + 1}
          </button>
        );
      })}
    </nav>
  );
}
```

### 7. Accessible Timer Announcements

```jsx
function QuizTimer({ expiresAt }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  
  const announcements = [
    { seconds: 300, message: '5 minutes remaining' },
    { seconds: 60, message: '1 minute remaining' },
    { seconds: 30, message: '30 seconds remaining' },
  ];
  
  useEffect(() => {
    // Check for announcement thresholds
    const match = announcements.find(a => 
      a.seconds === timeRemaining
    );
    if (match) {
      setAnnouncement(match.message);
    }
  }, [timeRemaining]);
  
  return (
    <>
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5" />
        <span aria-live="off">{formatTime(timeRemaining)}</span>
      </div>
      
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </>
  );
}
```

### 8. Certificate Eligibility Check

```jsx
// In certificate download component
async function handleDownload() {
  const { eligible, pendingQuizzes } = await checkCertificateEligibility(courseId);
  
  if (!eligible) {
    toast.error('Complete all required quizzes first');
    setPendingQuizzes(pendingQuizzes);
    return;
  }
  
  // Proceed with download
  downloadCertificate(courseId);
}
```

## i18n Keys to Add

Add these to `messages/en.json` under `"Quiz"`:

```json
{
  "Quiz": {
    "timeRemaining": "Time remaining",
    "minutesRemaining": "{count} minutes remaining",
    "secondsRemaining": "{count} seconds remaining",
    "questionNavigator": "Question navigation",
    "questionStatus": "Question {number}, {status}",
    "answered": "answered",
    "unanswered": "unanswered",
    "submitQuiz": "Submit Quiz",
    "reviewAnswers": "Review Answers",
    "yourAnswer": "Your answer",
    "correctAnswer": "Correct answer",
    "score": "Score",
    "passed": "Passed",
    "failed": "Failed",
    "attemptHistory": "Attempt History",
    "requiredQuiz": "Required",
    "quizRequired": "This quiz is required for course completion"
  }
}
```

## Testing Checklist

- [ ] Timer counts down accurately (within 2s of server time)
- [ ] Refreshing page restores timer and answers
- [ ] Answers auto-save every 30 seconds
- [ ] localStorage backup persists across tab close
- [ ] Auto-submit triggers when timer reaches zero
- [ ] Results show correct information based on `showAnswersPolicy`
- [ ] Question navigator updates on answer change
- [ ] Certificate blocked when required quiz not passed
- [ ] All new components keyboard navigable
- [ ] Screen reader announces timer warnings

## Common Issues

### Timer Resets on Refresh

**Cause**: Not fetching `expiresAt` from server on resume.  
**Fix**: Always calculate remaining time from server `expiresAt`.

### Answers Lost on Network Error

**Cause**: Not saving to localStorage before server sync.  
**Fix**: Save to localStorage immediately, sync to server on interval.

### Correct Answers Shown When Shouldn't Be

**Cause**: Not checking `showAnswersPolicy` + `passed` combination.  
**Fix**: Server action must enforce policy before returning data.

### Focus Lost on Question Change

**Cause**: Not managing focus after navigation.  
**Fix**: Use `useRef` to focus question container on index change.
