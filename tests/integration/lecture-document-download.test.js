/**
 * @jest-environment node
 */
import { GET } from '../../app/api/lecture-documents/[id]/download/route';
import { LectureDocument } from '../../model/lecture-document.model';
import { getLoggedInUser } from '../../lib/loggedin-user';
import { verifyInstructorOwnsCourse, isAdmin } from '../../lib/authorization';
import { hasEnrollmentForCourse } from '../../queries/enrollments';

// Mock everything
jest.mock('../../model/lecture-document.model');
jest.mock('../../lib/loggedin-user');
jest.mock('../../lib/authorization');
jest.mock('../../queries/enrollments');
jest.mock('../../service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../auth', () => ({
  auth: jest.fn()
}));

describe('Lecture Document Download Integration Tests', () => {
  const mockUser = { id: '507f1f77bcf86cd799439011', role: 'student' };
  const mockDocId = '507f1f77bcf86cd799439014';
  const mockCourseId = '507f1f77bcf86cd799439012';
  const mockLessonId = '507f1f77bcf86cd799439013';

  const mockDoc = {
    _id: mockDocId,
    lessonId: mockLessonId,
    courseId: mockCourseId,
    status: 'ready',
    originalFilename: 'test.docx',
    extractedText: {
      fullText: 'Sample text content',
      structuredContent: [
        { type: 'paragraph', content: 'Sample text content' }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/lecture-documents/[id]/download', () => {
    it('should successfully download txt if student is enrolled', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      LectureDocument.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockDoc)
      });
      verifyInstructorOwnsCourse.mockResolvedValue(false);
      hasEnrollmentForCourse.mockResolvedValue(true);

      const request = new Request(`http://localhost/api/lecture-documents/${mockDocId}/download?format=txt`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocId }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      const body = await response.text();
      expect(body).toBe('Sample text content');
    });

    it('should successfully download html if student is enrolled', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      LectureDocument.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockDoc)
      });
      verifyInstructorOwnsCourse.mockResolvedValue(false);
      hasEnrollmentForCourse.mockResolvedValue(true);

      const request = new Request(`http://localhost/api/lecture-documents/${mockDocId}/download?format=html`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocId }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
      const body = await response.text();
      expect(body).toContain('<!DOCTYPE html>');
      expect(body).toContain('Sample text content');
    });

    it('should fail if student is not enrolled', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      LectureDocument.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockDoc)
      });
      verifyInstructorOwnsCourse.mockResolvedValue(false);
      hasEnrollmentForCourse.mockResolvedValue(false);
      isAdmin.mockReturnValue(false);

      const request = new Request(`http://localhost/api/lecture-documents/${mockDocId}/download?format=txt`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocId }) });

      expect(response.status).toBe(403);
    });

    it('should fail if document is not ready', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      LectureDocument.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({ ...mockDoc, status: 'processing' })
      });

      const request = new Request(`http://localhost/api/lecture-documents/${mockDocId}/download`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('NOT_READY');
    });
  });
});
