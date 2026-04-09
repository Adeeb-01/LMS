// Mock models first to avoid loading mongoose fully
jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/loggedin-user', () => ({
  getLoggedInUser: jest.fn(),
}));

jest.mock('@/lib/authorization', () => ({
  assertInstructorOwnsCourse: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/model/video-transcript.model', () => ({
  VideoTranscript: {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('@/model/alignment-job.model', () => {
  const mockSort = jest.fn().mockReturnThis();
  const mockFindOne = jest.fn().mockReturnValue({ sort: mockSort });
  return {
    AlignmentJob: {
      findOne: mockFindOne,
    },
  };
});

jest.mock('@/model/lecture-document.model', () => ({
  LectureDocument: {
    findOne: jest.fn(),
  },
}));

import { adjustTimestamp, retryAlignment } from '@/app/actions/alignment';
import { dbConnect } from '@/service/mongo';
import { getLoggedInUser } from '@/lib/loggedin-user';
import { assertInstructorOwnsCourse } from '@/lib/authorization';
import { VideoTranscript } from '@/model/video-transcript.model';
import { AlignmentJob } from '@/model/alignment-job.model';
import { queueAlignmentJob } from '@/service/alignment-queue';

jest.mock('@/service/alignment-queue', () => ({
  queueAlignmentJob: jest.fn(),
}));

describe('Alignment Review Actions (US4)', () => {
  const mockUser = { id: 'user123', role: 'instructor' };
  const mockLessonId = 'lesson123';
  const mockCourseId = 'course123';

  beforeEach(() => {
    jest.clearAllMocks();
    getLoggedInUser.mockResolvedValue(mockUser);
  });

  describe('adjustTimestamp', () => {
    it('should successfully adjust a timestamp', async () => {
      const mockBlockIndex = 0;
      const mockStart = 10;
      const mockEnd = 20;

      VideoTranscript.findOneAndUpdate.mockResolvedValue({
        _id: 'transcript123',
        lessonId: mockLessonId,
      });

      const result = await adjustTimestamp(mockLessonId, mockCourseId, {
        blockIndex: mockBlockIndex,
        startSeconds: mockStart,
        endSeconds: mockEnd,
      });

      expect(result.success).toBe(true);
      expect(VideoTranscript.findOneAndUpdate).toHaveBeenCalledWith(
        { 
          lessonId: mockLessonId,
          'alignments.blockIndex': mockBlockIndex 
        },
        {
          $set: {
            'alignments.$.startSeconds': mockStart,
            'alignments.$.endSeconds': mockEnd,
            'alignments.$.manuallyVerified': true,
            'alignments.$.status': 'aligned',
            'alignments.$.verifiedBy': mockUser.id,
            'alignments.$.verifiedAt': expect.any(Date),
          }
        },
        { new: true }
      );
    });

    it('should fail if user is not logged in', async () => {
      getLoggedInUser.mockResolvedValue(null);
      const result = await adjustTimestamp(mockLessonId, mockCourseId, {
        blockIndex: 0,
        startSeconds: 10,
        endSeconds: 20,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should fail validation with invalid times', async () => {
      const result = await adjustTimestamp(mockLessonId, mockCourseId, {
        blockIndex: 0,
        startSeconds: 20,
        endSeconds: 10, // Invalid: start > end
      });
      expect(result.success).toBe(false);
    });
  });

  describe('retryAlignment', () => {
    it('should successfully retry a failed alignment', async () => {
      const mockJob = {
        _id: 'job123',
        status: 'failed',
        retryCount: 0,
        lectureDocumentId: 'doc123',
      };
      
      AlignmentJob.findOne().sort.mockResolvedValue(mockJob);
      queueAlignmentJob.mockResolvedValue({ success: true, jobId: 'job456' });

      const result = await retryAlignment(mockLessonId, mockCourseId);

      expect(result.success).toBe(true);
      expect(queueAlignmentJob).toHaveBeenCalledWith(expect.objectContaining({
        lessonId: mockLessonId,
        courseId: mockCourseId,
      }));
    });

    it('should fail if no failed job exists', async () => {
      AlignmentJob.findOne().sort.mockResolvedValue(null);
      const result = await retryAlignment(mockLessonId, mockCourseId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No failed alignment to retry');
    });

    it('should fail if retry limit reached', async () => {
        AlignmentJob.findOne().sort.mockResolvedValue({
          _id: 'job123',
          status: 'failed',
          retryCount: 1, // Max retries reached
        });
  
        const result = await retryAlignment(mockLessonId, mockCourseId);
  
        expect(result.success).toBe(false);
        expect(result.error).toBe('Retry limit exceeded');
      });
  });
});
