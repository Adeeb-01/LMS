"use server";

import { dbConnect } from "@/service/mongo";
import { Quiz } from "@/model/quizv2-model";
import { Attempt } from "@/model/attemptv2-model";
import { Question } from "@/model/questionv2-model";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { assertInstructorOwnsCourse, isAdmin } from "@/lib/authorization";
import mongoose from "mongoose";

/**
 * Get analytics for an adaptive quiz across all attempts (US4)
 */
export async function getAdaptiveQuizAnalytics(quizId) {
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

        // Get all submitted adaptive attempts
        const attempts = await Attempt.find({
            quizId: new mongoose.Types.ObjectId(quizId),
            status: "submitted",
            "adaptive.enabled": true
        }).lean();

        const totalAttempts = attempts.length;
        if (totalAttempts === 0) {
            return {
                success: true,
                data: {
                    quizId,
                    totalAttempts: 0,
                    completedAttempts: 0,
                    averageQuestionsToTermination: 0,
                    averageTestDuration: 0,
                    terminationReasons: { precision_achieved: 0, max_reached: 0, pool_exhausted: 0 },
                    abilityDistribution: { mean: 0, stdDev: 0, min: 0, max: 0, histogram: [] },
                    questionUsage: []
                }
            };
        }

        // 1. Basic Stats
        let totalQuestions = 0;
        let totalDurationMs = 0;
        const terminationReasons = { precision_achieved: 0, max_reached: 0, pool_exhausted: 0 };
        const thetas = [];

        attempts.forEach(attempt => {
            totalQuestions += (attempt.answers?.length || 0);
            if (attempt.submittedAt && attempt.createdAt) {
                totalDurationMs += (new Date(attempt.submittedAt) - new Date(attempt.createdAt));
            }
            if (attempt.adaptive?.terminationReason) {
                terminationReasons[attempt.adaptive.terminationReason] = (terminationReasons[attempt.adaptive.terminationReason] || 0) + 1;
            }
            if (attempt.adaptive?.currentTheta !== undefined) {
                thetas.push(attempt.adaptive.currentTheta);
            }
        });

        // 2. Ability Distribution
        const mean = thetas.reduce((a, b) => a + b, 0) / thetas.length;
        const stdDev = Math.sqrt(thetas.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / thetas.length);
        const minTheta = Math.min(...thetas);
        const maxTheta = Math.max(...thetas);

        // Histogram (bins of 0.5 from -4 to 4)
        const histogram = [];
        for (let i = -4; i < 4; i += 0.5) {
            const count = thetas.filter(t => t >= i && t < i + 0.5).length;
            histogram.push({ range: `${i} to ${i + 0.5}`, count });
        }

        // 3. Question Usage & Drift Detection
        const questions = await Question.find({ quizId: new mongoose.Types.ObjectId(quizId) }).lean();
        const questionUsageMap = {};
        
        questions.forEach(q => {
            questionUsageMap[q._id.toString()] = {
                questionId: q._id.toString(),
                text: q.text,
                timesSelected: 0,
                correctCount: 0,
                calibratedDifficulty: q.irt?.b ?? 0,
                totalFisherInfo: 0
            };
        });

        attempts.forEach(attempt => {
            attempt.answers?.forEach(ans => {
                const qUsage = questionUsageMap[ans.questionId.toString()];
                if (qUsage) {
                    qUsage.timesSelected++;
                    // We need to know if it was correct. Standard Attempt model has answers with points or isCorrect?
                    // In attemptv2-model, answers have selectionMetrics and points earned.
                    if (ans.score > 0) {
                        qUsage.correctCount++;
                    }
                    if (ans.selectionMetrics?.fisherInformation) {
                        qUsage.totalFisherInfo += ans.selectionMetrics.fisherInformation;
                    }
                }
            });
        });

        const questionUsage = Object.values(questionUsageMap).map(u => {
            const selectionRate = u.timesSelected / totalAttempts;
            const successRate = u.timesSelected > 0 ? u.correctCount / u.timesSelected : 0;
            
            // Observed difficulty (inverse of success rate, mapped to IRT scale roughly)
            // A simple mapping: success 0.5 -> b = mean theta of people who took it
            // For now, let's use a simplified drift calculation
            const observedDifficulty = -Math.log((1 - successRate) / Math.max(0.01, successRate)); 
            const drift = Math.abs(observedDifficulty - u.calibratedDifficulty);

            return {
                ...u,
                selectionRate,
                successRate,
                observedDifficulty,
                drift,
                flaggedForRecalibration: drift > 1.0 && u.timesSelected > 10 // Flag if drift is high and sample size decent
            };
        });

        return {
            success: true,
            data: {
                quizId,
                totalAttempts,
                completedAttempts: totalAttempts,
                averageQuestionsToTermination: totalQuestions / totalAttempts,
                averageTestDuration: (totalDurationMs / totalAttempts) / 1000,
                terminationReasons,
                abilityDistribution: {
                    mean,
                    stdDev,
                    min: minTheta,
                    max: maxTheta,
                    histogram
                },
                questionUsage: questionUsage.sort((a, b) => b.timesSelected - a.timesSelected)
            }
        };
    } catch (error) {
        console.error("[GET_ADAPTIVE_QUIZ_ANALYTICS] Error:", error);
        return { success: false, error: { code: "SERVER_ERROR", message: error.message } };
    }
}
