import { lookupTimestampForText } from '@/lib/alignment/timestamp-lookup';
import { VideoTranscript } from '@/model/video-transcript.model';
import { LectureDocument } from '@/model/lecture-document.model';

// Mock models
jest.mock('@/model/video-transcript.model', () => ({
  VideoTranscript: {
    findOne: jest.fn(),
  }
}));

jest.mock('@/model/lecture-document.model', () => ({
  LectureDocument: {
    findOne: jest.fn(),
  }
}));

jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

describe('timestamp-lookup', () => {
  const lessonId = 'lesson123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return timestamps for matching text', async () => {
    LectureDocument.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        extractedText: {
          structuredContent: [
            { content: 'Introduction to React' },
            { content: 'What are hooks?' }
          ]
        }
      })
    });

    VideoTranscript.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        alignments: [
          { blockIndex: 0, startSeconds: 10, endSeconds: 20, status: 'aligned' },
          { blockIndex: 1, startSeconds: 30, endSeconds: 40, status: 'aligned' }
        ]
      })
    });

    const result = await lookupTimestampForText(lessonId, 'hooks');
    expect(result).toEqual({ startSeconds: 30, endSeconds: 40 });
  });

  it('should return null if text not found', async () => {
    LectureDocument.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        extractedText: { structuredContent: [{ content: 'Intro' }] }
      })
    });

    VideoTranscript.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ alignments: [] })
    });

    const result = await lookupTimestampForText(lessonId, 'unknown');
    expect(result).toBeNull();
  });
});
