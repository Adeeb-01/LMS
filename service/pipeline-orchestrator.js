import { dbConnect } from "@/service/mongo";
import { PipelineJob } from "@/model/pipeline-job.model";
import { Lesson } from "@/model/lesson.model";
import { LectureDocument } from "@/model/lecture-document.model";
import { queueAlignmentJob } from "@/service/alignment-queue";
import { triggerIndexing } from "@/service/embedding-queue";
import { triggerGeneration as triggerMcqGeneration } from "@/service/mcq-generation-queue";
import { triggerOralGeneration } from "@/service/oral-generation-queue";
import { Quiz } from "@/model/quizv2-model";

const MAX_CONCURRENT_PIPELINES = 5;

export class PipelineOrchestrator {
  /**
   * Starts a new pipeline for a lesson.
   * @param {string} lessonId - The lesson ID
   * @param {string} userId - The user ID who triggered it
   * @param {string} initialStage - Optional initial stage
   */
  async startPipeline(lessonId, userId, initialStage = null) {
    await dbConnect();

    // 1. Concurrency control (T034)
    const activePipelines = await PipelineJob.countDocuments({ 
      status: { $in: ['extracting', 'aligning', 'indexing', 'generating'] } 
    });
    
    if (activePipelines >= MAX_CONCURRENT_PIPELINES) {
      throw new Error('Maximum concurrent pipelines reached. Please try again later.');
    }

    // 2. Fetch lesson and course details
    const lesson = await Lesson.findById(lessonId).lean();
    if (!lesson) throw new Error('Lesson not found');

    let courseId = lesson.courseId;
    if (!courseId) {
      const { Module } = await import("@/model/module.model");
      const module = await Module.findOne({ lessonIds: lessonId }).select('course').lean();
      if (module) {
        courseId = module.course;
      }
    }

    if (!courseId) throw new Error('Course ID not found for this lesson');

    // 3. Cancel existing pipelines for this lesson (T035)
    await PipelineJob.updateMany(
      { lessonId, status: { $in: ['pending', 'extracting', 'aligning', 'indexing', 'generating'] } },
      { status: 'cancelled' }
    );

    // 4. Create PipelineJob (T031)
    const pipeline = await PipelineJob.create({
      lessonId,
      courseId: courseId,
      triggeredBy: userId,
      status: 'pending',
      startedAt: new Date()
    });

    // 5. Determine starting stage
    if (initialStage) {
      await this.transitionToStage(pipeline._id, initialStage);
    } else {
      const doc = await LectureDocument.findOne({ lessonId });
      
      if (doc && doc.status === 'processing') {
        await this.transitionToStage(pipeline._id, 'extracting');
      } else if (doc && doc.status === 'ready') {
        await this.transitionToStage(pipeline._id, 'aligning');
      } else {
        await this.transitionToStage(pipeline._id, 'extracting');
      }
    }

    return pipeline;
  }

  /**
   * Transitions the pipeline to a new stage.
   * @param {string} pipelineId 
   * @param {string} stage - 'extracting', 'aligning', 'indexing', 'generating', 'completed'
   */
  async transitionToStage(pipelineId, stage) {
    const pipeline = await PipelineJob.findById(pipelineId);
    if (!pipeline || pipeline.status === 'cancelled') return;

    pipeline.status = stage;
    
    if (stage === 'completed') {
      pipeline.completedAt = new Date();
      // T041: Implement completion notification (placeholder for now)
      await this.notifyCompletion(pipeline);
    } else {
      // Update stage startedAt
      const stageName = this.mapStageToKey(stage);
      if (stageName) {
        pipeline.stages[stageName].status = 'processing';
        pipeline.stages[stageName].startedAt = new Date();
      }
    }

    await pipeline.save();

    // Trigger the actual work for the stage
    try {
      switch (stage) {
        case 'extracting':
          await this.triggerExtraction(pipeline);
          break;
        case 'aligning':
          await this.triggerAlignment(pipeline);
          break;
        case 'indexing':
          await this.triggerIndexing(pipeline);
          break;
        case 'generating':
          await this.triggerGeneration(pipeline);
          break;
      }
    } catch (error) {
      console.error(`Error in stage ${stage} for pipeline ${pipelineId}:`, error);
      await this.handleStageFailure(pipelineId, stage, error.message);
    }
  }

