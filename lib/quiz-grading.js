import "server-only";
import { dbConnect } from "@/service/mongo";
import { Question } from "@/model/question-model";
import mongoose from "mongoose";

/**
 * Grade a quiz attempt
 * Returns: { totalPoints, maxPoints, percentage, passed, answers }
 */
export async function gradeQuizAttempt(quiz, answers, passScore) {
    await dbConnect();
    
    try {
        const questionIds = answers.map(a => a.questionId);
        const questions = await Question.find({
            _id: { $in: questionIds.map(id => new mongoose.Types.ObjectId(id)) }
        }).lean();
        
        const questionsMap = new Map(questions.map(q => [q._id.toString(), q]));
        
        let totalPoints = 0;
        let maxPoints = 0;
        const gradedAnswers = [];
        
        for (const question of questions) {
            maxPoints += question.points;
            const answer = answers.find(a => a.questionId === question._id.toString());
            const graded = gradeQuestion(question, answer);
            
            totalPoints += graded.pointsAwarded;
            gradedAnswers.push({
                question: question._id,
                selectedOptions: answer?.selectedOptions || [],
                pointsAwarded: graded.pointsAwarded,
                isCorrect: graded.isCorrect,
                graded: false // auto-graded
            });
        }
        
        const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
        const passed = percentage >= passScore;
        
        return {
            totalPoints,
            maxPoints,
            percentage,
            passed,
            answers: gradedAnswers
        };
    } catch (error) {
        console.error('[QUIZ_GRADING] Error:', error);
        throw new Error(`Failed to grade quiz: ${error.message}`);
    }
}

/**
 * Grade a single question
 */
function gradeQuestion(question, answer) {
    if (!answer || !answer.selectedOptions || answer.selectedOptions.length === 0) {
        return {
            pointsAwarded: 0,
            isCorrect: false
        };
    }
    
    switch (question.questionType) {
        case 'multiple_choice_single': {
            // Single correct answer
            const selectedIndex = answer.selectedOptions[0];
            const correctOption = question.options.find(opt => opt.isCorrect);
            const correctIndex = question.options.indexOf(correctOption);
            
            const isCorrect = selectedIndex === correctIndex;
            return {
                pointsAwarded: isCorrect ? question.points : 0,
                isCorrect
            };
        }
        
        case 'multiple_choice_multiple': {
            // Multiple correct answers - must select all and only correct ones
            const correctIndices = question.options
                .map((opt, idx) => opt.isCorrect ? idx : -1)
                .filter(idx => idx !== -1)
                .sort((a, b) => a - b);
            
            const selectedIndices = answer.selectedOptions
                .map(opt => typeof opt === 'number' ? opt : parseInt(opt))
                .filter(idx => !isNaN(idx))
                .sort((a, b) => a - b);
            
            const isCorrect = 
                correctIndices.length === selectedIndices.length &&
                correctIndices.every((idx, i) => idx === selectedIndices[i]);
            
            return {
                pointsAwarded: isCorrect ? question.points : 0,
                isCorrect
            };
        }
        
        case 'true_false': {
            // True/False - answer is ['true'] or ['false']
            const selectedValue = answer.selectedOptions[0];
            const correctOption = question.options.find(opt => opt.isCorrect);
            const correctValue = correctOption?.text?.toLowerCase() === 'true' ? 'true' : 'false';
            
            const isCorrect = selectedValue === correctValue;
            return {
                pointsAwarded: isCorrect ? question.points : 0,
                isCorrect
            };
        }
        
        case 'short_text': {
            // Manual grading required - return 0 points for now
            return {
                pointsAwarded: 0,
                isCorrect: false
            };
        }
        
        default:
            return {
                pointsAwarded: 0,
                isCorrect: false
            };
    }
}

/**
 * Calculate quiz statistics for instructor
 */
export async function calculateQuizStatistics(quizId) {
    await dbConnect();
    
    try {
        const { QuizAttempt } = await import("@/model/quiz-attempt-model");
        const { Quiz } = await import("@/model/quiz-model");
        
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        
        const attempts = await QuizAttempt.find({
            quiz: new mongoose.Types.ObjectId(quizId),
            status: { $in: ['submitted', 'timeout'] }
        }).lean();
        
        if (attempts.length === 0) {
            return {
                totalAttempts: 0,
                averageScore: 0,
                passRate: 0,
                averageTimeSpent: 0,
                questionStats: []
            };
        }
        
        const totalAttempts = attempts.length;
        const totalScore = attempts.reduce((sum, attempt) => sum + attempt.percentage, 0);
        const averageScore = Math.round(totalScore / totalAttempts);
        
        const passedAttempts = attempts.filter(a => a.passed).length;
        const passRate = Math.round((passedAttempts / totalAttempts) * 100);
        
        const totalTime = attempts.reduce((sum, attempt) => sum + (attempt.timeSpentSeconds || 0), 0);
        const averageTimeSpent = Math.round(totalTime / totalAttempts);
        
        // Question-level statistics
        const questionStats = await calculateQuestionStatistics(quizId, attempts);
        
        return {
            totalAttempts,
            averageScore,
            passRate,
            averageTimeSpent,
            questionStats
        };
    } catch (error) {
        console.error('[QUIZ_STATS] Error:', error);
        throw new Error(`Failed to calculate statistics: ${error.message}`);
    }
}

/**
 * Calculate statistics per question
 */
async function calculateQuestionStatistics(quizId, attempts) {
    const { Question } = await import("@/model/question-model");
    
    const questions = await Question.find({ quiz: new mongoose.Types.ObjectId(quizId) })
        .sort({ order: 1 })
        .lean();
    
    const stats = questions.map(question => {
        let correctCount = 0;
        let totalAnswers = 0;
        
        for (const attempt of attempts) {
            const answer = attempt.answers.find(a => 
                a.question?.toString() === question._id.toString()
            );
            
            if (answer) {
                totalAnswers++;
                if (answer.isCorrect) {
                    correctCount++;
                }
            }
        }
        
        const correctnessRate = totalAnswers > 0 
            ? Math.round((correctCount / totalAnswers) * 100) 
            : 0;
        
        return {
            questionId: question._id.toString(),
            questionText: question.questionText,
            correctCount,
            totalAnswers,
            correctnessRate
        };
    });
    
    return stats;
}

