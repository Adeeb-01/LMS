import { askTutor } from '@/app/actions/rag-tutor';
import { generateGroundedResponse } from '@/lib/rag/tutor-response';
import { getLoggedInUser } from '@/lib/loggedin-user';
import { searchCourse } from '@/service/semantic-search';
import { TutorInteraction } from '@/model/tutor-interaction.model';
import mongoose from 'mongoose';

jest.mock('@/lib/loggedin-user', () => ({
  getLoggedInUser: jest.fn(),
}));

jest.mock('@/service/semantic-search', () => ({
  searchCourse: jest.fn(),
}));

jest.mock('@/lib/rag/tutor-response', () => ({
  generateGroundedResponse: jest.fn(),
}));

jest.mock('@/model/tutor-interaction.model', () => ({
  TutorInteraction: {
    create: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn(),
}));

describe('askTutor Server Action', () => {
  const mockUser = { id: 'user-123', role: 'student' };
  const mockLessonId = new mongoose.Types.ObjectId().toString();
  const mockCourseId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    getLoggedInUser.mockResolvedValue(mockUser);
    searchCourse.mockResolvedValue({ ok: true, results: [] });
    TutorInteraction.countDocuments.mockResolvedValue(0);
  });

  it('should return grounded response and save interaction', async () => {
    const mockTutorResult = {
      response: 'The answer is photosynthesis.',
      isGrounded: true,
      timestampLinks: [{ seconds: 10, label: 'Intro' }],
    };
    generateGroundedResponse.mockResolvedValue(mockTutorResult);

    const mockSavedInteraction = { 
      _id: new mongoose.Types.ObjectId('60d5f9f8f8f8f8f8f8f8f8f8'),
      courseId: mockCourseId,
      response: 'The answer is photosynthesis.',
      isGrounded: true,
      reciteBackRequired: true
    };
    TutorInteraction.create.mockResolvedValue(mockSavedInteraction);

    const result = await askTutor({
      lessonId: mockLessonId,
      courseId: mockCourseId,
      question: 'What is the topic?',
      inputMethod: 'text',
    });

    expect(result.ok).toBe(true);
    expect(result.result.interactionId).toBe('60d5f9f8f8f8f8f8f8f8f8f8');
    expect(result.result.response).toBe('The answer is photosynthesis.');
    expect(TutorInteraction.create).toHaveBeenCalled();
  });

  it('should enforce rate limiting', async () => {
    TutorInteraction.countDocuments.mockResolvedValue(10);

    const result = await askTutor({
      lessonId: mockLessonId,
      courseId: mockCourseId,
      question: 'Another question?',
      inputMethod: 'text',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('RATE_LIMITED');
  });

  it('should handle unauthorized users', async () => {
    getLoggedInUser.mockResolvedValue(null);

    const result = await askTutor({
      lessonId: mockLessonId,
      courseId: mockCourseId,
      question: 'What is the topic?',
      inputMethod: 'text',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('UNAUTHORIZED');
  });
});
