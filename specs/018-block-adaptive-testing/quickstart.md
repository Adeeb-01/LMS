# Quickstart Guide: Block-Based Adaptive Testing Engine (BAT)

**Branch**: `018-block-adaptive-testing` | **Date**: 2026-03-30 | **Phase**: 1

## Overview

This guide provides developers with a quick reference for implementing BAT. It covers the core algorithms, API patterns, and UI integration points.

---

## Core Concepts

### Difficulty Bands

Questions are categorized into 3 bands based on IRT difficulty parameter (b):

| Band | Difficulty Range | Target θ Range |
|------|------------------|----------------|
| Easy | b < -1 | θ < -1 |
| Medium | -1 ≤ b ≤ 1 | -1 ≤ θ ≤ 1 |
| Hard | b > 1 | θ > 1 |

### Block Structure

- Each block contains **exactly 2 questions** from the same difficulty band
- Test consists of **exactly 5 blocks** (10 questions total)
- θ is recalculated **only after block submission**, not per-question

### Test Flow

```
[Block 1] → Submit → θ Update → [Block 2] → Submit → θ Update → ... → [Block 5] → Complete
```

---

## Implementation Checklist

### 1. Library Extensions (`lib/irt/`)

#### `difficulty-bands.js`

```javascript
// lib/irt/difficulty-bands.js

/**
 * Get difficulty band for a question based on IRT b parameter
 */
export function getDifficultyBand(b) {
  if (b < -1) return 'easy';
  if (b <= 1) return 'medium';
  return 'hard';
}

/**
 * Get target difficulty band based on current θ
 */
export function getTargetBandForTheta(theta) {
  if (theta < -1) return 'easy';
  if (theta <= 1) return 'medium';
  return 'hard';
}

/**
 * Validate question pool meets BAT requirements (4+ per band)
 */
export function validateBatPool(questions) {
  const counts = { easy: 0, medium: 0, hard: 0 };
  
  questions.forEach(q => {
    const band = getDifficultyBand(q.irt?.b ?? 0);
    counts[band]++;
  });
  
  const minPerBand = 4;
  const valid = counts.easy >= minPerBand && 
                counts.medium >= minPerBand && 
                counts.hard >= minPerBand;
  
  return { valid, counts, minRequired: minPerBand };
}
```

#### `block-selection.js`

```javascript
// lib/irt/block-selection.js
import { calculateFisherInformation } from './information.js';
import { getDifficultyBand, getTargetBandForTheta } from './difficulty-bands.js';

/**
 * Select a block of 2 questions from the appropriate difficulty band
 * 
 * @param {number} theta - Current ability estimate
 * @param {Array} pool - Question pool with IRT params
 * @param {Array} usedIds - Already-used question IDs (as strings)
 * @returns {Object} { questions, difficultyBand, selectionMetrics }
 */
export function selectBlock(theta, pool, usedIds = []) {
  const targetBand = getTargetBandForTheta(theta);
  const usedSet = new Set(usedIds.map(id => id.toString()));
  
  // Filter unused questions in target band
  let candidates = pool.filter(q => {
    const qId = (q._id || q.id).toString();
    return !usedSet.has(qId) && getDifficultyBand(q.irt?.b ?? 0) === targetBand;
  });
  
  let actualBand = targetBand;
  
  // Fallback to adjacent bands if needed
  if (candidates.length < 2) {
    actualBand = targetBand === 'medium' ? 'easy' : 'medium';
    const fallback = pool.filter(q => {
      const qId = (q._id || q.id).toString();
      return !usedSet.has(qId) && getDifficultyBand(q.irt?.b ?? 0) === actualBand;
    });
    candidates = [...candidates, ...fallback];
  }
  
  if (candidates.length < 2) {
    // Last resort: any unused questions
    candidates = pool.filter(q => {
      const qId = (q._id || q.id).toString();
      return !usedSet.has(qId);
    });
  }
  
  if (candidates.length < 2) {
    throw new Error('INSUFFICIENT_QUESTIONS');
  }
  
  // Sort by Fisher Information (descending) and take top 2
  candidates.sort((a, b) => 
    calculateFisherInformation(theta, b.irt) - calculateFisherInformation(theta, a.irt)
  );
  
  const selected = candidates.slice(0, 2);
  
  return {
    questions: selected,
    questionIds: selected.map(q => q._id || q.id),
    difficultyBand: actualBand,
    selectionMetrics: {
      targetBand,
      actualBand,
      fallbackUsed: actualBand !== targetBand,
      candidateCount: candidates.length,
      thetaAtSelection: theta
    }
  };
}
```

