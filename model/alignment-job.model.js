import mongoose, { Schema } from "mongoose";

const alignmentJobSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lectureDocumentId: { type: Schema.Types.ObjectId, ref: 'LectureDocument', required: true },
  videoTranscriptId: { type: Schema.Types.ObjectId, ref: 'VideoTranscript' },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
    index: true
  },
  phase: {
    type: String,
    enum: ['audio-extraction', 'transcription', 'alignment', 'saving'],
    default: 'audio-extraction'
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0, max: 1 },
  scheduledFor: { type: Date, required: true, default: Date.now, index: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  pipelineJobId: { type: Schema.Types.ObjectId, ref: 'PipelineJob' },
  triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Compound index for queue processing
alignmentJobSchema.index({ status: 1, scheduledFor: 1 });

export const AlignmentJob = mongoose.models.AlignmentJob ?? mongoose.model("AlignmentJob", alignmentJobSchema);
