import mongoose, { Schema } from "mongoose";

const chunkErrorSchema = new Schema({
  chunkId: { type: String, required: true },
  error: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const oralGenerationJobSchema = new Schema({
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
  pipelineJobId: {
    type: Schema.Types.ObjectId,
    ref: 'PipelineJob'
  },
  triggeredBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  
  // Progress tracking
  chunksTotal: { type: Number, default: 0 },
  chunksProcessed: { type: Number, default: 0 },
  chunksSkipped: { type: Number, default: 0 },
  questionsGenerated: { type: Number, default: 0 },
  questionsFlagged: { type: Number, default: 0 }, // Potential duplicates
  
  // Error tracking
  chunkErrors: [chunkErrorSchema],
  errorMessage: String,
  retryCount: { type: Number, default: 0 },
  
  startedAt: Date,
  completedAt: Date
}, { 
  timestamps: true,
  collection: 'oralgenerationjobs'
});

// Indexes
oralGenerationJobSchema.index({ status: 1, createdAt: 1 });
oralGenerationJobSchema.index({ pipelineJobId: 1 });

export const OralGenerationJob = mongoose.models.OralGenerationJob || mongoose.model("OralGenerationJob", oralGenerationJobSchema);
