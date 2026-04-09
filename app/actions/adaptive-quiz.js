"use server";

import mongoose from "mongoose";
import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { Quiz } from "@/model/quizv2-model";
import { Attempt } from "@/model/attemptv2-model";
import { Question } from "@/model/questionv2-model";
import { Enrollment } from "@/model/enrollment-model";
import { 
  selectNextQuestion, 
  estimateAbilityEAP, 
  mapAbilityToDisplay, 
  calculateStandardError 
} from "@/lib/irt";
import { replaceMongoIdInObject } from "@/lib/convertData";

/**
 * Start a new adaptive quiz attempt or resume an existing one.
 */
export async function startAdaptiveAttempt(quizId, deviceId) {
  await dbConnect();
  
  const user = await getLoggedInUser();
  if (!user) throw new Error("Not authenticated");
  
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz || !quiz.published) throw new Error("Quiz not found or not published");
  if (!quiz.adaptiveConfig?.enabled) throw new Error("Quiz is not adaptive-enabled");
  
  // Authorization check: enrollment
  const enrollment = await Enrollment.findOne({ student: user.id, course: quiz.courseId });
  if (!enrollment && user.role !== 'admin' && user.role !== 'instructor') {
    throw new Error("Not enrolled in course");
  }

  // Check for existing in-progress attempt
  let attempt = await Attempt.findOne({
    quizId: quiz._id,
    studentId: user.id,
    status: "in_progress"
  });

  if (attempt) {
    if (attempt.adaptive?.activeDeviceId && attempt.adaptive.activeDeviceId !== deviceId) {
      throw new Error("Active session on another device");
    }
    
    // Resume existing
    const questionId = attempt.adaptive.questionOrder[attempt.adaptive.questionOrder.length - 1];
    const question = await Question.findById(questionId).lean();
    
    return {
      success: true,
      data: {
        attemptId: attempt._id.toString(),
        currentQuestion: replaceMongoIdInObject(question),
        questionNumber: attempt.adaptive.questionOrder.length,
        currentTheta: attempt.adaptive.currentTheta,
        currentSE: attempt.adaptive.currentSE,
        abilityLevel: mapAbilityToDisplay(attempt.adaptive.currentTheta).label,
        minQuestions: quiz.adaptiveConfig.minQuestions,
        maxQuestions: quiz.adaptiveConfig.maxQuestions,
        isResumed: true
      }
    };
  }

  // Create new attempt - fetch question pool for this quiz
  const questionPool = await Question.find({ quizId: quiz._id }).lean();
  if (questionPool.length === 0) throw new Error("Question pool is empty");

  const initialTheta = quiz.adaptiveConfig.initialTheta || 0.0;
  
  // Select first question
  const firstQuestion = selectNextQuestion(initialTheta, questionPool, []);
  if (!firstQuestion) throw new Error("Failed to select first question");

  attempt = await Attempt.create({
    quizId: quiz._id,
    studentId: user.id,
    status: "in_progress",
    adaptive: {
      enabled: true,
      currentTheta: initialTheta,
      currentSE: calculateStandardError(initialTheta, []),
      activeDeviceId: deviceId,
      questionOrder: [firstQuestion._id],
      thetaHistory: []
    }
  });

  return {
    success: true,
    data: {
      attemptId: attempt._id.toString(),
      currentQuestion: replaceMongoIdInObject(firstQuestion),
      questionNumber: 1,
      currentTheta: initialTheta,
      currentSE: attempt.adaptive.currentSE,
      abilityLevel: mapAbilityToDisplay(initialTheta).label,
      minQuestions: quiz.adaptiveConfig.minQuestions,
      maxQuestions: quiz.adaptiveConfig.maxQuestions,
      isResumed: false
    }
  };
}

/**
 * Submit answer to current question and get next question (or termination).
 */
