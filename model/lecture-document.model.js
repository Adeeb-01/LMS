import mongoose, { Schema } from "mongoose";

const extractedTextSchema = new Schema({
  fullText: { type: String, required: true },
  wordCount: { type: Number, required: true },
  structuredContent: [{
    type: { type: String, enum: ['paragraph', 'heading', 'list', 'table'], required: true },
    level: { type: Number, default: 0 },
    content: { type: String, required: true },
    style: {
      bold: { type: Boolean, default: false },
      italic: { type: Boolean, default: false }
    }
  }],
  extractedAt: { type: Date, required: true },
  extractionDurationMs: { type: Number, required: true }
}, { _id: false });

const lectureDocumentSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, unique: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  originalFilename: { type: String, required: true, maxlength: 255 },
  fileSize: { type: Number, required: true, max: 52428800 }, // 50 MB
  mimeType: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['uploading', 'processing', 'ready', 'failed'], 
    default: 'uploading',
    index: true 
  },
  errorMessage: { type: String },
  extractedText: extractedTextSchema,
  videoTranscriptId: {
    type: Schema.Types.ObjectId,
    ref: 'VideoTranscript',
    required: false
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  embeddingStatus: {
    type: String,
    enum: ['pending', 'processing', 'indexed', 'failed'],
    default: null
  },
  embeddingJobId: {
    type: Schema.Types.ObjectId,
    ref: 'IndexingJob',
    required: false
  },
  chunksIndexed: {
    type: Number,
    default: 0
  },
  lastIndexedAt: {
    type: Date,
    required: false
  }
}, { timestamps: true });

export const LectureDocument = mongoose.models.LectureDocument ?? mongoose.model("LectureDocument", lectureDocumentSchema);
