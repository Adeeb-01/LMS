/**
 * @jest-environment node
 */
import { GET } from '../../app/api/lecture-documents/[id]/route';
import { getLectureDocumentByLesson, getLectureDocumentStatus } from '../../app/actions/lecture-document';
import { LectureDocument } from '../../model/lecture-document.model';
import { getLoggedInUser } from '../../lib/loggedin-user';
import { verifyInstructorOwnsCourse } from '../../lib/authorization';
import { hasEnrollmentForCourse } from '../../queries/enrollments';

// Mock everything
jest.mock('../../model/lecture-document.model');
jest.mock('../../lib/loggedin-user');
jest.mock('../../lib/authorization');
jest.mock('../../queries/enrollments');
jest.mock('../../service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(true)
}));
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockReturnValue(Promise.resolve((key) => key))
}));
jest.mock('../../auth', () => ({
  auth: jest.fn()
}));

describe('Lecture Document Retrieval Integration Tests', () => {
  const mockUser = { id: '507f1f77bcf86cd799439011', role: 'instructor' };
  const mockDocId = '507f1f77bcf86cd799439014';
  const mockCourseId = '507f1f77bcf86cd799439012';
  const mockLessonId = '507f1f77bcf86cd799439013';

  const mockDoc = {
    _id: mockDocId,
    lessonId: mockLessonId,
    courseId: mockCourseId,
    status: 'ready',
    extractedText: {
      fullText: 'Sample text',
      wordCount: 2,
      structuredContent: []
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLectureDocumentByLesson Server Action', () => {
    it('should successfully retrieve document if user has access', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      LectureDocument.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockDoc)
      });
      verifyInstructorOwnsCourse.mockResolvedValue(true);

      const result = await getLectureDocumentByLesson(mockLessonId);
      
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ready');
    });

    it('should fail if user is not authorized', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      LectureDocument.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockDoc)
      });
      verifyInstructorOwnsCourse.mockResolvedValue(false);
      hasEnrollmentForCourse.mockResolvedValue(false);

      const result = await getLectureDocumentByLesson(mockLessonId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('forbidden');
    });
  });

  describe('getLectureDocumentStatus Server Action', () => {
    it('should return status and error message', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      LectureDocument.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({ status: 'processing', errorMessage: null })
        })
      });
      verifyInstructorOwnsCourse.mockResolvedValue(true);

      const result = await getLectureDocumentStatus(mockDocId);
      
      expect(result.status).toBe('processing');
    });
  });
});
