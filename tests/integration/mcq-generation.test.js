/**
 * @jest-environment node
 */
// Mock everything before imports
jest.mock('@/model/generation-job.model', () => ({
  GenerationJob: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn()
  }
}));

jest.mock('@/model/questionv2-model', () => ({
  Question: {
    insertMany: jest.fn(),
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    }),
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ quizId: 'quiz123' })
      })
    }),
    deleteMany: jest.fn()
  }
}));

jest.mock('@/service/chroma', () => ({
  getChunksByLesson: jest.fn(),
  getCollection: jest.fn(),
  getClient: jest.fn()
}));

jest.mock('@/lib/mcq-generation/generator', () => ({
  generateQuestionsFromChunk: jest.fn()
}));

jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

import { processGenerationJob } from '@/service/mcq-generation-queue';
import { GenerationJob } from '@/model/generation-job.model';
import { Question } from '@/model/questionv2-model';
import * as generator from '@/lib/mcq-generation/generator';
import * as chroma from '@/service/chroma';

describe('MCQ Generation Integration Tests', () => {
  const mockJobId = 'job123';
  const mockLessonId = 'lesson123';
  const mockCourseId = 'course123';
  const mockQuizId = 'quiz123';
  const mockDocId = 'doc123';
  const mockUserId = 'user123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process a generation job end-to-end', async () => {
    // 1. Setup mocks
    const mockJob = {
      _id: mockJobId,
      lessonId: mockLessonId,
      courseId: mockCourseId,
      quizId: mockQuizId,
      lectureDocumentId: mockDocId,
      triggeredBy: mockUserId,
      status: 'pending'
    };

    const mockChunks = [
      { id: 'chunk-1', document: 'Valid pedagogical content about space.', metadata: { headingPath: 'Intro' } }
    ];

    const mockGeneratedQuestions = {
      questions: [
        {
          text: "What is space?",
          options: [
            { id: "a", text: "Vacuum" },
            { id: "b", text: "Water" },
            { id: "c", text: "Air" },
            { id: "d", text: "Rock" }
          ],
          correctOptionId: "a",
          explanation: "Space is a near-perfect vacuum.",
          difficulty: {
            bValue: 0.0,
            bloomLevel: "understand",
            reasoning: "Basic concept"
          }
        }
      ],
      skipped: false,
      skipReason: null
    };

    GenerationJob.findById.mockResolvedValue(mockJob);
    chroma.getChunksByLesson.mockResolvedValue(mockChunks);
    generator.generateQuestionsFromChunk.mockResolvedValue(mockGeneratedQuestions);
    Question.insertMany.mockResolvedValue([]);

    // 2. Execute
    await processGenerationJob(mockJobId);

    // 3. Verify
    expect(chroma.getChunksByLesson).toHaveBeenCalledWith(mockLessonId);
    expect(generator.generateQuestionsFromChunk).toHaveBeenCalledWith(
      mockChunks[0].document,
      expect.objectContaining({ headingPath: 'Intro' })
    );
    expect(Question.insertMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        text: "What is space?",
        quizId: mockQuizId,
        isDraft: true,
        generatedBy: 'gemini'
      })
    ]));

    expect(GenerationJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId,
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('should handle partial failure and update progress', async () => {
    // 1. Setup mocks
    const mockJob = {
      _id: mockJobId,
      lessonId: mockLessonId,
      courseId: mockCourseId,
      quizId: mockQuizId,
      lectureDocumentId: mockDocId,
      triggeredBy: mockUserId,
      status: 'pending'
    };

    const mockChunks = [
      { id: 'chunk-1', document: 'Valid content.', metadata: { headingPath: 'Intro' } },
      { id: 'chunk-2', document: 'Faulty content.', metadata: { headingPath: 'Advanced' } }
    ];

    const mockGeneratedQuestions = {
      questions: [
        {
          text: "Question 1",
          options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }, { id: "d", text: "D" }],
          correctOptionId: "a",
          explanation: "Explanation 1",
          difficulty: { bValue: 0.0, bloomLevel: "understand", reasoning: "Basic" }
        }
      ],
      skipped: false,
      skipReason: null
    };

    GenerationJob.findById.mockResolvedValue(mockJob);
    chroma.getChunksByLesson.mockResolvedValue(mockChunks);
    
    // First call succeeds, second fails
    generator.generateQuestionsFromChunk
      .mockResolvedValueOnce(mockGeneratedQuestions)
      .mockRejectedValueOnce(new Error('AI generation failed'));
    
    Question.insertMany.mockResolvedValue([]);

    // 2. Execute
    await processGenerationJob(mockJobId);

    // 3. Verify
    // Check if findByIdAndUpdate was called with progress updates
    expect(GenerationJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId,
      expect.objectContaining({ chunksTotal: 2 })
    );

    // Check progress after first chunk
    expect(GenerationJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId,
      expect.objectContaining({ chunksProcessed: 1, questionsGenerated: 1 })
    );

    // Check error handling after second chunk
    expect(GenerationJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId,
      expect.objectContaining({ 
        $push: { 
          chunkErrors: expect.objectContaining({
            chunkId: 'chunk-2',
            error: 'AI generation failed'
          })
        }
      })
    );

    // Final job status should be completed (partial success)
    expect(GenerationJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId,
      expect.objectContaining({ status: 'completed' })
    );
  });
});
