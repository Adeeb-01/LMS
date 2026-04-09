import mongoose, { Schema } from "mongoose";

const segmentSchema = new Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  text: { type: String, required: true }
}, { _id: false });

const wordSchema = new Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  word: { type: String, required: true }
}, { _id: false });

const textBlockTimestampSchema = new Schema({
  blockIndex: { type: Number, required: true },
  startSeconds: { type: Number, default: null },
  endSeconds: { type: Number, default: null },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  status: { 
    type: String, 
    enum: ['aligned', 'not-spoken', 'unable-to-align'], // unable-to-align: video has no audio or alignment failed
    required: true 
  },
  manuallyVerified: { type: Boolean, default: false },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date }
}, { _id: false });

const videoTranscriptSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, unique: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  language: { type: String, required: true, default: 'en' },
  duration: { type: Number, required: true },
  segments: [segmentSchema],
  words: [wordSchema],
  alignments: [textBlockTimestampSchema],
  alignmentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  errorMessage: { type: String },
  processingDurationMs: { type: Number }
}, { timestamps: true });

export const VideoTranscript = mongoose.models.VideoTranscript ?? mongoose.model("VideoTranscript", videoTranscriptSchema);
