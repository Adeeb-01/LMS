import mongoose, { Schema } from "mongoose";

/**
 * Modern Quiz Model
 * Supports both course-level and lesson-level quizzes
 */
const quizSchema = new Schema({
    // Basic Information
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        default: ""
    },
    
    // Association
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true
    },
    lesson: {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
        required: false, // Optional - if null, it's a course-level quiz
        index: true,
        sparse: true
    },
    
    // Quiz Settings
    durationMinutes: {
        type: Number,
        required: false, // Optional - null means no time limit
        min: 1
    },
    passScore: {
        type: Number,
        required: true,
        default: 70, // Percentage (0-100)
        min: 0,
        max: 100
    },
    attemptsAllowed: {
        type: Number,
        required: false, // null means unlimited
        min: 1
    },
    isRequired: {
        type: Boolean,
        required: true,
        default: false,
        index: true
    },
    
    // Question Settings
    shuffleQuestions: {
        type: Boolean,
        default: false
    },
    shuffleAnswers: {
        type: Boolean,
        default: false
    },
    
    // Answer Visibility Settings
    showCorrectAnswers: {
        type: String,
        enum: ['after_submit', 'after_pass', 'never'],
        default: 'after_pass'
    },
    
    // Status
    published: {
        type: Boolean,
        required: true,
        default: false,
        index: true
    },
    
    // Metadata
    instructor: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
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

// Compound indexes for efficient queries
quizSchema.index({ course: 1, lesson: 1 }); // Find quizzes for a course/lesson
quizSchema.index({ course: 1, published: 1, isRequired: 1 }); // Find published required quizzes
quizSchema.index({ lesson: 1, published: 1 }); // Find published lesson quizzes
quizSchema.index({ instructor: 1, published: 1 }); // Instructor's quizzes

// Update updatedAt on save
quizSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export const Quiz = mongoose.models.QuizNew ?? mongoose.model("QuizNew", quizSchema);

