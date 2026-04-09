/**
 * @jest-environment node
 */
import { PUT, DELETE } from '../../app/api/lecture-documents/[id]/route';
import { replaceLectureDocument, deleteLectureDocument } from '../../app/actions/lecture-document';
import { LectureDocument } from '../../model/lecture-document.model';
import { Lesson } from '../../model/lesson.model';
import { extractTextFromDocx } from '../../lib/docx/extractor';
import { getLoggedInUser } from '../../lib/loggedin-user';
import { verifyInstructorOwnsCourse } from '../../lib/authorization';

// Mock everything
jest.mock('../../model/lecture-document.model');
jest.mock('../../model/lesson.model');
jest.mock('../../lib/docx/extractor');
jest.mock('../../lib/loggedin-user');
jest.mock('../../lib/authorization');
jest.mock('../../service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(true)
}));
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockReturnValue(Promise.resolve((key) => key))
}));
jest.mock('../../auth', () => ({
  auth: jest.fn()
}));

describe('Lecture Document Replacement and Deletion Integration Tests', () => {
  const mockUser = { id: '507f1f77bcf86cd799439011', role: 'instructor' };
  const mockDocId = '507f1f77bcf86cd799439014';
  const mockCourseId = '507f1f77bcf86cd799439012';
  const mockLessonId = '507f1f77bcf86cd799439013';

  const mockDoc = {
    _id: mockDocId,
    lessonId: mockLessonId,
    courseId: mockCourseId,
    status: 'ready',
    originalFilename: 'old.docx'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/lecture-documents/[id]', () => {
    it('should successfully replace document via API', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      verifyInstructorOwnsCourse.mockResolvedValue(true);
      LectureDocument.findById.mockResolvedValue(mockDoc);
      
      const newDoc = { ...mockDoc, originalFilename: 'new.docx' };
      LectureDocument.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue(newDoc)
      });
      extractTextFromDocx.mockResolvedValue({
        fullText: 'New text',
        wordCount: 2,
        structuredContent: [],
        extractedAt: new Date(),
        extractionDurationMs: 50
      });

      const formData = new FormData();
      const file = new Blob(['new-content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      formData.append('file', file, 'new.docx');

      const request = new Request(`http://localhost/api/lecture-documents/${mockDocId}`, {
        method: 'PUT',
        body: formData,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: mockDocId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.originalFilename).toBe('new.docx');
    });
  });

  describe('DELETE /api/lecture-documents/[id]', () => {
    it('should successfully delete document via API', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      verifyInstructorOwnsCourse.mockResolvedValue(true);
      LectureDocument.findById.mockResolvedValue(mockDoc);
      LectureDocument.findByIdAndDelete.mockResolvedValue(mockDoc);
      Lesson.findOneAndUpdate.mockResolvedValue({});

      const request = new Request(`http://localhost/api/lecture-documents/${mockDocId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: mockDocId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('replaceLectureDocument Server Action', () => {
    it('should successfully replace document', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      verifyInstructorOwnsCourse.mockResolvedValue(true);
      LectureDocument.findById.mockResolvedValue(mockDoc);
      
      const newDoc = { ...mockDoc, status: 'ready' };
      LectureDocument.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue(newDoc)
      });
      extractTextFromDocx.mockResolvedValue({
        fullText: 'New text',
        wordCount: 2,
        structuredContent: [],
        extractedAt: new Date(),
        extractionDurationMs: 50
      });

      const formData = new FormData();
      const file = new File(['new-content'], 'new.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      formData.append('file', file);

      const result = await replaceLectureDocument(mockDocId, formData);
      
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ready');
    });
  });

  describe('deleteLectureDocument Server Action', () => {
    it('should successfully delete document', async () => {
      getLoggedInUser.mockResolvedValue(mockUser);
      verifyInstructorOwnsCourse.mockResolvedValue(true);
      LectureDocument.findById.mockResolvedValue(mockDoc);
      LectureDocument.findByIdAndDelete.mockResolvedValue(mockDoc);

      const result = await deleteLectureDocument(mockDocId);
      
      expect(result.success).toBe(true);
    });
  });
});
