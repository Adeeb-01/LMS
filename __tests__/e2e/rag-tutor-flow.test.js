import { submitOralResponse } from '@/app/actions/oral-assessment';
import { askTutor, submitReciteBack } from '@/app/actions/rag-tutor';
import { OralAssessment } from '@/model/oral-assessment.model';
import { TutorInteraction } from '@/model/tutor-interaction.model';
import { StudentResponse } from '@/model/student-response.model';
import { ReciteBackAttempt } from '@/model/recite-back-attempt.model';
import { ConceptGap } from '@/model/concept-gap.model';
import { getLoggedInUser } from '@/lib/loggedin-user';
import { hasEnrollmentForCourse } from '@/queries/enrollments';
import { searchCourse } from '@/service/semantic-search';
import { generateGroundedResponse } from '@/lib/rag/tutor-response';
import { computeSemanticSimilarity } from '@/lib/ai/semantic-similarity';
import { analyzeConceptCoverage } from '@/lib/ai/concept-coverage';
import mongoose from 'mongoose';

// Mock all external dependencies
jest.mock('@/service/mongo', () => ({ dbConnect: jest.fn() }));
jest.mock('@/lib/loggedin-user', () => ({ getLoggedInUser: jest.fn() }));
jest.mock('@/queries/enrollments', () => ({ hasEnrollmentForCourse: jest.fn() }));
jest.mock('@/service/semantic-search', () => ({ searchCourse: jest.fn() }));
jest.mock('@/lib/rag/tutor-response', () => ({ generateGroundedResponse: jest.fn() }));
jest.mock('@/lib/ai/semantic-similarity', () => ({ computeSemanticSimilarity: jest.fn() }));
jest.mock('@/lib/ai/concept-coverage', () => ({ analyzeConceptCoverage: jest.fn() }));

// Mock Models
jest.mock('@/model/oral-assessment.model', () => ({ OralAssessment: { findById: jest.fn() } }));
jest.mock('@/model/tutor-interaction.model', () => ({ TutorInteraction: { create: jest.fn(), findById: jest.fn(), countDocuments: jest.fn() } }));
jest.mock('@/model/student-response.model', () => ({ StudentResponse: { create: jest.fn() } }));
jest.mock('@/model/recite-back-attempt.model', () => ({ ReciteBackAttempt: { create: jest.fn() } }));
jest.mock('@/model/concept-gap.model', () => ({ ConceptGap: { findOneAndUpdate: jest.fn() } }));

describe('Full RAG Tutor Flow E2E (Simulated)', () => {
  const mockUser = { id: new mongoose.Types.ObjectId().toString(), role: 'student' };
  const mockCourseId = new mongoose.Types.ObjectId().toString();
  const mockLessonId = new mongoose.Types.ObjectId().toString();
  const mockAssessmentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    getLoggedInUser.mockResolvedValue(mockUser);
    hasEnrollmentForCourse.mockResolvedValue(true);
  });

  it('should complete the full assessment -> tutor -> recite-back flow', async () => {
    // 1. Student answers an oral assessment
    const mockAssessment = {
      _id: mockAssessmentId,
      referenceAnswer: 'The mitochondria is the powerhouse of the cell.',
      keyConcepts: ['mitochondria', 'powerhouse'],
      passingThreshold: 0.6
    };
    OralAssessment.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockAssessment) });
    computeSemanticSimilarity.mockResolvedValue(0.8);
    analyzeConceptCoverage.mockResolvedValue({ addressed: ['mitochondria', 'powerhouse'], missing: [] });
    StudentResponse.create.mockResolvedValue({ _id: 'res-1' });

    const assessmentResult = await submitOralResponse({
      assessmentId: mockAssessmentId,
      lessonId: mockLessonId,
      courseId: mockCourseId,
      transcription: 'Mitochondria is the powerhouse of cells.',
      inputMethod: 'voice',
      attemptNumber: 1
    });

    expect(assessmentResult.ok).toBe(true);
    expect(assessmentResult.result.passed).toBe(true);

    // 2. Student asks a follow-up question to the tutor
    const mockTutorResponse = {
      response: 'Mitochondria produce ATP through cellular respiration.',
      isGrounded: true,
      timestampLinks: [{ seconds: 120, label: 'Cellular Respiration' }]
    };
    searchCourse.mockResolvedValue({ ok: true, results: [{ text: 'ATP production in mitochondria', score: 0.9 }] });
    generateGroundedResponse.mockResolvedValue(mockTutorResponse);
    TutorInteraction.countDocuments.mockResolvedValue(0);
    const mockInteractionId = new mongoose.Types.ObjectId();
    TutorInteraction.create.mockResolvedValue({ _id: mockInteractionId, reciteBackRequired: true });

    const tutorResult = await askTutor({
      question: 'How does it produce energy?',
      lessonId: mockLessonId,
      courseId: mockCourseId,
      inputMethod: 'text'
    });

    expect(tutorResult.ok).toBe(true);
    expect(tutorResult.result.reciteBackRequired).toBe(true);

    // 3. Student recites back the tutor's explanation
    TutorInteraction.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({
      _id: mockInteractionId,
      userId: mockUser.id,
      courseId: mockCourseId,
      response: mockTutorResponse.response
    })});
    computeSemanticSimilarity.mockResolvedValue(0.7); // Pass
    ReciteBackAttempt.create.mockResolvedValue({ _id: 'attempt-1' });

    const reciteResult = await submitReciteBack({
      interactionId: mockInteractionId.toString(),
      lessonId: mockLessonId,
      recitation: 'It produces ATP via respiration.',
      inputMethod: 'voice',
      attemptNumber: 1
    });

    expect(reciteResult.ok).toBe(true);
    expect(reciteResult.result.passed).toBe(true);
  });
});
