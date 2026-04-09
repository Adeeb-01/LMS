/**
 * @jest-environment node
 */
// Mock everything before imports
jest.mock('@/model/indexing-job.model', () => ({
  IndexingJob: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn()
  }
}));

jest.mock('@/model/lecture-document.model', () => ({
  LectureDocument: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock('@/lib/embeddings/gemini', () => ({
  generateBatchEmbeddings: jest.fn()
}));

jest.mock('@/service/chroma', () => ({
  addEmbeddings: jest.fn(),
  removeEmbeddingsByDocument: jest.fn()
}));

jest.mock('@/lib/embeddings/chunker', () => ({
  chunkByHeadings: jest.fn()
}));

jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

import { processIndexingJob } from '@/service/embedding-queue';
import { IndexingJob } from '@/model/indexing-job.model';
import { LectureDocument } from '@/model/lecture-document.model';
import { generateBatchEmbeddings } from '@/lib/embeddings/gemini';
import { addEmbeddings } from '@/service/chroma';
import { chunkByHeadings } from '@/lib/embeddings/chunker';

describe('Embedding Pipeline Integration Tests', () => {
  const mockJobId = 'job123';
  const mockDocId = 'doc123';
  const mockCourseId = 'course123';
  const mockLessonId = 'lesson123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process indexing job successfully', async () => {
    // Setup mocks
    const mockJob = {
      _id: mockJobId,
      lectureDocumentId: mockDocId,
      courseId: mockCourseId,
      lessonId: mockLessonId,
      status: 'processing',
      save: jest.fn().mockResolvedValue(this)
    };

    const mockDoc = {
      _id: mockDocId,
      extractedText: {
        structuredContent: [{ type: 'paragraph', content: 'test content' }]
      }
    };

    const mockChunks = [
      { content: 'test content', headingPath: 'Chapter 1', headingLevel: 1, chunkIndex: 0, tokenCount: 2 }
    ];

    const mockEmbeddings = [[0.1, 0.2, 0.3]];

    IndexingJob.findById.mockResolvedValue(mockJob);
    LectureDocument.findById.mockResolvedValue(mockDoc);
    chunkByHeadings.mockReturnValue(mockChunks);
    generateBatchEmbeddings.mockResolvedValue(mockEmbeddings);
    addEmbeddings.mockResolvedValue({ success: true });

    // Execute
    await processIndexingJob(mockJobId);

    // Verify
    expect(chunkByHeadings).toHaveBeenCalledWith(mockDoc.extractedText.structuredContent);
    expect(generateBatchEmbeddings).toHaveBeenCalledWith(['test content']);
    expect(addEmbeddings).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        id: `embed-${mockCourseId}-${mockDocId}-0`,
        embedding: mockEmbeddings[0],
        document: 'test content',
        metadata: expect.objectContaining({
          courseId: mockCourseId,
          lectureDocumentId: mockDocId
        })
      })
    ]));

    expect(IndexingJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId,
      expect.objectContaining({ status: 'completed' })
    );

    expect(LectureDocument.findByIdAndUpdate).toHaveBeenCalledWith(
      mockDocId,
      expect.objectContaining({ embeddingStatus: 'indexed' })
    );
  });

  it('should handle failure and update job status to pending for retry', async () => {
    IndexingJob.findById.mockResolvedValue({
      _id: mockJobId,
      lectureDocumentId: mockDocId,
      retryCount: 0
    });
    LectureDocument.findById.mockRejectedValue(new Error('DB Error'));

    await processIndexingJob(mockJobId);

    expect(IndexingJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId,
      expect.objectContaining({ status: 'pending', errorMessage: 'DB Error', retryCount: 1 })
    );
  });

  it('should mark job as failed after maximum retries', async () => {
    IndexingJob.findById.mockResolvedValue({
      _id: mockJobId,
      lectureDocumentId: mockDocId,
      retryCount: 2 // Next one will be 3
    });
    LectureDocument.findById.mockRejectedValue(new Error('Persistent Error'));

    await processIndexingJob(mockJobId);

    expect(IndexingJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId,
      expect.objectContaining({ status: 'failed', errorMessage: 'Persistent Error', retryCount: 3 })
    );
  });
});
