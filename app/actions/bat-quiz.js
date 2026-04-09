"use server";

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { Quiz } from "@/model/quizv2-model";
import { Attempt } from "@/model/attemptv2-model";
import { Question } from "@/model/questionv2-model";
import { selectBlock, mapAbilityToDisplay, estimateAbilityEAP, validateBatPool as validatePoolLib } from "@/lib/irt";
import { replaceMongoIdInObject } from "@/lib/convertData";

import { assertInstructorOwnsCourse, isAdmin } from "@/lib/authorization";
import mongoose from "mongoose";

/**
 * Validate BAT pool for a quiz (US5)
 * @param {string} quizId - The ID of the quiz to validate
 * @returns {Promise<{valid: boolean, counts?: object, error?: string}>}
 */
export async function validateBatPool(quizId) {
  await dbConnect();
  try {
    const questions = await Question.find({ quizId }).lean();
    if (!questions || questions.length === 0) {
      return { valid: false, error: "No questions found in this quiz." };
    }
    return validatePoolLib(questions);
  } catch (error) {
    console.error("[VALIDATE_BAT_POOL] Error:", error);
    return { valid: false, error: error.message || "An unexpected error occurred during pool validation." };
  }
}

/**
 * Get aggregated concept gap analysis for a quiz (US4)
 * @param {string} quizId - The ID of the quiz to analyze
 * @returns {Promise<{success: boolean, data?: object, error?: object}>}
 */
export async function getConceptGapAnalysis(quizId) {
  await dbConnect();
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { success: false, error: { code: "NOT_AUTHENTICATED", message: "Unauthorized" } };
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return { success: false, error: { code: "NOT_FOUND", message: "Quiz not found" } };
    }

    // Verify ownership
    if (!isAdmin(user)) {
      await assertInstructorOwnsCourse(quiz.courseId.toString(), user.id, { allowAdmin: false });
    }

    // Get all submitted BAT attempts for this quiz
    const attempts = await Attempt.find({
      quizId: new mongoose.Types.ObjectId(quizId),
      status: "submitted",
      "bat.enabled": true
    }).lean();

    if (attempts.length === 0) {
      return {
        success: true,
        data: {
          quizId,
          totalAttempts: 0,
          missedConcepts: []
        }
      };
    }

    // Aggregate missed concept tags
    const conceptCounts = {};
    attempts.forEach(attempt => {
      const tags = attempt.bat?.missedConceptTags || [];
      tags.forEach(tag => {
        conceptCounts[tag] = (conceptCounts[tag] || 0) + 1;
      });
    });

    const missedConcepts = Object.entries(conceptCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / attempts.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      data: {
        quizId,
        totalAttempts: attempts.length,
        missedConcepts
      }
    };
  } catch (error) {
    console.error("[GET_CONCEPT_GAP_ANALYSIS] Error:", error);
    return { success: false, error: { code: "SERVER_ERROR", message: error.message } };
  }
}

/**
 * Start or resume a BAT quiz attempt
 * @param {string} quizId - The ID of the quiz to start
 * @param {string} sessionId - Unique session ID for concurrency control
 * @returns {Promise<{success: boolean, data?: object, error?: object}>}
 */
