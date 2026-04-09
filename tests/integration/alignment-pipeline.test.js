import { processAlignmentJob } from '@/lib/alignment/job-processor';

// Mock models first to avoid loading mongoose fully
jest.mock('@/model/alignment-job.model', () => ({
  AlignmentJob: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  }
}));

jest.mock('@/model/video-transcript.model', () => ({
  VideoTranscript: {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  }
}));

jest.mock('@/model/lecture-document.model', () => ({
  LectureDocument: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  }
}));

jest.mock('@/model/lesson.model', () => ({
  Lesson: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }
}));

// Import models AFTER mocking
import { AlignmentJob } from '@/model/alignment-job.model';
import { VideoTranscript } from '@/model/video-transcript.model';
import { LectureDocument } from '@/model/lecture-document.model';
import { Lesson } from '@/model/lesson.model';

import { extractAudio, cleanupAudio } from '@/lib/alignment/audio-extractor';
import { transcribeAudio } from '@/lib/alignment/transcriber';
import { alignTextWithTranscript } from '@/lib/alignment/text-aligner';

// Mock lib functions
jest.mock('@/lib/alignment/audio-extractor', () => ({
  extractAudio: jest.fn().mockResolvedValue('/tmp/audio.wav'),
  cleanupAudio: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/alignment/transcriber', () => ({
  transcribeAudio: jest.fn().mockResolvedValue({
    text: 'Transcribed text',
    segments: [{ text: 'Transcribed text', start: 0, end: 10 }],
    words: [{ word: 'transcribed', start: 0, end: 5 }, { word: 'text', start: 6, end: 10 }]
  }),
}));

jest.mock('@/lib/alignment/text-aligner', () => ({
  alignTextWithTranscript: jest.fn().mockReturnValue([
    { blockIndex: 0, startSeconds: 0, endSeconds: 10, confidence: 95, status: 'aligned' }
  ]),
}));

// Mock dbConnect
jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

describe('alignment-pipeline integration', () => {
  let mockLessonId, mockCourseId, mockLectureDocId;

  beforeAll(async () => {
    mockLessonId = 'lesson123';
    mockCourseId = 'course123';
    mockLectureDocId = 'doc123';
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Mongoose models
    Lesson.findById = jest.fn().mockResolvedValue({
      _id: mockLessonId,
      videoFilename: 'test.mp4',
      duration: 120
    });
    
    LectureDocument.findById = jest.fn().mockResolvedValue({
      _id: mockLectureDocId,
      extractedText: {
        structuredContent: [{ type: 'paragraph', content: 'Transcribed text' }]
      }
    });

    AlignmentJob.findById = jest.fn().mockImplementation((id) => ({
      _id: id,
      lessonId: mockLessonId,
      courseId: mockCourseId,
      lectureDocumentId: mockLectureDocId,
      status: 'queued',
      retryCount: 0,
      startedAt: new Date(),
      save: jest.fn().mockResolvedValue(this)
    }));

    AlignmentJob.findByIdAndUpdate = jest.fn().mockResolvedValue({});
    VideoTranscript.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'transcript123' });
    LectureDocument.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  });

  it('should process alignment job successfully', async () => {
    const mockJobId = 'job123';
    
    await processAlignmentJob(mockJobId);

    expect(extractAudio).toHaveBeenCalled();
    expect(transcribeAudio).toHaveBeenCalledWith('/tmp/audio.wav');
    expect(alignTextWithTranscript).toHaveBeenCalled();
    expect(VideoTranscript.findOneAndUpdate).toHaveBeenCalled();
    expect(LectureDocument.findByIdAndUpdate).toHaveBeenCalled();
    expect(cleanupAudio).toHaveBeenCalled();
    
    // Verify job status updates
    expect(AlignmentJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId, 
      expect.objectContaining({ status: 'completed', progress: 100 }),
      expect.any(Object)
    );
  });

  it('should handle failures and retry if possible', async () => {
    const mockJobId = 'job123';
    transcribeAudio.mockRejectedValueOnce(new Error('Transcription error'));

    await processAlignmentJob(mockJobId);

    expect(AlignmentJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId, 
      expect.objectContaining({ 
        status: 'queued', // Still queued for retry
        errorMessage: 'Transcription error',
        retryCount: 1 
      }),
      expect.any(Object)
    );
  });

  it('should mark job as failed after maximum retries', async () => {
    const mockJobId = 'job123';
    transcribeAudio.mockRejectedValueOnce(new Error('Transcription error'));
    
    // Set retryCount to 1 (max)
    AlignmentJob.findById = jest.fn().mockImplementation((id) => ({
      _id: id,
      lessonId: mockLessonId,
      courseId: mockCourseId,
      lectureDocumentId: mockLectureDocId,
      status: 'queued',
      retryCount: 1, // Already tried once
      startedAt: new Date(),
      save: jest.fn().mockResolvedValue(this)
    }));

    await processAlignmentJob(mockJobId);

    expect(AlignmentJob.findByIdAndUpdate).toHaveBeenCalledWith(
      mockJobId, 
      expect.objectContaining({ 
        status: 'failed', 
        errorMessage: 'Transcription error',
        retryCount: 1 
      }),
      expect.any(Object)
    );
    
    expect(VideoTranscript.findOneAndUpdate).toHaveBeenCalledWith(
      { lessonId: mockLessonId },
      expect.objectContaining({ alignmentStatus: 'failed' }),
      expect.any(Object)
    );
  });
});
