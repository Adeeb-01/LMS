import mongoose, { Schema } from "mongoose";

const conceptGapSchema = new Schema({
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
  concept: {
    type: String,
    required: true,
    maxlength: 500
  },
  source: {
    type: String,
    enum: ['assessment', 'recite_back'],
    required: true
  },
  sourceId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  failureCount: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  flaggedForReview: {
    type: Boolean,
    default: true
  },
  resolvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for user's gaps in a lesson
conceptGapSchema.index({ userId: 1, lessonId: 1 });
// Index for unresolved gaps in a course
conceptGapSchema.index({ userId: 1, courseId: 1, flaggedForReview: 1 });
// Text index for searching concepts
conceptGapSchema.index({ concept: "text" });

export const ConceptGap = mongoose.models.ConceptGap ?? mongoose.model("ConceptGap", conceptGapSchema);
