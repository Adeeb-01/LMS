/**
 * @jest-environment node
 */
import { getLectureDocumentByLesson } from '@/app/actions/lecture-document';
import { LectureDocument } from '@/model/lecture-document.model';
import { getCollection } from '@/service/chroma';
import { uploadLectureDocument } from '@/app/actions/lecture-document';
import { deleteLectureDocument } from '@/app/actions/lecture-document';
import { indexLectureDocument, unindexLectureDocument } from '@/service/lecture-document-search';

// Mock dependencies
jest.mock('@/model/lecture-document.model');
jest.mock('@/model/lesson.model');
jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(true)
}));
jest.mock('@/service/chroma');
jest.mock('@/service/lecture-document-search');
jest.mock('@/lib/loggedin-user', () => ({
  getLoggedInUser: jest.fn().mockResolvedValue({ id: 'user1', role: 'instructor' })
}));
jest.mock('@/lib/authorization', () => ({
  verifyInstructorOwnsCourse: jest.fn().mockResolvedValue(true),
  assertInstructorOwnsCourse: jest.fn().mockResolvedValue(true),
  isAdmin: jest.fn().mockReturnValue(false)
}));
jest.mock('@/service/lecture-document-search', () => ({
  indexLectureDocument: jest.fn().mockResolvedValue(true),
  unindexLectureDocument: jest.fn().mockResolvedValue(true)
}));
jest.mock('@/lib/docx/extractor', () => ({
  extractTextFromDocx: jest.fn().mockResolvedValue({
    fullText: 'This is a long text that should be chunked and indexed. '.repeat(100),
    wordCount: 1000,
    structuredContent: []
  })
}));
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockResolvedValue((key) => key)
}));

describe('Lecture Document Search Integration', () => {
  const mockCollection = {
    add: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue({ ids: [] })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getCollection.mockResolvedValue(mockCollection);
  });

  it('should index document in ChromaDB after successful upload', async () => {
    const mockFile = new File(['mock content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('lessonId', 'lesson1');
    formData.append('courseId', 'course1');

    LectureDocument.findOne.mockResolvedValue(null);
    LectureDocument.create.mockResolvedValue({
      _id: 'doc1',
      lessonId: 'lesson1',
      courseId: 'course1',
      status: 'uploading',
      save: jest.fn().mockResolvedValue(true)
    });
    LectureDocument.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'doc1',
        lessonId: 'lesson1',
        courseId: 'course1',
        status: 'ready',
        extractedText: {
          fullText: 'Sample text',
          wordCount: 100,
          structuredContent: []
        }
      })
    });

    const result = await uploadLectureDocument(formData);

    expect(result.success).toBe(true);
    expect(indexLectureDocument).toHaveBeenCalled();
    const callArgs = indexLectureDocument.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      _id: 'doc1',
      lessonId: 'lesson1',
      courseId: 'course1'
    });
  });

  it('should remove document from ChromaDB after deletion', async () => {
    LectureDocument.findById.mockResolvedValue({
      _id: 'doc1',
      courseId: 'course1',
      lessonId: 'lesson1',
      deleteOne: jest.fn().mockResolvedValue(true)
    });

    const result = await deleteLectureDocument('doc1');

    expect(result.success).toBe(true);
    expect(unindexLectureDocument).toHaveBeenCalledWith('doc1');
  });
});
