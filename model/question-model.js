import mongoose, { Schema } from "mongoose";

/**
 * Question Model
 * Supports multiple question types
 */
const questionSchema = new Schema({
    // Association
    quiz: {
        type: Schema.Types.ObjectId,
        ref: "QuizNew",
        required: true,
        index: true
    },
    
    // Question Content
    questionText: {
        type: String,
        required: true,
        trim: true
    },
    questionType: {
        type: String,
        enum: ['multiple_choice_single', 'multiple_choice_multiple', 'true_false', 'short_text'],
        required: true,
        default: 'multiple_choice_single'
    },
    
    // Points
    points: {
        type: Number,
        required: true,
        default: 1,
        min: 0
    },
    
    // Options (for multiple choice and true/false)
    options: [{
        text: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            default: false
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    
    // For true/false questions, automatically generate options if not provided
    // For short_text, no options needed
    
    // Explanation shown after submission
    explanation: {
        type: String,
        default: ""
    },
    
    // Order within quiz
    order: {
        type: Number,
        required: true,
        default: 0
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

// Indexes
questionSchema.index({ quiz: 1, order: 1 }); // Get questions in order

// Update updatedAt on save
questionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export const Question = mongoose.models.Question ?? mongoose.model("Question", questionSchema);

