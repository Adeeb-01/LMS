import mongoose, { Schema } from "mongoose";

const pipelineJobSchema = new Schema({
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
  triggeredBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Overall pipeline status
  status: { 
    type: String, 
    enum: ['pending', 'extracting', 'aligning', 'indexing', 'generating', 'completed', 'failed', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  
  // References to child jobs
  extractionJobId: { type: Schema.Types.ObjectId, ref: 'LectureDocument' },
  alignmentJobId: { type: Schema.Types.ObjectId, ref: 'AlignmentJob' },
  indexingJobId: { type: Schema.Types.ObjectId, ref: 'IndexingJob' },
  mcqGenerationJobId: { type: Schema.Types.ObjectId, ref: 'GenerationJob' },
  oralGenerationJobId: { type: Schema.Types.ObjectId, ref: 'OralGenerationJob' },
  
  // Stage statuses for dashboard display
  stages: {
    extraction: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String
    },
    alignment: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String,
      confidence: Number // Average alignment confidence
    },
    indexing: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String,
      chunksIndexed: Number
    },
    mcqGeneration: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String,
      questionsGenerated: Number,
      questionsFlagged: Number
    },
    oralGeneration: { 
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      errorMessage: String,
      questionsGenerated: Number,
      questionsFlagged: Number
    }
  },
  
  // Summary statistics
  summary: {
    totalChunks: Number,
    mcqsGenerated: Number,
    oralQuestionsGenerated: Number,
    averageAlignmentConfidence: Number,
    processingTimeMs: Number
  },
  
  // Notification tracking
  notificationSent: { type: Boolean, default: false },
  
  startedAt: Date,
  completedAt: Date
}, { 
  timestamps: true,
  collection: 'pipelinejobs'
});

// Indexes
pipelineJobSchema.index({ status: 1, createdAt: 1 });
pipelineJobSchema.index({ lessonId: 1, status: 1 });
pipelineJobSchema.index({ courseId: 1, createdAt: -1 });

export const PipelineJob = mongoose.models.PipelineJob || mongoose.model("PipelineJob", pipelineJobSchema);
