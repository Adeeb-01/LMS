import mongoose from 'mongoose';
import { OralAssessment } from '@/model/oral-assessment.model';
import { StudentResponse } from '@/model/student-response.model';
import { getLoggedInUser } from '@/lib/loggedin-user';
import { hasEnrollmentForCourse } from '@/queries/enrollments';
import { submitOralResponse, getAssessmentPoints } from '@/app/actions/oral-assessment';
import { computeSemanticSimilarity } from '@/lib/ai/semantic-similarity';
import { analyzeConceptCoverage } from '@/lib/ai/concept-coverage';

// Mock dependencies
jest.mock('@/service/mongo', () => ({
    dbConnect: jest.fn().mockResolvedValue(true)
}));

jest.mock('@/lib/loggedin-user', () => ({
    getLoggedInUser: jest.fn()
}));

jest.mock('@/queries/enrollments', () => ({
    hasEnrollmentForCourse: jest.fn()
}));

jest.mock('@/model/oral-assessment.model', () => ({
    OralAssessment: {
        find: jest.fn(),
        findById: jest.fn(),
        create: jest.fn()
    }
}));

jest.mock('@/model/student-response.model', () => ({
    StudentResponse: {
        create: jest.fn(),
        findOne: jest.fn()
    }
}));

jest.mock('@/lib/ai/semantic-similarity', () => ({
    computeSemanticSimilarity: jest.fn()
}));

jest.mock('@/lib/ai/concept-coverage', () => ({
    analyzeConceptCoverage: jest.fn()
}));

describe('Oral Assessment Integration Flow', () => {
    const mockUser = { id: new mongoose.Types.ObjectId().toString(), role: 'student' };
    const mockCourseId = new mongoose.Types.ObjectId().toString();
    const mockLessonId = new mongoose.Types.ObjectId().toString();
    const mockAssessmentId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
        getLoggedInUser.mockResolvedValue(mockUser);
        hasEnrollmentForCourse.mockResolvedValue(true);
    });

    describe('submitOralResponse', () => {
        it('should fail if user is not enrolled', async () => {
            hasEnrollmentForCourse.mockResolvedValue(false);
            
            const result = await submitOralResponse({
                assessmentId: mockAssessmentId,
                lessonId: mockLessonId,
                courseId: mockCourseId,
                transcription: 'Paris is the capital',
                inputMethod: 'voice',
                attemptNumber: 1
            });

            expect(result.ok).toBe(false);
            expect(result.error).toContain('enrolled');
        });

        it('should successfully submit and evaluate a response', async () => {
            const mockAssessment = {
                _id: mockAssessmentId,
                courseId: mockCourseId,
                referenceAnswer: 'The capital of France is Paris.',
                keyConcepts: ['Paris', 'capital', 'France'],
                passingThreshold: 0.6
            };

            OralAssessment.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockAssessment)
            });

            computeSemanticSimilarity.mockResolvedValue(0.8);
            analyzeConceptCoverage.mockResolvedValue({
                addressed: ['Paris', 'capital'],
                missing: ['France']
            });

            StudentResponse.create.mockResolvedValue({
                _id: new mongoose.Types.ObjectId()
            });

            const result = await submitOralResponse({
                assessmentId: mockAssessmentId,
                lessonId: mockLessonId,
                courseId: mockCourseId,
                transcription: 'Paris is the capital',
                inputMethod: 'voice',
                attemptNumber: 1
            });

            expect(result.ok).toBe(true);
            expect(result.result.passed).toBe(true);
            expect(result.result.similarityScore).toBe(0.8);
            expect(result.result.conceptsCovered).toContain('Paris');
            expect(StudentResponse.create).toHaveBeenCalled();
        });
    });

    describe('getAssessmentPoints', () => {
        it('should return assessments for a lesson', async () => {
            const mockAssessments = [
                {
                    _id: mockAssessmentId,
                    courseId: mockCourseId,
                    questionText: 'What is the capital of France?',
                    triggerTimestamp: 10,
                    passingThreshold: 0.6
                }
            ];

            OralAssessment.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockAssessments)
                })
            });

            const result = await getAssessmentPoints(mockLessonId);

            expect(result.ok).toBe(true);
            expect(result.assessments).toHaveLength(1);
            expect(result.assessments[0].questionText).toBe('What is the capital of France?');
        });
    });
});
