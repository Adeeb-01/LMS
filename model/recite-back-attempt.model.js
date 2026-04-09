import mongoose, { Schema } from "mongoose";

const reciteBackAttemptSchema = new Schema({
  interactionId: {
    type: Schema.Types.ObjectId,
    ref: 'TutorInteraction',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lessonId: {
    type: Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
    index: true
  },
  originalExplanation: {
    type: String,
    required: true
  },
  recitation: {
    type: String,
    required: true
  },
  similarityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  passed: {
    type: Boolean,
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  },
  inputMethod: {
    type: String,
    enum: ['voice', 'text'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for querying attempts for an interaction
reciteBackAttemptSchema.index({ interactionId: 1, attemptNumber: 1 });
// Index for user's recite-back history in a lesson
reciteBackAttemptSchema.index({ userId: 1, lessonId: 1 });

export const ReciteBackAttempt = mongoose.models.ReciteBackAttempt ?? mongoose.model("ReciteBackAttempt", reciteBackAttemptSchema);
