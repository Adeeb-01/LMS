# Quickstart: Adaptive IRT Testing

**Feature**: 016-adaptive-irt-testing  
**Date**: 2026-03-14

## Prerequisites

Before implementing this feature, ensure:

1. **Spec 009 is complete**: Questions have IRT parameters (a, b, c) in the schema
2. **Existing quiz system works**: Fixed-form quizzes function correctly
3. **Development environment ready**: Node.js 18+, MongoDB running

## Environment Variables

No new environment variables required. The feature uses existing database connections.

## Dependencies

### Install New Package

```bash
npm install mathjs
```

**Why mathjs**: Provides numerical integration capabilities for EAP (Expected A Posteriori) estimation.

## Implementation Order

Follow this sequence to ensure incremental testability:

### Phase 1: Core IRT Library (P1 - Foundation)

1. **Create `lib/irt/probability.js`**
   - Implement 3PL probability function: `P(θ) = c + (1-c) / (1 + e^(-a(θ-b)))`
   - Unit test with known values

2. **Create `lib/irt/information.js`**
   - Implement Fisher Information calculation
   - Unit test with edge cases (high/low θ)

3. **Create `lib/irt/estimation.js`**
   - Implement EAP estimation with numerical integration
   - Implement standard error calculation
   - Unit test with response patterns

4. **Create `lib/irt/selection.js`**
   - Implement Maximum Fisher Information selection
   - Handle content balancing (optional)
   - Unit test selection logic

### Phase 2: Schema Extensions (P1 - Data Layer)

5. **Extend Quiz model** (`model/quizv2-model.js`)
   - Add `adaptiveConfig` subdocument
   - Default to `enabled: false` for backward compatibility

6. **Extend Attempt model** (`model/attemptv2-model.js`)
   - Add `adaptive` subdocument with θ, SE, history
   - Add `activeDeviceId` for session locking
   - Add index for device lookup

7. **Extend Zod schemas** (`lib/validations.js`)
   - Add `adaptiveConfigSchema`
   - Add `adaptiveAnswerSchema`

### Phase 3: Server Actions (P1 - Business Logic)

8. **Create `app/actions/adaptive-quiz.js`**
   - Implement `startAdaptiveAttempt`
   - Implement `submitAdaptiveAnswer`
   - Implement `getAdaptiveResult`

9. **Extend `app/actions/quizv2.js`**
   - Add `updateQuizAdaptiveConfig`
   - Add `getQuizPoolAnalysis`

### Phase 4: Student UI (P1 - User Experience)

10. **Create `ability-indicator.jsx`**
    - Display θ as proficiency level and percentile
    - Animated progress indicator

11. **Create `adaptive-quiz-interface.jsx`**
    - Single question display (no navigator)
    - Real-time θ update after each answer
    - Termination handling

12. **Create `adaptive-results.jsx`**
    - Confidence interval display
    - θ progression chart
    - Question review (per policy)

### Phase 5: Instructor UI (P2 - Configuration)

13. **Create `adaptive-config-form.jsx`**
    - Enable/disable toggle
    - Precision threshold slider
    - Min/max questions inputs
    - Content balancing config

14. **Create question pool analysis view**
    - IRT distribution visualization
    - Recommendations display

### Phase 6: Analytics (P3 - Insights)

15. **Create `app/actions/adaptive-analytics.js`**
    - Quiz-level analytics
    - Question usage statistics

16. **Create analytics dashboard components**
    - Ability distribution chart
    - Question drift alerts

## Quick Validation Steps

### After Phase 1 (IRT Library)

```javascript
// Test in Node REPL or unit test
import { calculateProbability } from './lib/irt/probability.js';
import { estimateTheta } from './lib/irt/estimation.js';

// Question with a=1, b=0, c=0.2 (medium difficulty, 20% guessing)
const prob = calculateProbability(0, { a: 1, b: 0, c: 0.2 });
console.log(prob); // Should be ~0.6 (50% + guessing floor)

// Estimate θ after 3 correct, 2 incorrect
const responses = [
  { correct: true, irt: { a: 1, b: -1, c: 0.2 } },
  { correct: true, irt: { a: 1, b: 0, c: 0.2 } },
  { correct: true, irt: { a: 1, b: 1, c: 0.2 } },
  { correct: false, irt: { a: 1, b: 0.5, c: 0.2 } },
  { correct: false, irt: { a: 1, b: 1.5, c: 0.2 } },
];
const { theta, se } = estimateTheta(responses);
console.log(`θ = ${theta.toFixed(2)}, SE = ${se.toFixed(2)}`);
// Expected: θ around 0.3-0.5, SE around 0.4-0.5
```

### After Phase 3 (Server Actions)

```javascript
// Integration test
const result = await startAdaptiveAttempt(quizId, 'device-123');
expect(result.success).toBe(true);
expect(result.data.currentQuestion).toBeDefined();
expect(result.data.currentTheta).toBe(0);

// Answer question
const answer = await submitAdaptiveAnswer(
  result.data.attemptId,
  result.data.currentQuestion.id,
  ['option-1'],
  'device-123'
);
expect(answer.data.newTheta).not.toBe(0); // θ should change
```

### After Phase 4 (Student UI)

1. Create an adaptive quiz in dashboard
2. Add 20+ questions with varied difficulty
3. As student, start the quiz
4. Verify:
   - Questions adapt to your performance
   - Ability indicator updates
   - Quiz terminates when SE threshold met
   - Results show confidence interval

## Common Issues

### "θ estimate is always 0"

**Cause**: EAP calculation not accounting for responses  
**Fix**: Verify likelihood function multiplies (not replaces) for each response

### "Quiz never terminates early"

**Cause**: SE never reaches threshold  
**Fix**: Check question pool has sufficient discrimination (a > 0.5)

### "409 Session Conflict on same device"

**Cause**: DeviceId not persisting across page refreshes  
**Fix**: Store deviceId in localStorage, not sessionStorage

### "Fisher Information returns NaN"

**Cause**: Division by zero when P(θ) = 0 or 1  
**Fix**: Clamp probability to [0.001, 0.999] range

## File Checklist

```
□ lib/irt/probability.js
□ lib/irt/information.js
□ lib/irt/estimation.js
□ lib/irt/selection.js
□ lib/irt/index.js (exports)
□ model/quizv2-model.js (extended)
□ model/attemptv2-model.js (extended)
□ lib/validations.js (extended)
□ app/actions/adaptive-quiz.js
□ app/actions/adaptive-analytics.js
□ app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/adaptive-quiz-interface.jsx
□ app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/ability-indicator.jsx
□ app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/adaptive-results.jsx
□ app/[locale]/dashboard/courses/[courseId]/quizzes/[quizId]/_components/adaptive-config-form.jsx
□ tests/unit/irt/*.test.js
□ tests/integration/adaptive-quiz.test.js
□ messages/en.json (extended)
□ messages/ar.json (extended)
```
