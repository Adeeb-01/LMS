import mongoose, { Schema } from "mongoose";

const oralAssessmentSchema = new Schema({
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
  triggerTimestamp: {
    type: Number, // in seconds from start of video
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  referenceAnswer: {
    type: String,
    required: true
  },
  keyConcepts: {
    type: [String],
    default: []
  },
  passingThreshold: {
    type: Number,
    default: 0.6
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one assessment per timestamp per lesson
oralAssessmentSchema.index({ lessonId: 1, triggerTimestamp: 1 }, { unique: true });

export const OralAssessment = mongoose.models.OralAssessment ?? mongoose.model("OralAssessment", oralAssessmentSchema);