#### Update `index.js`

```javascript
// lib/irt/index.js
export * from './probability.js';
export * from './information.js';
export * from './estimation.js';
export * from './selection.js';
export * from './ability-display.js';
export * from './difficulty-bands.js';   // NEW
export * from './block-selection.js';     // NEW
```

---

### 2. Model Extensions

#### Quiz Model

```javascript
// In quizSchema definition (model/quizv2-model.js)

// Add after adaptiveConfig
batConfig: {
  enabled: { type: Boolean, default: false },
  blockSize: { type: Number, default: 2, min: 2, max: 5 },
  totalBlocks: { type: Number, default: 5, min: 3, max: 10 },
  initialTheta: { type: Number, default: 0.0 }
}
```

#### Attempt Model

```javascript
// In attemptSchema definition (model/attemptv2-model.js)

// Add after adaptive subdocument
bat: {
  enabled: { type: Boolean, default: false },
  currentTheta: { type: Number, default: 0.0 },
  currentSE: { type: Number, default: 1.0 },
  currentBlockIndex: { type: Number, default: 0 },
  blocks: [{
    index: { type: Number, required: true },
    difficultyBand: { type: String, enum: ['easy', 'medium', 'hard'] },
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    answers: [{
      questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
      selectedOptionIds: [String],
      correct: { type: Boolean, default: false },
      answeredAt: { type: Date, default: Date.now }
    }],
    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date },
    thetaAfterBlock: { type: Number },
    seAfterBlock: { type: Number }
  }],
  thetaHistory: [{
    blockIndex: { type: Number },
    theta: { type: Number },
    se: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }],
  terminationReason: { type: String, enum: ['blocks_completed', 'user_abandoned', null], default: null },
  missedConceptTags: [{ type: String }],
  activeSessionId: { type: String }
}
```

#### Question Model

```javascript
// In questionSchema definition (model/questionv2-model.js)

// Add after existing fields
conceptTags: {
  type: [String],
  default: []
}

// Add index
questionSchema.index({ conceptTags: 1 });
```

---

### 3. Server Actions (`app/actions/bat-quiz.js`)

