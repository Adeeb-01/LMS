"use server";

import { getLoggedInUser } from "@/lib/loggedin-user";
import { dbConnect } from "@/service/mongo";
import { Quiz } from "@/model/quiz-model";
import { Question } from "@/model/question-model";
import { QuizAttempt } from "@/model/quiz-attempt-model";
import { gradeQuizAttempt } from "@/lib/quiz-grading";
import { getQuizById, canStudentTakeQuiz, getInProgressAttempt } from "@/queries/quizzes";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import mongoose from "mongoose";

/**
 * Create a new quiz (Instructor only)
 */
export async function createQuiz(data) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await dbConnect();
        
        const {
            title,
            description,
            courseId,
            lessonId,
            durationMinutes,
            passScore = 70,
            attemptsAllowed,
            isRequired = false,
            shuffleQuestions = false,
            shuffleAnswers = false,
            showCorrectAnswers = 'after_pass',
            published = false
        } = data;
        
        if (!title || !courseId) {
            throw new Error('Title and course ID are required');
        }
        
        const quiz = await Quiz.create({
            title,
            description: description || '',
            course: new mongoose.Types.ObjectId(courseId),
            lesson: lessonId ? new mongoose.Types.ObjectId(lessonId) : null,
            durationMinutes: durationMinutes || null,
            passScore,
            attemptsAllowed: attemptsAllowed || null,
            isRequired,
            shuffleQuestions,
            shuffleAnswers,
            showCorrectAnswers,
            published,
            instructor: new mongoose.Types.ObjectId(user.id)
        });
        
        return { ok: true, quizId: quiz._id.toString() };
    } catch (error) {
        console.error('[CREATE_QUIZ] Error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Update quiz (Instructor only)
 */
export async function updateQuiz(quizId, data) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await dbConnect();
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        
        if (quiz.instructor.toString() !== user.id) {
            throw new Error('Unauthorized: You do not own this quiz');
        }
        
        const updateData = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes || null;
        if (data.passScore !== undefined) updateData.passScore = data.passScore;
        if (data.attemptsAllowed !== undefined) updateData.attemptsAllowed = data.attemptsAllowed || null;
        if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
        if (data.shuffleQuestions !== undefined) updateData.shuffleQuestions = data.shuffleQuestions;
        if (data.shuffleAnswers !== undefined) updateData.shuffleAnswers = data.shuffleAnswers;
        if (data.showCorrectAnswers !== undefined) updateData.showCorrectAnswers = data.showCorrectAnswers;
        if (data.published !== undefined) updateData.published = data.published;
        
        await Quiz.findByIdAndUpdate(quizId, updateData);
        
        return { ok: true };
    } catch (error) {
        console.error('[UPDATE_QUIZ] Error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Delete quiz (Instructor only)
 */
export async function deleteQuiz(quizId) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await dbConnect();
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        
        if (quiz.instructor.toString() !== user.id) {
            throw new Error('Unauthorized: You do not own this quiz');
        }
        
        // Delete questions
        await Question.deleteMany({ quiz: new mongoose.Types.ObjectId(quizId) });
        
        // Delete attempts
        await QuizAttempt.deleteMany({ quiz: new mongoose.Types.ObjectId(quizId) });
        
        // Delete quiz
        await Quiz.findByIdAndDelete(quizId);
        
        return { ok: true };
    } catch (error) {
        console.error('[DELETE_QUIZ] Error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Add question to quiz (Instructor only)
 */
export async function addQuestion(quizId, questionData) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await dbConnect();
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        
        if (quiz.instructor.toString() !== user.id) {
            throw new Error('Unauthorized: You do not own this quiz');
        }
        
        const {
            questionText,
            questionType,
            points = 1,
            options = [],
            explanation = '',
            order
        } = questionData;
        
        if (!questionText || !questionType) {
            throw new Error('Question text and type are required');
        }
        
        // Auto-generate options for true/false if not provided
        let finalOptions = options;
        if (questionType === 'true_false' && options.length === 0) {
            finalOptions = [
                { text: 'True', isCorrect: true, order: 0 },
                { text: 'False', isCorrect: false, order: 1 }
            ];
        }
        
        // Determine order
        let questionOrder = order;
        if (questionOrder === undefined) {
            const maxOrder = await Question.findOne({ quiz: new mongoose.Types.ObjectId(quizId) })
                .sort({ order: -1 })
                .lean();
            questionOrder = maxOrder ? maxOrder.order + 1 : 0;
        }
        
        const question = await Question.create({
            quiz: new mongoose.Types.ObjectId(quizId),
            questionText,
            questionType,
            points,
            options: finalOptions,
            explanation,
            order: questionOrder
        });
        
        return { ok: true, questionId: question._id.toString() };
    } catch (error) {
        console.error('[ADD_QUESTION] Error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Update question (Instructor only)
 */
export async function updateQuestion(questionId, questionData) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await dbConnect();
        
        const question = await Question.findById(questionId).populate('quiz');
        if (!question) {
            throw new Error('Question not found');
        }
        
        if (question.quiz.instructor.toString() !== user.id) {
            throw new Error('Unauthorized: You do not own this quiz');
        }
        
        const updateData = {};
        if (questionData.questionText !== undefined) updateData.questionText = questionData.questionText;
        if (questionData.questionType !== undefined) updateData.questionType = questionData.questionType;
        if (questionData.points !== undefined) updateData.points = questionData.points;
        if (questionData.options !== undefined) updateData.options = questionData.options;
        if (questionData.explanation !== undefined) updateData.explanation = questionData.explanation;
        if (questionData.order !== undefined) updateData.order = questionData.order;
        
        await Question.findByIdAndUpdate(questionId, updateData);
        
        return { ok: true };
    } catch (error) {
        console.error('[UPDATE_QUESTION] Error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Delete question (Instructor only)
 */
export async function deleteQuestion(questionId) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await dbConnect();
        
        const question = await Question.findById(questionId).populate('quiz');
        if (!question) {
            throw new Error('Question not found');
        }
        
        if (question.quiz.instructor.toString() !== user.id) {
            throw new Error('Unauthorized: You do not own this quiz');
        }
        
        await Question.findByIdAndDelete(questionId);
        
        return { ok: true };
    } catch (error) {
        console.error('[DELETE_QUESTION] Error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Start quiz attempt (Student)
 */
export async function startQuizAttempt(quizId) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await dbConnect();
        
        // Check if student can take quiz
        const accessCheck = await canStudentTakeQuiz(quizId, user.id);
        if (!accessCheck.allowed) {
            throw new Error(accessCheck.reason || 'Cannot take this quiz');
        }
        
        // Get quiz
        const quiz = await getQuizById(quizId, true);
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        
        // Check enrollment
        const isEnrolled = await hasEnrollmentForCourse(quiz.course.id, user.id);
        if (!isEnrolled) {
            throw new Error('You must be enrolled in this course to take the quiz');
        }
        
        // Check for existing in-progress attempt
        const existingAttempt = await getInProgressAttempt(quizId, user.id);
        if (existingAttempt) {
            return { ok: true, attemptId: existingAttempt.id, resumed: true };
        }
        
        // Get questions
        const questions = quiz.questions || [];
        if (questions.length === 0) {
            throw new Error('Quiz has no questions');
        }
        
        // Shuffle if needed
        let finalQuestions = [...questions];
        if (quiz.shuffleQuestions) {
            finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
        }
        
        // Create attempt
        const attempt = await QuizAttempt.create({
            quiz: new mongoose.Types.ObjectId(quizId),
            student: new mongoose.Types.ObjectId(user.id),
            course: new mongoose.Types.ObjectId(quiz.course.id),
            lesson: quiz.lesson?.id ? new mongoose.Types.ObjectId(quiz.lesson.id) : null,
            status: 'in_progress',
            answers: finalQuestions.map(q => ({
                question: new mongoose.Types.ObjectId(q.id),
                selectedOptions: [],
                pointsAwarded: 0,
                isCorrect: false,
                graded: false
            })),
            maxPoints: finalQuestions.reduce((sum, q) => sum + (q.points || 1), 0)
        });
        
        return { 
            ok: true, 
            attemptId: attempt._id.toString(),
            quiz: {
                ...quiz,
                questions: finalQuestions.map(q => {
                    // Shuffle answers if needed
                    let options = [...q.options];
                    if (quiz.shuffleAnswers && (q.questionType === 'multiple_choice_single' || q.questionType === 'multiple_choice_multiple')) {
                        options = options.sort(() => Math.random() - 0.5);
                    }
                    return { ...q, options };
                })
            }
        };
    } catch (error) {
        console.error('[START_QUIZ] Error:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Submit quiz attempt (Student)
 */
export async function submitQuizAttempt(attemptId, answers) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await dbConnect();
        
        const attempt = await QuizAttempt.findById(attemptId);
        if (!attempt) {
            throw new Error('Attempt not found');
        }
        
        if (attempt.student.toString() !== user.id) {
            throw new Error('Unauthorized: This is not your attempt');
        }
        
        if (attempt.status !== 'in_progress') {
            throw new Error('This attempt has already been submitted');
        }
        
        // Get quiz
        const quiz = await getQuizById(attempt.quiz.toString(), false);
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        
        // Grade the attempt
        const grading = await gradeQuizAttempt(quiz, answers, quiz.passScore);
        
        // Calculate time spent
        const timeSpentSeconds = Math.floor((new Date() - attempt.startedAt) / 1000);
        
        // Update attempt
        attempt.answers = grading.answers;
        attempt.totalPoints = grading.totalPoints;
        attempt.percentage = grading.percentage;
        attempt.passed = grading.passed;
        attempt.status = 'submitted';
        attempt.submittedAt = new Date();
        attempt.timeSpentSeconds = timeSpentSeconds;
        
        await attempt.save();
        
        return {
            ok: true,
            attempt: {
                id: attempt._id.toString(),
                totalPoints: grading.totalPoints,
                maxPoints: grading.maxPoints,
                percentage: grading.percentage,
                passed: grading.passed,
                timeSpentSeconds
            }
        };
    } catch (error) {
        console.error('[SUBMIT_QUIZ] Error:', error);
        return { ok: false, error: error.message };
    }
}

