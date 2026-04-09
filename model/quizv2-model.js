import mongoose, { Schema } from "mongoose";

const quizSchema = new Schema({
    courseId: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true
    },
    lessonId: {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
        default: null
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    published: {
        type: Boolean,
        default: false,
        index: true
    },
    required: {
        type: Boolean,
        default: false
    },
    passPercent: {
        type: Number,
        default: 70,
        min: 0,
        max: 100
    },
    timeLimitSec: {
        type: Number,
        default: null,
        min: 1
    },
    maxAttempts: {
        type: Number,
        default: null,
        min: 1
    },
    shuffleQuestions: {
        type: Boolean,
        default: false
    },
    shuffleOptions: {
        type: Boolean,
        default: false
    },
    showAnswersPolicy: {
        type: String,
        enum: ["never", "after_submit", "after_pass"],
        default: "after_submit"
    },
    adaptiveConfig: {
        enabled: { type: Boolean, default: false },
        precisionThreshold: { type: Number, default: 0.30, min: 0.1, max: 1.0 },
        minQuestions: { type: Number, default: 5, min: 1 },
        maxQuestions: { type: Number, default: 30, min: 5 },
        contentBalancing: {
            enabled: { type: Boolean, default: false },
            moduleWeights: [{
                moduleId: { type: Schema.Types.ObjectId, ref: "Module" },
                weight: { type: Number, min: 0, max: 1 }
            }]
        },
        initialTheta: { type: Number, default: 0.0 }
    },
    batConfig: {
        enabled: { type: Boolean, default: false },
        blockSize: { type: Number, default: 2, min: 2, max: 5 },
        totalBlocks: { type: Number, default: 5, min: 3, max: 10 },
        initialTheta: { type: Number, default: 0.0 }
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

// Indexes
quizSchema.index({ courseId: 1, published: 1 });
quizSchema.index({ lessonId: 1 });
quizSchema.index({ courseId: 1, lessonId: 1 });
quizSchema.index({ createdBy: 1 });

export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