```javascript
"use server";

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { Quiz } from "@/model/quizv2-model";
import { Attempt } from "@/model/attemptv2-model";
import { Question } from "@/model/questionv2-model";
import { selectBlock, estimateAbilityEAP, mapAbilityToDisplay } from "@/lib/irt";
import { replaceMongoIdInObject } from "@/lib/convertData";

/**
 * Start or resume a BAT quiz attempt
 */
export async function startBatAttempt(quizId, sessionId) {
  await dbConnect();
  const user = await getLoggedInUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz?.published) throw new Error("QUIZ_NOT_FOUND");
  if (!quiz.batConfig?.enabled) throw new Error("BAT_NOT_ENABLED");

  // Check for existing attempt
  let attempt = await Attempt.findOne({
    quizId: quiz._id,
    studentId: user.id,
    status: "in_progress"
  });

  if (attempt) {
    // Handle session conflict
    if (attempt.bat?.activeSessionId && attempt.bat.activeSessionId !== sessionId) {
      // Invalidate old session, keep only submitted blocks
      attempt.bat.blocks = attempt.bat.blocks.filter(b => b.submitted);
      attempt.bat.currentBlockIndex = attempt.bat.blocks.length;
    }
    attempt.bat.activeSessionId = sessionId;
    
    // Get current block to display
    if (attempt.bat.currentBlockIndex < quiz.batConfig.totalBlocks) {
      const currentBlock = attempt.bat.blocks[attempt.bat.currentBlockIndex];
      if (currentBlock && !currentBlock.submitted) {
        const questions = await Question.find({ 
          _id: { $in: currentBlock.questionIds } 
        }).lean();
        
        await attempt.save();
        return {
          success: true,
          data: {
            attemptId: attempt._id.toString(),
            currentBlock: {
              index: currentBlock.index,
              questions: questions.map(replaceMongoIdInObject),
              difficultyBand: currentBlock.difficultyBand
            },
            blockNumber: currentBlock.index + 1,
            totalBlocks: quiz.batConfig.totalBlocks,
            theta: attempt.bat.currentTheta,
            abilityLevel: mapAbilityToDisplay(attempt.bat.currentTheta).label,
            isResumed: true
          }
        };
      }
    }
  }

  // Create new attempt or select next block
  const pool = await Question.find({ quizId: quiz._id }).lean();
  const usedIds = attempt?.bat?.blocks?.flatMap(b => b.questionIds.map(id => id.toString())) || [];
  const initialTheta = quiz.batConfig.initialTheta ?? 0.0;
  
  const block = selectBlock(initialTheta, pool, usedIds);

  if (!attempt) {
    attempt = new Attempt({
      quizId: quiz._id,
      studentId: user.id,
      status: "in_progress",
      bat: {
        enabled: true,
        currentTheta: initialTheta,
        currentSE: 1.0,
        currentBlockIndex: 0,
        blocks: [{
          index: 0,
          difficultyBand: block.difficultyBand,
          questionIds: block.questionIds,
          answers: [],
          submitted: false
        }],
        thetaHistory: [],
        activeSessionId: sessionId
      }
    });
  } else {
    attempt.bat.blocks.push({
      index: attempt.bat.currentBlockIndex,
      difficultyBand: block.difficultyBand,
      questionIds: block.questionIds,
      answers: [],
      submitted: false
    });
  }

  await attempt.save();

  return {
    success: true,
    data: {
      attemptId: attempt._id.toString(),
      currentBlock: {
        index: attempt.bat.currentBlockIndex,
        questions: block.questions.map(replaceMongoIdInObject),
        difficultyBand: block.difficultyBand
      },
      blockNumber: attempt.bat.currentBlockIndex + 1,
      totalBlocks: quiz.batConfig.totalBlocks,
      theta: attempt.bat.currentTheta,
      abilityLevel: mapAbilityToDisplay(attempt.bat.currentTheta).label,
      isResumed: false
    }
  };
}

/**
 * Submit answers for a block and get next block or results
 */
export async function submitBatBlock(attemptId, answers, sessionId) {
  // answers: [{ questionId, selectedOptionIds }, { questionId, selectedOptionIds }]
  await dbConnect();
  const user = await getLoggedInUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");

  if (answers.length !== 2) throw new Error("INVALID_ANSWER_COUNT");

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");
  if (attempt.studentId.toString() !== user.id) throw new Error("NOT_AUTHORIZED");
  if (attempt.status !== "in_progress") throw new Error("ATTEMPT_COMPLETED");
  if (attempt.bat?.activeSessionId !== sessionId) throw new Error("SESSION_MISMATCH");

  const currentBlock = attempt.bat.blocks[attempt.bat.currentBlockIndex];
  if (!currentBlock || currentBlock.submitted) throw new Error("BLOCK_ALREADY_SUBMITTED");

  const quiz = await Quiz.findById(attempt.quizId).lean();
  const questions = await Question.find({ 
    _id: { $in: currentBlock.questionIds } 
  }).lean();

  // Grade answers
  const gradedAnswers = answers.map(ans => {
    const question = questions.find(q => q._id.toString() === ans.questionId);
    if (!question) throw new Error("QUESTION_NOT_FOUND");
    
    const correct = JSON.stringify(question.correctOptionIds.sort()) === 
                   JSON.stringify(ans.selectedOptionIds.sort());
    
    return {
      questionId: question._id,
      selectedOptionIds: ans.selectedOptionIds,
      correct,
      answeredAt: new Date()
    };
  });

  // Update block
  currentBlock.answers = gradedAnswers;
  currentBlock.submitted = true;
  currentBlock.submittedAt = new Date();

  // Calculate new θ using all responses
  const allQuestionIds = attempt.bat.blocks
    .filter(b => b.submitted || b.index === currentBlock.index)
    .flatMap(b => b.answers.map(a => a.questionId));
  
  const allQuestions = await Question.find({ _id: { $in: allQuestionIds } }).lean();
  
  const responses = attempt.bat.blocks
    .filter(b => b.submitted || b.index === currentBlock.index)
    .flatMap(b => b.answers.map(a => {
      const q = allQuestions.find(aq => aq._id.toString() === a.questionId.toString());
      return { correct: a.correct, params: q.irt };
    }));

  const { theta, se } = estimateAbilityEAP(responses);
  
  currentBlock.thetaAfterBlock = theta;
  currentBlock.seAfterBlock = se;
  
  attempt.bat.currentTheta = theta;
  attempt.bat.currentSE = se;
  attempt.bat.thetaHistory.push({
    blockIndex: currentBlock.index,
    theta,
    se,
    timestamp: new Date()
  });

  // Check if complete
  const isComplete = attempt.bat.currentBlockIndex >= quiz.batConfig.totalBlocks - 1;

  if (isComplete) {
    // Compute missed concept tags
    const incorrectQuestionIds = attempt.bat.blocks
      .flatMap(b => b.answers.filter(a => !a.correct).map(a => a.questionId));
    
    const incorrectQuestions = await Question.find({ 
      _id: { $in: incorrectQuestionIds } 
    }).select('conceptTags').lean();
    
    const missedTags = [...new Set(
      incorrectQuestions.flatMap(q => q.conceptTags || [])
    )];

    attempt.bat.missedConceptTags = missedTags;
    attempt.bat.terminationReason = 'blocks_completed';
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    
    // Calculate final score
    const totalCorrect = attempt.bat.blocks
      .flatMap(b => b.answers)
      .filter(a => a.correct).length;
    
    attempt.score = totalCorrect;
    attempt.scorePercent = (totalCorrect / 10) * 100;
    attempt.passed = attempt.scorePercent >= quiz.passPercent;

    await attempt.save();

    return {
      success: true,
      data: {
        status: 'completed',
        finalTheta: theta,
        finalSE: se,
        abilityLevel: mapAbilityToDisplay(theta).label,
        terminationReason: 'blocks_completed',
        summary: {
          totalQuestions: 10,
          correctCount: totalCorrect,
          scorePercent: attempt.scorePercent,
          passed: attempt.passed,
          missedConceptTags: missedTags
        }
      }
    };
  }

  // Select next block
  const pool = await Question.find({ quizId: quiz._id }).lean();
  const usedIds = attempt.bat.blocks.flatMap(b => b.questionIds.map(id => id.toString()));
  const nextBlock = selectBlock(theta, pool, usedIds);

  attempt.bat.currentBlockIndex++;
  attempt.bat.blocks.push({
    index: attempt.bat.currentBlockIndex,
    difficultyBand: nextBlock.difficultyBand,
    questionIds: nextBlock.questionIds,
    answers: [],
    submitted: false
  });

  await attempt.save();

  return {
    success: true,
    data: {
      status: 'continuing',
      answerResults: gradedAnswers.map(a => ({ correct: a.correct })),
      newTheta: theta,
      newSE: se,
      abilityLevel: mapAbilityToDisplay(theta).label,
      nextBlock: {
        index: attempt.bat.currentBlockIndex,
        questions: nextBlock.questions.map(replaceMongoIdInObject),
        difficultyBand: nextBlock.difficultyBand
      },
      blockNumber: attempt.bat.currentBlockIndex + 1,
      totalBlocks: quiz.batConfig.totalBlocks
    }
  };
}
```

