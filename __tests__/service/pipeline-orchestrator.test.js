/**
 * @jest-environment node
 */
import { PipelineOrchestrator } from '@/service/pipeline-orchestrator';
import { PipelineJob } from '@/model/pipeline-job.model';
import { Lesson } from '@/model/lesson.model';

jest.mock('@/model/pipeline-job.model');
jest.mock('@/model/lesson.model');
jest.mock('@/model/lecture-document.model');
jest.mock('@/model/quizv2-model');
jest.mock('@/service/alignment-queue');
jest.mock('@/service/embedding-queue');
jest.mock('@/service/mcq-generation-queue');
jest.mock('@/service/oral-generation-queue');
jest.mock('@/service/mongo');

describe('PipelineOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    jest.clearAllMocks();
  });

  describe('startPipeline', () => {
    it('should create a new pipeline job and start extraction', async () => {
      const mockLesson = {
        _id: 'lesson-id',
        courseId: { _id: 'course-id' },
        title: 'Test Lesson'
      };
      const mockUser = { _id: 'user-id' };

      Lesson.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockLesson)
      });
      PipelineJob.create.mockResolvedValue({
        _id: 'pipeline-id',
        lessonId: 'lesson-id',
        status: 'pending',
        save: jest.fn()
      });
      PipelineJob.countDocuments.mockResolvedValue(0);

      const result = await orchestrator.startPipeline('lesson-id', 'user-id');

      expect(PipelineJob.create).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('should throw error if max concurrent pipelines reached', async () => {
      PipelineJob.countDocuments.mockResolvedValue(5);

      await expect(orchestrator.startPipeline('lesson-id', 'user-id'))
        .rejects.toThrow('Maximum concurrent pipelines reached');
    });
  });

  describe('handleStageCompletion', () => {
    it('should transition from extraction to alignment', async () => {
      const mockPipeline = {
        _id: 'pipeline-id',
        status: 'extracting',
        stages: {
          extraction: {}
        },
        save: jest.fn().mockResolvedValue(true)
      };

      PipelineJob.findById.mockResolvedValue(mockPipeline);
      
      const transitionSpy = jest.spyOn(orchestrator, 'transitionToStage').mockResolvedValue(true);

      await orchestrator.handleStageCompletion('pipeline-id', 'extraction');

      expect(transitionSpy).toHaveBeenCalledWith('pipeline-id', 'aligning');
    });

    it('should transition from alignment to indexing', async () => {
      const mockPipeline = {
        _id: 'pipeline-id',
        status: 'aligning',
        stages: {
          alignment: {}
        },
        save: jest.fn().mockResolvedValue(true)
      };

      PipelineJob.findById.mockResolvedValue(mockPipeline);
      
      const transitionSpy = jest.spyOn(orchestrator, 'transitionToStage').mockResolvedValue(true);

      await orchestrator.handleStageCompletion('pipeline-id', 'alignment', { confidence: 0.9 });

      expect(transitionSpy).toHaveBeenCalledWith('pipeline-id', 'indexing');
      expect(mockPipeline.stages.alignment.confidence).toBe(0.9);
    });

    it('should transition from indexing to generating', async () => {
      const mockPipeline = {
        _id: 'pipeline-id',
        status: 'indexing',
        stages: {
          indexing: {}
        },
        save: jest.fn().mockResolvedValue(true)
      };

      PipelineJob.findById.mockResolvedValue(mockPipeline);
      
      const transitionSpy = jest.spyOn(orchestrator, 'transitionToStage').mockResolvedValue(true);

      await orchestrator.handleStageCompletion('pipeline-id', 'indexing', { chunksIndexed: 10 });

      expect(transitionSpy).toHaveBeenCalledWith('pipeline-id', 'generating');
      expect(mockPipeline.stages.indexing.chunksIndexed).toBe(10);
    });
  });
});
