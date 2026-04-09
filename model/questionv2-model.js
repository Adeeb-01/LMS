import mongoose, { Schema } from "mongoose";

const optionSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    }
}, { _id: false });

const questionSchema = new Schema({
    quizId: {
        type: Schema.Types.ObjectId,
        ref: "Quiz",
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ["single", "multi", "true_false", "oral"],
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    referenceAnswer: {
        type: Schema.Types.Mixed,
        default: ""
    },
    cognitiveLevel: {
        type: String,
        enum: ['application', 'analysis', 'synthesis', 'evaluation', ''],
        default: ''
    },
    oralGenerationJobId: {
        type: Schema.Types.ObjectId,
        ref: 'OralGenerationJob',
        default: null,
        index: true
    },
    options: {
        type: [optionSchema],
        required: function() {
            return this.type !== "oral";
        },
        validate: {
            validator: function(options) {
                if (this.type === "oral") return true;
                return options.length >= 2;
            },
            message: "Question must have at least 2 options"
        }
    },
    correctOptionIds: {
        type: [String],
        required: function() {
            return this.type !== "oral";
        },
        validate: {
            validator: function(ids) {
                if (this.type === "oral") return true;
                return ids.length > 0 && ids.length <= this.options.length;
            },
            message: "Must have at least one correct option"
        }
    },
    explanation: {
        type: String,
        default: ""
    },
    points: {
        type: Number,
        default: 1,
        min: 0
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    sourceTimestamp: {
        lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" },
        lessonSlug: { type: String, default: "" },
        startSeconds: { type: Number, default: null },
        endSeconds: { type: Number, default: null }
    },
    generatedBy: {
        type: String,
        enum: ['manual', 'gemini'],
        default: 'manual'
    },
    sourceChunkId: {
        type: String,
        default: null
    },
    difficultyReasoning: {
        type: String,
        default: ''
    },
    bloomLevel: {
        type: String,
        enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', ''],
        default: ''
    },
    isDraft: {
        type: Boolean,
        default: false,
        index: true
    },
    generationJobId: {
        type: Schema.Types.ObjectId,
        ref: 'GenerationJob',
        default: null,
        index: true
    },
    duplicateOf: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        default: null
    },
    irt: {
        a: { type: Number, default: 1.0, min: 0.01 },
        b: { type: Number, default: 0.0 },
        c: { type: Number, default: 0.0, min: 0, max: 1 }
    },
    conceptTags: {
        type: [String],
        default: [],
        validate: {
            validator: function(tags) {
                return tags.every(tag => typeof tag === 'string' && tag.length > 0 && tag.length <= 100);
            },
            message: 'Concept tags must be non-empty strings under 100 characters'
        }
    }
}, {
    timestamps: true
});

// Indexes
questionSchema.index({ quizId: 1, order: 1 });
questionSchema.index({ conceptTags: 1 });

export const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);