export async function startBatAttempt(quizId, sessionId) {
  await dbConnect();
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { success: false, error: { code: "NOT_AUTHENTICATED", message: "You must be logged in to start a quiz." } };
    }

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) {
      return { success: false, error: { code: "NOT_FOUND", message: "Quiz not found." } };
    }
    if (!quiz.published) {
      return { success: false, error: { code: "NOT_PUBLISHED", message: "This quiz is not yet published." } };
    }
    if (!quiz.batConfig?.enabled) {
      return { success: false, error: { code: "BAT_DISABLED", message: "Block-based adaptive testing is not enabled for this quiz." } };
    }

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
        attempt.bat.activeSessionId = sessionId;
        await attempt.save();
      }
      
      // Get current block to display
      if (attempt.bat.currentBlockIndex < quiz.batConfig.totalBlocks) {
        let currentBlock = attempt.bat.blocks[attempt.bat.currentBlockIndex];
        
        // If no current block exists (e.g. after session invalidation), select one
        if (!currentBlock) {
          const pool = await Question.find({ quizId: quiz._id }).lean();
          const usedIds = attempt.bat.blocks.flatMap(b => b.questionIds.map(id => id.toString()));
          const block = selectBlock(attempt.bat.currentTheta, pool, usedIds);
          
          currentBlock = {
            index: attempt.bat.currentBlockIndex,
            difficultyBand: block.difficultyBand,
            questionIds: block.questionIds,
            answers: [],
            submitted: false
          };
          attempt.bat.blocks.push(currentBlock);
          await attempt.save();
        }

        if (currentBlock && !currentBlock.submitted) {
          const questions = await Question.find({ 
            _id: { $in: currentBlock.questionIds } 
          }).lean();
          
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
      // This part should only be reached if we need a new block and none exists
      if (attempt.bat.blocks.length <= attempt.bat.currentBlockIndex) {
        attempt.bat.blocks.push({
          index: attempt.bat.currentBlockIndex,
          difficultyBand: block.difficultyBand,
          questionIds: block.questionIds,
          answers: [],
          submitted: false
        });
      }
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
  } catch (error) {
    console.error("[START_BAT_ATTEMPT] Error:", error);
    return { success: false, error: { code: "SERVER_ERROR", message: error.message || "An unexpected error occurred while starting the quiz." } };
  }
}

/**
 * Submit answers for a block and get next block or results
 * @param {string} attemptId - The ID of the attempt to update
 * @param {Array} answers - Array of answer objects {questionId, selectedOptionIds}
 * @param {string} sessionId - Unique session ID for concurrency control
 * @returns {Promise<{success: boolean, data?: object, error?: object}>}
 */
export async function submitBatBlock(attemptId, answers, sessionId) {
  await dbConnect();
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { success: false, error: { code: "NOT_AUTHENTICATED", message: "You must be logged in to submit answers." } };
    }

    if (!answers || answers.length !== 2) {
      return { success: false, error: { code: "INVALID_INPUT", message: "Exactly two answers are required for a block." } };
    }

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return { success: false, error: { code: "NOT_FOUND", message: "Quiz attempt not found." } };
    }
    if (attempt.studentId.toString() !== user.id) {
      return { success: false, error: { code: "NOT_AUTHORIZED", message: "You are not authorized to submit for this attempt." } };
    }
    if (attempt.status !== "in_progress") {
      return { success: false, error: { code: "ALREADY_SUBMITTED", message: "This quiz attempt has already been completed." } };
    }
    if (attempt.bat?.activeSessionId !== sessionId) {
      return { success: false, error: { code: "SESSION_CONFLICT", message: "This session is no longer active. Please refresh the page." } };
    }

    const currentBlock = attempt.bat.blocks[attempt.bat.currentBlockIndex];
    if (!currentBlock || currentBlock.submitted) {
      return { success: false, error: { code: "BLOCK_ALREADY_SUBMITTED", message: "This block has already been submitted." } };
    }

    const quiz = await Quiz.findById(attempt.quizId).lean();
    const questions = await Question.find({ 
      _id: { $in: currentBlock.questionIds } 
    }).lean();

    // Grade answers
    const gradedAnswers = answers.map(ans => {
      const question = questions.find(q => q._id.toString() === ans.questionId);
      if (!question) throw new Error(`Question ${ans.questionId} not found in pool.`);
      
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
      .filter(b => b.submitted)
      .flatMap(b => b.answers.map(a => a.questionId));
    
    const allQuestions = await Question.find({ _id: { $in: allQuestionIds } }).lean();
    
    const responses = attempt.bat.blocks
      .filter(b => b.submitted)
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
    const isComplete = attempt.bat.currentBlockIndex >= (quiz.batConfig?.totalBlocks || 5) - 1;

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
      attempt.passed = attempt.scorePercent >= (quiz.passPercent || 70);

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
    const newBlock = {
      index: attempt.bat.currentBlockIndex,
      difficultyBand: nextBlock.difficultyBand,
      questionIds: nextBlock.questionIds,
      answers: [],
      submitted: false
    };
    attempt.bat.blocks.push(newBlock);

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
          index: newBlock.index,
          questions: nextBlock.questions.map(replaceMongoIdInObject),
          difficultyBand: newBlock.difficultyBand
        },
        blockNumber: newBlock.index + 1,
        totalBlocks: quiz.batConfig?.totalBlocks || 5
      }
    };
  } catch (error) {
    console.error("[SUBMIT_BAT_BLOCK] Error:", error);
    return { success: false, error: { code: "SERVER_ERROR", message: error.message || "An unexpected error occurred while submitting your answers." } };
  }
}

