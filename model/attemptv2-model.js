import mongoose, { Schema } from "mongoose";

const answerSchema = new Schema({
    questionId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    selectedOptionIds: {
        type: [String],
        default: []
    },
    audioUrl: {
        type: String,
        default: null
    },
    skippedDueToMic: {
        type: Boolean,
        default: false
    },
    transcribedText: {
        type: String,
        default: ""
    },
    score: {
        type: Number,
        default: 0
    },
    gradingStatus: {
        type: String,
        enum: ["pending", "evaluating", "completed", "failed"],
        default: null
    },
    selectionMetrics: {
        fisherInformation: { type: Number },
        thetaAtSelection: { type: Number },
        candidateCount: { type: Number },
        selectionReason: { type: String } // "max_info" | "content_balance" | "fallback"
    }
}); // Removed { _id: false } to allow polling by answer ID

const attemptSchema = new Schema({
    quizId: {
        type: Schema.Types.ObjectId,
        ref: "Quiz",
        required: true,
        index: true
    },
    studentId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ["in_progress", "submitted", "expired"],
        default: "in_progress",
        index: true
    },
    startedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    expiresAt: {
        type: Date,
        default: null
    },
    submittedAt: {
        type: Date,
        default: null
    },
    answers: {
        type: [answerSchema],
        default: []
    },
    score: {
        type: Number,
        default: 0
    },
    scorePercent: {
        type: Number,
        default: 0
    },
    passed: {
        type: Boolean,
        default: false
    },
    adaptive: {
        enabled: { type: Boolean, default: false },
        currentTheta: { type: Number, default: 0.0 },
        currentSE: { type: Number, default: null },
        thetaHistory: [{
            questionIndex: { type: Number },
            questionId: { type: Schema.Types.ObjectId, ref: "Question" },
            theta: { type: Number },
            se: { type: Number },
            timestamp: { type: Date, default: Date.now }
        }],
        terminationReason: {
            type: String,
            enum: ["precision_achieved", "max_reached", "pool_exhausted", "user_submitted", null],
            default: null
        },
        questionOrder: [{ type: Schema.Types.ObjectId, ref: "Question" }],
        activeDeviceId: { type: String, default: null }
    },
    bat: {
        enabled: { type: Boolean, default: false },
        currentTheta: { type: Number, default: 0.0 },
        currentSE: { type: Number, default: 1.0 },
        currentBlockIndex: { type: Number, default: 0 },
        blocks: [{
            index: { type: Number, required: true },
            difficultyBand: { 
                type: String, 
                enum: ['easy', 'medium', 'hard'],
                required: true 
            },
            questionIds: [{ 
                type: Schema.Types.ObjectId, 
                ref: 'Question' 
            }],
            answers: [{
                questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
                selectedOptionIds: [String],
                correct: { type: Boolean, default: false },
                answeredAt: { type: Date, default: Date.now }
            }],
            submitted: { type: Boolean, default: false },
            submittedAt: { type: Date, default: null },
            thetaAfterBlock: { type: Number, default: null },
            seAfterBlock: { type: Number, default: null }
        }],
        thetaHistory: [{
            blockIndex: { type: Number },
            theta: { type: Number },
            se: { type: Number },
            timestamp: { type: Date, default: Date.now }
        }],
        terminationReason: {
            type: String,
            enum: ['blocks_completed', 'user_abandoned', null],
            default: null
        },
        missedConceptTags: [{
            type: String
        }],
        activeSessionId: { type: String, default: null }
    }
}, {
    timestamps: true
});

// Indexes
attemptSchema.index({ quizId: 1, studentId: 1, submittedAt: -1 });
attemptSchema.index({ studentId: 1, submittedAt: -1 });
// Add sparse index for concurrent session lookup
attemptSchema.index(
    { quizId: 1, studentId: 1, "adaptive.activeDeviceId": 1 },
    { sparse: true }
);
attemptSchema.index(
    { quizId: 1, studentId: 1, "bat.activeSessionId": 1 },
    { sparse: true }
);
// Partial unique index for one in-progress attempt per (quizId, studentId)
attemptSchema.index(
    { quizId: 1, studentId: 1 },
    { 
        unique: true,
        partialFilterExpression: { status: "in_progress" }
    }
);

export const Attempt = mongoose.models.Attempt || mongoose.model("Attempt", attemptSchema);
