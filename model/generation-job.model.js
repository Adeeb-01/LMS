import mongoose, { Schema } from "mongoose";

const chunkErrorSchema = new Schema({
  chunkId: { type: String, required: true },
  error: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const generationJobSchema = new Schema({
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
  quizId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Quiz', 
    required: true 
  },
  lectureDocumentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'LectureDocument', 
    required: true 
  },
  triggeredBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  pipelineJobId: {
    type: Schema.Types.ObjectId,
    ref: 'PipelineJob'
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  chunksTotal: { type: Number, default: 0 },
  chunksProcessed: { type: Number, default: 0 },
  questionsGenerated: { type: Number, default: 0 },
  questionsFlagged: { type: Number, default: 0 },
  chunkErrors: { type: [chunkErrorSchema], default: [] },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date }
}, { 
  timestamps: true,
  collection: 'generationjobs'
});

// Compound indexes
generationJobSchema.index({ status: 1, createdAt: 1 });
generationJobSchema.index({ courseId: 1, status: 1 });

export const GenerationJob = mongoose.models.GenerationJob ?? 
  mongoose.model("GenerationJob", generationJobSchema);
