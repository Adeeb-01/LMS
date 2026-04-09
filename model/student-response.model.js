import mongoose, { Schema } from "mongoose";

const studentResponseSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assessmentId: {
    type: Schema.Types.ObjectId,
    ref: 'OralAssessment',
    required: true,
    index: true
  },
  lessonId: {
    type: Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
    index: true
  },
  transcription: {
    type: String,
    required: true
  },
  similarityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  conceptsCovered: {
    type: [String],
    default: []
  },
  conceptsMissing: {
    type: [String],
    default: []
  },
  passed: {
    type: Boolean,
    required: true
  },
  inputMethod: {
    type: String,
    enum: ['voice', 'text'],
    default: 'voice'
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for student analytics
studentResponseSchema.index({ userId: 1, lessonId: 1 });

export const StudentResponse = mongoose.models.StudentResponse ?? mongoose.model("StudentResponse", studentResponseSchema);