---

### 4. UI Component Skeleton

```jsx
// app/[locale]/(main)/courses/[id]/quizzes/[quizId]/_components/bat-quiz-interface.jsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitBatBlock } from "@/app/actions/bat-quiz";
import { BlockProgressIndicator } from "./block-progress-indicator";
import { AbilityIndicator } from "./ability-indicator";

export function BatQuizInterface({ quiz, courseId, initialData, sessionId }) {
  const router = useRouter();
  const [currentBlock, setCurrentBlock] = useState(initialData.currentBlock);
  const [blockNumber, setBlockNumber] = useState(initialData.blockNumber);
  const [theta, setTheta] = useState(initialData.theta);
  const [answers, setAnswers] = useState({});  // { questionId: [optionIds] }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allAnswered = currentBlock.questions.every(
    q => answers[q.id]?.length > 0
  );

  const handleSubmitBlock = useCallback(async () => {
    if (!allAnswered || isSubmitting) return;
    setIsSubmitting(true);

    const blockAnswers = currentBlock.questions.map(q => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id]
    }));

    try {
      const result = await submitBatBlock(initialData.attemptId, blockAnswers, sessionId);
      
      if (result.data.status === 'completed') {
        router.push(`/courses/${courseId}/quizzes/${quiz.id}/result?attemptId=${initialData.attemptId}`);
      } else {
        setCurrentBlock(result.data.nextBlock);
        setBlockNumber(result.data.blockNumber);
        setTheta(result.data.newTheta);
        setAnswers({});
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [allAnswered, answers, currentBlock, initialData.attemptId, sessionId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1>{quiz.title}</h1>
        <AbilityIndicator theta={theta} />
      </div>

      {/* Progress */}
      <BlockProgressIndicator 
        current={blockNumber} 
        total={initialData.totalBlocks} 
      />

      {/* Questions (2 per block) */}
      <div className="space-y-6">
        {currentBlock.questions.map((question, idx) => (
          <QuestionCard
            key={question.id}
            question={question}
            questionNumber={idx + 1}
            selectedOptions={answers[question.id] || []}
            onAnswerChange={(optionIds) => 
              setAnswers(prev => ({ ...prev, [question.id]: optionIds }))
            }
          />
        ))}
      </div>

      {/* Submit Block */}
      <Button 
        onClick={handleSubmitBlock} 
        disabled={!allAnswered || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Block'}
      </Button>
    </div>
  );
}
```