  /**
   * Maps status string to stages key.
   */
  mapStageToKey(stage) {
    const mapping = {
      'extracting': 'extraction',
      'aligning': 'alignment',
      'indexing': 'indexing',
      'generating': 'mcqGeneration', // Both generation stages start here
    };
    return mapping[stage];
  }

  async triggerExtraction(pipeline) {
    // Extraction is currently handled in the action.
    // In a full orchestration, we'd wait for it or trigger a background job.
    // For now, if we are in US5 flow, we'll poll for LectureDocument status
    // or assume the action that started the pipeline will update us.
    // To make it truly orchestrated, we'll check the document.
    const doc = await LectureDocument.findOne({ lessonId: pipeline.lessonId });
    if (doc && doc.status === 'ready') {
      await this.handleStageCompletion(pipeline._id, 'extraction');
    } else if (doc && doc.status === 'failed') {
      await this.handleStageFailure(pipeline._id, 'extraction', doc.errorMessage);
    } else {
      // If it's still processing, we might need a timeout or polling.
      // But US5 task says "Integrate extraction stage trigger into pipeline orchestrator".
      // Since extraction is fast (mammoth), we'll assume it's triggered elsewhere
      // and this orchestrator monitors it.
    }
  }

  async triggerAlignment(pipeline) {
    const doc = await LectureDocument.findOne({ lessonId: pipeline.lessonId });
    if (!doc) throw new Error('Document not found for alignment');

    const result = await queueAlignmentJob({
      lessonId: pipeline.lessonId,
      courseId: pipeline.courseId,
      lectureDocumentId: doc._id,
      triggeredBy: pipeline.triggeredBy,
      pipelineJobId: pipeline._id
    });

    if (result.success) {
      pipeline.alignmentJobId = result.jobId;
      await pipeline.save();
    } else if (result.message === 'Alignment job already in progress') {
      pipeline.alignmentJobId = result.jobId;
      await pipeline.save();
    } else {
      throw new Error(result.message || 'Failed to trigger alignment');
    }
  }

  async triggerIndexing(pipeline) {
    const doc = await LectureDocument.findOne({ lessonId: pipeline.lessonId });
    if (!doc) throw new Error('Document not found for indexing');

    const result = await triggerIndexing(doc._id, pipeline._id);
    if (result.success) {
      pipeline.indexingJobId = result.jobId;
      await pipeline.save();
    } else {
      throw new Error(result.error || 'Failed to trigger indexing');
    }
  }

  async triggerGeneration(pipeline) {
    const doc = await LectureDocument.findOne({ lessonId: pipeline.lessonId });
    const quiz = await Quiz.findOne({ lessonId: pipeline.lessonId });
    
    if (!doc) throw new Error('Document not found for generation');
    if (!quiz) throw new Error('Quiz not found for generation. Please create a quiz for this lesson first.');

    // T033: Add parallel MCQ + Oral generation trigger
    const mcqData = {
      lessonId: pipeline.lessonId,
      courseId: pipeline.courseId,
      quizId: quiz._id,
      lectureDocumentId: doc._id,
      triggeredBy: pipeline.triggeredBy,
      pipelineJobId: pipeline._id
    };

    const oralData = {
      ...mcqData
    };

    const [mcqResult, oralResult] = await Promise.all([
      triggerMcqGeneration(mcqData),
      triggerOralGeneration(oralData)
    ]);

    pipeline.mcqGenerationJobId = mcqResult.jobId;
    pipeline.oralGenerationJobId = oralResult.jobId;
    
    pipeline.stages.mcqGeneration.status = 'processing';
    pipeline.stages.mcqGeneration.startedAt = new Date();
    pipeline.stages.oralGeneration.status = 'processing';
    pipeline.stages.oralGeneration.startedAt = new Date();
    
    await pipeline.save();
  }

