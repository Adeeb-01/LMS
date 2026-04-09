import { GET } from '@/app/api/pipeline/[lessonId]/status/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import PipelineJob from '@/model/pipeline-job.model';

jest.mock('next-auth');
jest.mock('@/model/pipeline-job.model');

describe('GET /api/pipeline/[lessonId]/status', () => {
  const lessonId = 'test-lesson-id';

  it('should return 401 if user is not authenticated', async () => {
    getServerSession.mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/pipeline/${lessonId}/status`);
    const response = await GET(req, { params: { lessonId } });

    expect(response.status).toBe(401);
  });

  it('should return pipeline status for a lesson', async () => {
    const mockUser = { id: 'user-id' };
    getServerSession.mockResolvedValue({ user: mockUser });

    const mockPipeline = {
      _id: 'pipeline-id',
      lessonId,
      status: 'extracting',
      stages: {
        extraction: { status: 'processing' },
        alignment: { status: 'pending' },
        indexing: { status: 'pending' },
        mcqGeneration: { status: 'pending' },
        oralGeneration: { status: 'pending' }
      }
    };

    PipelineJob.findOne.mockResolvedValue(mockPipeline);

    const req = new NextRequest(`http://localhost/api/pipeline/${lessonId}/status`);
    const response = await GET(req, { params: { lessonId } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pipeline.status).toBe('extracting');
  });

  it('should return 404 if no pipeline exists for lesson', async () => {
    const mockUser = { id: 'user-id' };
    getServerSession.mockResolvedValue({ user: mockUser });
    PipelineJob.findOne.mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/pipeline/${lessonId}/status`);
    const response = await GET(req, { params: { lessonId } });

    expect(response.status).toBe(404);
  });
});
