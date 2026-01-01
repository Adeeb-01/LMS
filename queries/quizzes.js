import { dbConnect } from "@/service/mongo";
import { Quiz } from "@/model/quiz-model";
import { Question } from "@/model/question-model";
import { QuizAttempt } from "@/model/quiz-attempt-model";
import { Quizset } from "@/model/quizset-model";
import { Quiz as OldQuiz } from "@/model/quizzes-model"; // Old Quiz model
import { replaceMongoIdInObject, replaceMongoIdInArray } from "@/lib/convertData";
import mongoose from "mongoose";

/**
 * Get quiz by ID with questions
 */
export async function getQuizById(quizId, includeQuestions = true) {
    await dbConnect();
    try {
        const quiz = await Quiz.findById(quizId)
            .populate('course', 'title')
            .populate('lesson', 'title slug')
            .populate('instructor', 'firstName lastName email')
            .lean();
        
        if (!quiz) return null;
        
        const quizObj = replaceMongoIdInObject(quiz);
        
        if (includeQuestions) {
            const questions = await Question.find({ quiz: quizId })
                .sort({ order: 1 })
                .lean();
            quizObj.questions = replaceMongoIdInArray(questions);
        }
        
        return quizObj;
    } catch (error) {
        throw new Error(`Failed to get quiz: ${error.message}`);
    }
}

/**
 * Get quizzes for a course
 */
export async function getQuizzesForCourse(courseId, options = {}) {
    await dbConnect();
    try {
        const { published, lessonId, includeQuestions = false } = options;
        
        const query = { course: new mongoose.Types.ObjectId(courseId) };
        if (published !== undefined) query.published = published;
        if (lessonId) {
            query.lesson = new mongoose.Types.ObjectId(lessonId);
        } else {
            query.lesson = null; // Course-level quizzes only
        }
        
        const quizzes = await Quiz.find(query)
            .sort({ createdAt: -1 })
            .populate('lesson', 'title slug')
            .lean();
        
        const quizzesArray = replaceMongoIdInArray(quizzes);
        
        if (includeQuestions) {
            for (const quiz of quizzesArray) {
                const questions = await Question.find({ quiz: quiz.id })
                    .sort({ order: 1 })
                    .lean();
                quiz.questions = replaceMongoIdInArray(questions);
            }
        }
        
        return quizzesArray;
    } catch (error) {
        throw new Error(`Failed to get quizzes: ${error.message}`);
    }
}

/**
 * Get quizzes for a lesson
 */
export async function getQuizzesForLesson(lessonId, options = {}) {
    await dbConnect();
    try {
        const { published, includeQuestions = false } = options;
        
        const query = { lesson: new mongoose.Types.ObjectId(lessonId) };
        if (published !== undefined) query.published = published;
        
        const quizzes = await Quiz.find(query)
            .sort({ createdAt: -1 })
            .lean();
        
        const quizzesArray = replaceMongoIdInArray(quizzes);
        
        if (includeQuestions) {
            for (const quiz of quizzesArray) {
                const questions = await Question.find({ quiz: quiz.id })
                    .sort({ order: 1 })
                    .lean();
                quiz.questions = replaceMongoIdInArray(questions);
            }
        }
        
        return quizzesArray;
    } catch (error) {
        throw new Error(`Failed to get lesson quizzes: ${error.message}`);
    }
}

/**
 * Get quizzes for instructor
 */
export async function getQuizzesForInstructor(instructorId, options = {}) {
    await dbConnect();
    try {
        const { published, courseId, includeQuestions = false } = options;
        
        const query = { instructor: new mongoose.Types.ObjectId(instructorId) };
        if (published !== undefined) query.published = published;
        if (courseId) query.course = new mongoose.Types.ObjectId(courseId);
        
        const quizzes = await Quiz.find(query)
            .populate('course', 'title')
            .populate('lesson', 'title slug')
            .sort({ createdAt: -1 })
            .lean();
        
        const quizzesArray = replaceMongoIdInArray(quizzes);
        
        if (includeQuestions) {
            for (const quiz of quizzesArray) {
                const questions = await Question.find({ quiz: quiz.id })
                    .sort({ order: 1 })
                    .lean();
                quiz.questions = replaceMongoIdInArray(questions);
            }
        }
        
        return quizzesArray;
    } catch (error) {
        throw new Error(`Failed to get instructor quizzes: ${error.message}`);
    }
}

/**
 * Get quiz attempt by ID
 */