/**
 * Get results for a completed BAT attempt
 * @param {string} attemptId - The ID of the attempt to fetch
 * @returns {Promise<{success: boolean, data?: object, error?: object}>}
 */
export async function getBatResult(attemptId) {
  await dbConnect();
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { success: false, error: { code: "NOT_AUTHENTICATED", message: "You must be logged in to view results." } };
    }

    const attempt = await Attempt.findById(attemptId).lean();
    if (!attempt) {
      return { success: false, error: { code: "NOT_FOUND", message: "Quiz attempt not found." } };
    }
    if (attempt.studentId.toString() !== user.id) {
      return { success: false, error: { code: "NOT_AUTHORIZED", message: "You are not authorized to view these results." } };
    }
    if (attempt.status !== "submitted") {
      return { success: false, error: { code: "NOT_COMPLETED", message: "This quiz attempt is not yet completed." } };
    }

    const quiz = await Quiz.findById(attempt.quizId).lean();
    const questionIds = attempt.bat.blocks.flatMap(b => b.questionIds);
    const questions = await Question.find({ _id: { $in: questionIds } }).lean();

    const blocks = attempt.bat.blocks.map(block => ({
      index: block.index,
      difficultyBand: block.difficultyBand,
      correctCount: block.answers.filter(a => a.correct).length,
      thetaAfterBlock: block.thetaAfterBlock,
      questions: block.questionIds.map(qId => {
        const question = questions.find(q => q._id.toString() === qId.toString());
        const answer = block.answers.find(a => a.questionId.toString() === qId.toString());
        return {
          ...replaceMongoIdInObject(question),
          yourAnswer: answer?.selectedOptionIds || [],
          isCorrect: answer?.correct || false
        };
      })
    }));

    return {
      success: true,
      data: {
        attemptId: attempt._id.toString(),
        quizId: quiz._id.toString(),
        quizTitle: quiz.title,
        studentId: attempt.studentId.toString(),
        completedAt: attempt.submittedAt,
        finalTheta: attempt.bat.currentTheta,
        finalSE: attempt.bat.currentSE,
        abilityLevel: mapAbilityToDisplay(attempt.bat.currentTheta).label,
        summary: {
          totalQuestions: 10,
          correctCount: attempt.score,
          scorePercent: attempt.scorePercent,
          passed: attempt.passed
        },
        missedConceptTags: attempt.bat.missedConceptTags,
        blocks,
        thetaProgression: attempt.bat.thetaHistory.map(h => ({
          blockNumber: h.blockIndex + 1,
          theta: h.theta,
          se: h.se
        }))
      }
    };
  } catch (error) {
    console.error("[GET_BAT_RESULT] Error:", error);
    return { success: false, error: { code: "SERVER_ERROR", message: error.message || "An unexpected error occurred while fetching results." } };
  }
}
