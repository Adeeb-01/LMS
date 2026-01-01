import mongoose, { Schema } from "mongoose";

/**
 * Quiz Attempt Model
 * Tracks every attempt a student makes on a quiz
 */
const quizAttemptSchema = new Schema({
    // Association
    quiz: {
        type: Schema.Types.ObjectId,
        ref: "QuizNew",
        required: true,
        index: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true
    },
    lesson: {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
        required: false,
        index: true,
        sparse: true
    },
    
    // Answers - array of question responses
    answers: [{
        question: {
            type: Schema.Types.ObjectId,
            ref: "Question",
            required: true
        },
        // For multiple_choice_single: array with one option index
        // For multiple_choice_multiple: array with multiple option indices
        // For true_false: ['true'] or ['false']
        // For short_text: array with text answer (manual grading)
        selectedOptions: [{
            type: Schema.Types.Mixed // Can be number (index) or string (text answer)
        }],
        // Grading
        pointsAwarded: {
            type: Number,
            default: 0
        },
        isCorrect: {
            type: Boolean,
            default: false
        },
        graded: {
            type: Boolean,
            default: false // false for auto-graded, true when manually graded
        }
    }],
    
    // Scores
    totalPoints: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    maxPoints: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    percentage: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 100
    },
    passed: {
        type: Boolean,
        required: true,
        default: false,
        index: true
    },
    
    // Timing
    startedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    submittedAt: {
        type: Date,
        required: false
    },
    timeSpentSeconds: {
        type: Number,
        default: 0
    },
    
    // Status
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'timeout', 'abandoned'],
        default: 'in_progress',
        index: true
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound indexes
quizAttemptSchema.index({ quiz: 1, student: 1, createdAt: -1 }); // Student's attempts for a quiz
quizAttemptSchema.index({ student: 1, course: 1, status: 1 }); // Student's attempts in a course
quizAttemptSchema.index({ quiz: 1, status: 1, submittedAt: -1 }); // Quiz statistics
quizAttemptSchema.index({ student: 1, passed: 1 }); // Passed attempts

// Update updatedAt on save
quizAttemptSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export const QuizAttempt = mongoose.models.QuizAttempt ?? mongoose.model("QuizAttempt", quizAttemptSchema);

