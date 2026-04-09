/**
 * @jest-environment node
 */
import { POST } from '../../app/api/lecture-documents/route';
import { uploadLectureDocument } from '../../app/actions/lecture-document';
import { LectureDocument } from '../../model/lecture-document.model';
import { Lesson } from '../../model/lesson.model';
import { extractTextFromDocx } from '../../lib/docx/extractor';
import { getLoggedInUser } from '../../lib/loggedin-user';
import { assertInstructorOwnsCourse } from '../../lib/authorization';

// Mock everything
jest.mock('../../model/lecture-document.model');
jest.mock('../../model/lesson.model');
jest.mock('../../lib/docx/extractor');
jest.mock('../../lib/loggedin-user');
jest.mock('../../lib/authorization');
jest.mock('../../auth', () => ({
  auth: jest.fn()
}));
jest.mock('../../service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(true)
}));
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockReturnValue(Promise.resolve((key) => key))
}));

describe('Lecture Document Upload Integration Tests', () => {
  const mockUser = { id: '507f1f77bcf86cd799439011', role: 'instructor' };
  const mockCourseId = '507f1f77bcf86cd799439012';
  const mockLessonId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/lecture-documents', () => {
    it('should fail if user is not authenticated', async () => {
      getLoggedInUser.mockResolvedValue(null);

      const request = new Request('http://localhost/api/lecture-documents', {
        method: 'POST',
        body: new FormData(),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should successfully upload and process via API', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      assertInstructorOwnsCourse.mockResolvedValue(true);
      LectureDocument.findOne.mockResolvedValue(null); // No existing doc
      
      const mockDoc = {
        _id: 'doc-123',
        lessonId: mockLessonId,
        courseId: mockCourseId,
        originalFilename: 'test.docx',
        fileSize: 100,
        status: 'ready',
        createdAt: new Date()
      };
      
      LectureDocument.create.mockResolvedValue({ _id: 'doc-123' });
      extractTextFromDocx.mockResolvedValue({
        fullText: 'Extracted text',
        wordCount: 2,
        structuredContent: [],
        extractedAt: new Date(),
        extractionDurationMs: 100
      });
      LectureDocument.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockDoc)
      });

      const formData = new FormData();
      const file = new Blob(['mock-content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      formData.append('file', file, 'test.docx');
      formData.append('lessonId', mockLessonId);
      formData.append('courseId', mockCourseId);

      const request = new Request('http://localhost/api/lecture-documents', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('ready');
    });
  });

  describe('uploadLectureDocument Server Action', () => {
    it('should successfully upload and process via Server Action', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      assertInstructorOwnsCourse.mockResolvedValue(true);
      LectureDocument.findOne.mockResolvedValue(null);
      
      const mockDoc = {
        _id: 'doc-123',
        lessonId: mockLessonId,
        courseId: mockCourseId,
        originalFilename: 'test.docx',
        status: 'ready'
      };
      
      LectureDocument.create.mockResolvedValue({ _id: 'doc-123' });
      extractTextFromDocx.mockResolvedValue({
        fullText: 'Extracted text',
        wordCount: 2,
        structuredContent: [],
        extractedAt: new Date(),
        extractionDurationMs: 100
      });
      LectureDocument.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockDoc)
      });

      const formData = new FormData();
      const file = new File(['mock-content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      formData.append('file', file);
      formData.append('lessonId', mockLessonId);
      formData.append('courseId', mockCourseId);

      const result = await uploadLectureDocument(formData);
      
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ready');
    });
  });
});
