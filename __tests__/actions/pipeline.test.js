import { triggerPipeline } from '@/app/actions/pipeline';
import { getServerSession } from 'next-auth';
import Lesson from '@/model/lesson.model';
import PipelineJob from '@/model/pipeline-job.model';
import { PipelineOrchestrator } from '@/service/pipeline-orchestrator';

jest.mock('next-auth');
jest.mock('@/model/lesson.model');
jest.mock('@/model/pipeline-job.model');
jest.mock('@/service/pipeline-orchestrator');

describe('triggerPipeline action', () => {
  const lessonId = 'test-lesson-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error if user is not authenticated', async () => {
    getServerSession.mockResolvedValue(null);

    const result = await triggerPipeline(lessonId);

    expect(result.error).toBe('Unauthorized');
  });

  it('should return error if user is not the instructor of the course', async () => {
    const mockUser = { id: 'user-id' };
    getServerSession.mockResolvedValue({ user: mockUser });

    const mockLesson = {
      _id: lessonId,
      instructor: 'another-user-id' // Different instructor
    };

    Lesson.findById.mockResolvedValue(mockLesson);

    const result = await triggerPipeline(lessonId);

    expect(result.error).toBe('Unauthorized');
  });

  it('should successfully trigger the pipeline', async () => {
    const mockUser = { id: 'user-id' };
    getServerSession.mockResolvedValue({ user: mockUser });

    const mockLesson = {
      _id: lessonId,
      instructor: 'user-id'
    };

    Lesson.findById.mockResolvedValue(mockLesson);
    
    // Mock successful start
    PipelineOrchestrator.prototype.startPipeline.mockResolvedValue({
      id: 'pipeline-id',
      status: 'pending'
    });

    const result = await triggerPipeline(lessonId);

    expect(result.success).toBe(true);
    expect(result.pipelineId).toBe('pipeline-id');
  });

  it('should return error if pipeline limit reached', async () => {
    const mockUser = { id: 'user-id' };
    getServerSession.mockResolvedValue({ user: mockUser });

    const mockLesson = {
      _id: lessonId,
      instructor: 'user-id'
    };

    Lesson.findById.mockResolvedValue(mockLesson);
    
    PipelineOrchestrator.prototype.startPipeline.mockRejectedValue(new Error('Maximum concurrent pipelines reached'));

    const result = await triggerPipeline(lessonId);

    expect(result.error).toBe('Maximum concurrent pipelines reached');
  });
});