export async function submitAdaptiveAnswer(attemptId, questionId, selectedOptionIds, deviceId) {
  await dbConnect();
  
  const user = await getLoggedInUser();
  if (!user) throw new Error("Not authenticated");

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.studentId.toString() !== user.id.toString()) throw new Error("Not authorized");
  if (attempt.status !== "in_progress") throw new Error("Attempt already submitted");
  if (attempt.adaptive?.activeDeviceId !== deviceId) throw new Error("Device ID mismatch");

  const currentQuestionInOrder = attempt.adaptive.questionOrder[attempt.adaptive.questionOrder.length - 1];
  if (currentQuestionInOrder.toString() !== questionId) throw new Error("Question ID doesn't match current question");

  const quiz = await Quiz.findById(attempt.quizId).lean();
  if (!quiz) throw new Error("Quiz not found");

  const question = await Question.findById(questionId).lean();
  if (!question) throw new Error("Question not found");

  // Grade
  const isCorrect = JSON.stringify(question.correctOptionIds.sort()) === JSON.stringify(selectedOptionIds.sort());
  const pointsEarned = isCorrect ? (question.points || 1) : 0;

  // Add answer entry
  attempt.answers.push({
    questionId: question._id,
    selectedOptionIds,
    score: pointsEarned,
    selectionMetrics: {
      // These should have been populated at selection time, but we update them here if needed
      // Actually they are in attempt.adaptive.questionOrder context
    }
  });

  // Update IRT ability estimate - fetch all answered questions' IRT params
  const answeredQuestionIds = attempt.answers.map(a => a.questionId);
  const answeredQuestions = await Question.find({ _id: { $in: answeredQuestionIds } }).lean();
  
  const fullResponses = attempt.answers.map(ans => {
    const q = answeredQuestions.find(aq => aq._id.toString() === ans.questionId.toString());
    if (!q) {
      console.error(`[ADAPTIVE_QUIZ] Question ${ans.questionId} not found in pool`);
      return { correct: ans.score > 0, params: { a: 1, b: 0, c: 0 } };
    }
    return {
      correct: ans.score > 0,
      params: q.irt || { a: 1, b: 0, c: 0 }
    };
  });

  const { theta, se } = estimateAbilityEAP(fullResponses);
  
  attempt.adaptive.currentTheta = theta;
  attempt.adaptive.currentSE = se;
  attempt.adaptive.thetaHistory.push({
    questionIndex: attempt.answers.length - 1,
    questionId: question._id,
    theta,
    se,
    timestamp: new Date()
  });

  // Termination check
  const questionsAnswered = attempt.answers.length;
  let terminationReason = null;

  if (questionsAnswered >= quiz.adaptiveConfig.minQuestions) {
    if (se <= quiz.adaptiveConfig.precisionThreshold) terminationReason = "precision_achieved";
    else if (questionsAnswered >= quiz.adaptiveConfig.maxQuestions) terminationReason = "max_reached";
  }

  const pool = await Question.find({ quizId: quiz._id }).lean();
  const nextQuestion = terminationReason ? null : selectNextQuestion(theta, pool, attempt.adaptive.questionOrder, {
    contentWeights: quiz.adaptiveConfig.contentBalancing?.enabled ? 
      Object.fromEntries(quiz.adaptiveConfig.contentBalancing.moduleWeights.map(mw => [mw.moduleId.toString(), mw.weight])) : {}
  });

  if (!terminationReason && !nextQuestion) {
    terminationReason = "pool_exhausted";
  }

  if (terminationReason) {
    attempt.status = "submitted";
    attempt.submittedAt = new Date();
    attempt.adaptive.terminationReason = terminationReason;
    
    // Final score calculation
    const totalScore = attempt.answers.reduce((acc, a) => acc + a.score, 0);
    const maxPossible = attempt.answers.length; // Simple mapping
    attempt.score = totalScore;
    attempt.scorePercent = (totalScore / maxPossible) * 100;
    attempt.passed = attempt.scorePercent >= quiz.passPercent;

    await attempt.save();

    return {
      success: true,
      data: {
        status: "terminated",
        answerResult: { correct: isCorrect, pointsEarned },
        finalTheta: theta,
        finalSE: se,
        abilityLevel: mapAbilityToDisplay(theta).label,
        terminationReason,
        summary: {
          totalQuestions: questionsAnswered,
          correctCount: attempt.answers.filter(a => a.score > 0).length,
          score: totalScore,
          scorePercent: attempt.scorePercent,
          passed: attempt.passed,
          confidenceInterval: { lower: theta - 1.96 * se, upper: theta + 1.96 * se }
        }
      }
    };
  }

  // Continuing
  attempt.adaptive.questionOrder.push(nextQuestion._id);
  await attempt.save();

  return {
    success: true,
    data: {
      status: "continuing",
      answerResult: { correct: isCorrect, pointsEarned },
      newTheta: theta,
      newSE: se,
      abilityLevel: mapAbilityToDisplay(theta).label,
      nextQuestion: replaceMongoIdInObject(nextQuestion),
      questionNumber: attempt.adaptive.questionOrder.length,
      progress: {
        answered: questionsAnswered,
        minQuestions: quiz.adaptiveConfig.minQuestions,
        maxQuestions: quiz.adaptiveConfig.maxQuestions,
        precisionAchieved: se <= quiz.adaptiveConfig.precisionThreshold
      }
    }
  };
}