  /**
   * Handles completion of a stage.
   * Called by background workers or status pollers.
   */
  async handleStageCompletion(pipelineId, stageName, data = {}) {
    const pipeline = await PipelineJob.findById(pipelineId);
    if (!pipeline || pipeline.status === 'cancelled') return;

    if (pipeline.stages[stageName]) {
      pipeline.stages[stageName].status = data.skipped ? 'skipped' : 'completed';
      pipeline.stages[stageName].completedAt = new Date();
      if (data.confidence) pipeline.stages[stageName].confidence = data.confidence;
      if (data.chunksIndexed) pipeline.stages[stageName].chunksIndexed = data.chunksIndexed;
      if (data.questionsGenerated) pipeline.stages[stageName].questionsGenerated = data.questionsGenerated;
      if (data.questionsFlagged) pipeline.stages[stageName].questionsFlagged = data.questionsFlagged;
    }

    await pipeline.save();

    // Transition to next stage (T032)
    switch (stageName) {
      case 'extraction':
        await this.transitionToStage(pipelineId, 'aligning');
        break;
      case 'alignment':
        await this.transitionToStage(pipelineId, 'indexing');
        break;
      case 'indexing':
        await this.transitionToStage(pipelineId, 'generating');
        break;
      case 'mcqGeneration':
      case 'oralGeneration':
        // Wait for both to complete
        if (pipeline.stages.mcqGeneration.status === 'completed' && 
            pipeline.stages.oralGeneration.status === 'completed') {
          await this.transitionToStage(pipelineId, 'completed');
        } else if (pipeline.stages.mcqGeneration.status === 'completed' || 
                   pipeline.stages.oralGeneration.status === 'completed') {
          // One is done, check if the other failed and we allow partial success (T067)
          const otherStage = stageName === 'mcqGeneration' ? 'oralGeneration' : 'mcqGeneration';
          if (pipeline.stages[otherStage].status === 'failed' || pipeline.stages[otherStage].status === 'skipped') {
            await this.transitionToStage(pipelineId, 'completed');
          }
        }
        break;
    }
  }

  async handleStageFailure(pipelineId, stage, errorMessage) {
    const pipeline = await PipelineJob.findById(pipelineId);
    if (!pipeline || pipeline.status === 'cancelled') return;

    const stageKey = stage.includes('Generation') ? stage : this.mapStageToKey(stage);
    if (pipeline.stages[stageKey]) {
      pipeline.stages[stageKey].status = 'failed';
      pipeline.stages[stageKey].errorMessage = errorMessage;
      pipeline.stages[stageKey].completedAt = new Date();
    }

    // Pipeline status reflects failure unless it's a generation stage where partial success is allowed
    if (stageKey !== 'mcqGeneration' && stageKey !== 'oralGeneration') {
      pipeline.status = 'failed';
    } else {
      // Check if both failed
      if (pipeline.stages.mcqGeneration.status === 'failed' && 
          pipeline.stages.oralGeneration.status === 'failed') {
        pipeline.status = 'failed';
      } else {
        // One failed, one might still be processing or completed
        // If the other is completed, we can complete the pipeline
        const otherStage = stageKey === 'mcqGeneration' ? 'oralGeneration' : 'mcqGeneration';
        if (pipeline.stages[otherStage].status === 'completed') {
          pipeline.status = 'completed';
          pipeline.completedAt = new Date();
          await this.notifyCompletion(pipeline);
        }
      }
    }

    await pipeline.save();
  }

  async notifyCompletion(pipeline) {
    // T042: Create notification record in MongoDB
    // Placeholder for actual notification service
    console.info(`Pipeline ${pipeline._id} completed for lesson ${pipeline.lessonId}`);
    pipeline.notificationSent = true;
    await pipeline.save();
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
