import mongoose, { Schema } from "mongoose";

const retrievedChunkSchema = new Schema({
  chunkId: String,
  content: String,       // First 500 chars
  similarity: Number
}, { _id: false });

const timestampLinkSchema = new Schema({
  seconds: Number,
  label: String          // Preview text
}, { _id: false });

const tutorInteractionSchema = new Schema({
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
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  question: {
    type: String,
    required: true,
    maxlength: 1000
  },
  questionInputMethod: {
    type: String,
    enum: ['voice', 'text'],
    required: true
  },
  response: {
    type: String,
    required: true,
    maxlength: 10000
  },
  isGrounded: {
    type: Boolean,
    required: true,
    default: false
  },
  retrievedChunks: [retrievedChunkSchema],
  timestampLinks: [timestampLinkSchema],
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  reciteBackRequired: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for rate limiting and user activity feed
tutorInteractionSchema.index({ userId: 1, lessonId: 1, createdAt: -1 });
tutorInteractionSchema.index({ lessonId: 1, createdAt: -1 });

export const TutorInteraction = mongoose.models.TutorInteraction ?? mongoose.model("TutorInteraction", tutorInteractionSchema);
