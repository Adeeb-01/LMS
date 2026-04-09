import mongoose, { Schema } from "mongoose";

const indexingJobSchema = new Schema({
  lectureDocumentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'LectureDocument', 
    required: true,
    index: true
  },
  courseId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    index: true 
  },
  lessonId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Lesson', 
    required: true 
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
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date }
}, { 
  timestamps: true,
  collection: 'indexingjobs'
});

// Compound index for queue polling
indexingJobSchema.index({ status: 1, createdAt: 1 });

export const IndexingJob = mongoose.models.IndexingJob ?? mongoose.model("IndexingJob", indexingJobSchema);