---

## Testing Quick Reference

### Unit Tests

```javascript
// tests/unit/irt/block-selection.test.js
import { selectBlock } from '@/lib/irt/block-selection';

describe('selectBlock', () => {
  const mockPool = [
    { _id: '1', irt: { a: 1, b: -1.5, c: 0.2 } },  // easy
    { _id: '2', irt: { a: 1, b: -1.2, c: 0.2 } },  // easy
    { _id: '3', irt: { a: 1, b: 0, c: 0.2 } },     // medium
    { _id: '4', irt: { a: 1, b: 0.5, c: 0.2 } },   // medium
    { _id: '5', irt: { a: 1, b: 1.5, c: 0.2 } },   // hard
    { _id: '6', irt: { a: 1, b: 2, c: 0.2 } },     // hard
  ];

  it('selects 2 questions from medium band when theta = 0', () => {
    const result = selectBlock(0, mockPool, []);
    expect(result.questions.length).toBe(2);
    expect(result.difficultyBand).toBe('medium');
  });

  it('selects 2 questions from easy band when theta = -1.5', () => {
    const result = selectBlock(-1.5, mockPool, []);
    expect(result.questions.length).toBe(2);
    expect(result.difficultyBand).toBe('easy');
  });

  it('excludes already used questions', () => {
    const result = selectBlock(0, mockPool, ['3', '4']);
    expect(result.questions.every(q => !['3', '4'].includes(q._id))).toBe(true);
  });
});
```

---

## Common Errors

| Error Code | Cause | Solution |
|------------|-------|----------|
| `BAT_NOT_ENABLED` | Quiz doesn't have BAT mode enabled | Enable BAT in quiz settings |
| `INSUFFICIENT_QUESTIONS` | Pool has <2 unused questions | Add more questions or check used IDs |
| `SESSION_MISMATCH` | Different session trying to continue | Start new attempt or use correct session |
| `INVALID_ANSWER_COUNT` | Not exactly 2 answers submitted | Ensure both questions answered |