/**
 * Get detailed results for a completed adaptive attempt.
 */
export async function getAdaptiveResult(attemptId) {
  await dbConnect();
  
  const user = await getLoggedInUser();
  if (!user) throw new Error("Not authenticated");

  const attempt = await Attempt.findById(attemptId).lean();
  if (!attempt) throw new Error("Attempt not found");
  
  // Authorization: Student (owner) or Instructor/Admin
  if (attempt.studentId.toString() !== user.id.toString() && user.role !== 'admin' && user.role !== 'instructor') {
    throw new Error("Not authorized");
  }

  if (attempt.status !== "submitted") throw new Error("Attempt not yet submitted");

  const quiz = await Quiz.findById(attempt.quizId).lean();
  const display = mapAbilityToDisplay(attempt.adaptive.currentTheta);

  const result = {
    attemptId: attempt._id.toString(),
    quizId: attempt.quizId.toString(),
    quizTitle: quiz.title,
    studentId: attempt.studentId.toString(),
    completedAt: attempt.submittedAt.toISOString(),
    finalTheta: attempt.adaptive.currentTheta,
    finalSE: attempt.adaptive.currentSE,
    abilityLevel: display.label,
    abilityPercentile: display.percentile,
    confidenceInterval: {
      lower: attempt.adaptive.currentTheta - 1.96 * attempt.adaptive.currentSE,
      upper: attempt.adaptive.currentTheta + 1.96 * attempt.adaptive.currentSE
    },
    terminationReason: attempt.adaptive.terminationReason,
    summary: {
      totalQuestions: attempt.answers.length,
      correctCount: attempt.answers.filter(a => a.score > 0).length,
      score: attempt.score,
      scorePercent: attempt.scorePercent,
      passed: attempt.passed
    },
    thetaProgression: attempt.adaptive.thetaHistory.map(h => ({
      questionNumber: h.questionIndex + 1,
      theta: h.theta,
      se: h.se
    }))
  };

  // Question review if policy allows
  const showAnswers = quiz.showAnswersPolicy === 'after_submit' || 
                    (quiz.showAnswersPolicy === 'after_pass' && attempt.passed);

  if (showAnswers) {
    const questionIds = attempt.answers.map(a => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } }).lean();
    
    result.questionReview = attempt.answers.map(ans => {
      const q = questions.find(aq => aq._id.toString() === ans.questionId.toString());
      return {
        questionId: q._id.toString(),
        text: q.text,
        yourAnswer: ans.selectedOptionIds,
        correctAnswer: q.correctOptionIds,
        isCorrect: ans.score > 0,
        explanation: q.explanation,
        irtDifficulty: q.irt?.b || 0
      };
    });
  }

  return {
    success: true,
    data: result
  };
}