export async function getQuizAttemptById(attemptId) {
    await dbConnect();
    try {
        const attempt = await QuizAttempt.findById(attemptId)
            .populate('quiz')
            .populate('student', 'firstName lastName email')
            .populate('course', 'title')
            .populate('lesson', 'title slug')
            .populate('answers.question')
            .lean();
        
        return attempt ? replaceMongoIdInObject(attempt) : null;
    } catch (error) {
        throw new Error(`Failed to get quiz attempt: ${error.message}`);
    }
}

/**
 * Get student's attempts for a quiz
 */
export async function getStudentQuizAttempts(quizId, studentId) {
    await dbConnect();
    try {
        const attempts = await QuizAttempt.find({
            quiz: new mongoose.Types.ObjectId(quizId),
            student: new mongoose.Types.ObjectId(studentId)
        })
            .sort({ createdAt: -1 })
            .populate('quiz', 'title passScore')
            .lean();
        
        return replaceMongoIdInArray(attempts);
    } catch (error) {
        throw new Error(`Failed to get student attempts: ${error.message}`);
    }
}

/**
 * Get all attempts for a quiz (for instructor analytics)
 */
export async function getQuizAttempts(quizId, options = {}) {
    await dbConnect();
    try {
        const { status, passed, limit = 100 } = options;
        
        const query = { quiz: new mongoose.Types.ObjectId(quizId) };
        if (status) query.status = status;
        if (passed !== undefined) query.passed = passed;
        
        const attempts = await QuizAttempt.find(query)
            .populate('student', 'firstName lastName email')
            .sort({ submittedAt: -1, createdAt: -1 })
            .limit(limit)
            .lean();
        
        return replaceMongoIdInArray(attempts);
    } catch (error) {
        throw new Error(`Failed to get quiz attempts: ${error.message}`);
    }
}

/**
 * Get student's in-progress attempt
 */
export async function getInProgressAttempt(quizId, studentId) {
    await dbConnect();
    try {
        const attempt = await QuizAttempt.findOne({
            quiz: new mongoose.Types.ObjectId(quizId),
            student: new mongoose.Types.ObjectId(studentId),
            status: 'in_progress'
        })
            .populate('quiz')
            .populate('answers.question')
            .lean();
        
        return attempt ? replaceMongoIdInObject(attempt) : null;
    } catch (error) {
        throw new Error(`Failed to get in-progress attempt: ${error.message}`);
    }
}

/**
 * Check if student can take quiz (enrolled, published, attempts remaining)
 */
export async function canStudentTakeQuiz(quizId, studentId) {
    await dbConnect();
    try {
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz || !quiz.published) {
            return { allowed: false, reason: 'Quiz not available' };
        }
        
        // Check attempts limit
        if (quiz.attemptsAllowed) {
            const attemptCount = await QuizAttempt.countDocuments({
                quiz: new mongoose.Types.ObjectId(quizId),
                student: new mongoose.Types.ObjectId(studentId),
                status: { $in: ['submitted', 'timeout'] }
            });
            
            if (attemptCount >= quiz.attemptsAllowed) {
                return { allowed: false, reason: 'Maximum attempts reached' };
            }
        }
        
        return { allowed: true };
    } catch (error) {
        throw new Error(`Failed to check quiz access: ${error.message}`);
    }
}

// ============================================================================
// OLD QUIZ SYSTEM FUNCTIONS (Backward Compatibility)
// These functions support the legacy Quizset/Quiz system
// ============================================================================

/**
 * Create a quiz (Old Quiz model - for backward compatibility)
 * Used by the old quiz system (Quizset)
 */
export async function createQuiz(quizData) {
    await dbConnect();
    try {
        const quiz = await OldQuiz.create(quizData);
        return quiz._id.toString();
    } catch (error) {
        throw new Error(`Failed to create quiz: ${error.message}`);
    }
}

/**
 * Get quiz set by ID (Old Quizset model - for backward compatibility)
 */
export async function getQuizSetById(quizSetId) {
    await dbConnect();
    try {
        const quizSet = await Quizset.findById(quizSetId)
            .populate('quizIds')
            .lean();
        return quizSet ? replaceMongoIdInObject(quizSet) : null;
    } catch (error) {
        throw new Error(`Failed to get quiz set: ${error.message}`);
    }
}

/**
 * Get all quiz sets (Old Quizset model - for backward compatibility)
 */
export async function getAllQuizSets() {
    await dbConnect();
    try {
        const quizSets = await Quizset.find({})
            .populate('quizIds')
            .lean();
        return replaceMongoIdInArray(quizSets);
    } catch (error) {
        throw new Error(`Failed to get quiz sets: ${error.message}`);
    }
}
