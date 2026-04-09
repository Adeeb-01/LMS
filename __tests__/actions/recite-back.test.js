import mongoose from 'mongoose';
import { ReciteBackAttempt } from '@/model/recite-back-attempt.model';
import { ConceptGap } from '@/model/concept-gap.model';
import { TutorInteraction } from '@/model/tutor-interaction.model';
import { getLoggedInUser } from '@/lib/loggedin-user';
import { submitReciteBack } from '@/app/actions/rag-tutor';
import { computeSemanticSimilarity } from '@/lib/ai/semantic-similarity';

// Mock dependencies
jest.mock('@/service/mongo', () => ({
    dbConnect: jest.fn().mockResolvedValue(true)
}));

jest.mock('@/lib/loggedin-user', () => ({
    getLoggedInUser: jest.fn()
}));

jest.mock('@/model/recite-back-attempt.model', () => ({
    ReciteBackAttempt: {
        create: jest.fn(),
        countDocuments: jest.fn()
    }
}));

jest.mock('@/model/concept-gap.model', () => ({
    ConceptGap: {
        findOneAndUpdate: jest.fn(),
        create: jest.fn()
    }
}));

jest.mock('@/model/tutor-interaction.model', () => ({
    TutorInteraction: {
        findById: jest.fn()
    }
}));

jest.mock('@/lib/ai/semantic-similarity', () => ({
    computeSemanticSimilarity: jest.fn()
}));

describe('Recite-Back Integration Flow', () => {
    const mockUser = { id: new mongoose.Types.ObjectId().toString(), role: 'student' };
    const mockInteractionId = new mongoose.Types.ObjectId().toString();
    const mockLessonId = new mongoose.Types.ObjectId().toString();
    const mockCourseId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
        getLoggedInUser.mockResolvedValue(mockUser);
    });

    describe('submitReciteBack', () => {
        it('should fail if interaction not found', async () => {
            TutorInteraction.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null)
            });

            const result = await submitReciteBack({
                interactionId: mockInteractionId,
                lessonId: mockLessonId,
                recitation: 'The mitochondria is the powerhouse',
                inputMethod: 'voice',
                attemptNumber: 1
            });

            expect(result.ok).toBe(false);
            expect(result.error).toContain('Interaction not found');
        });

        it('should successfully submit and evaluate a recitation (pass)', async () => {
            const mockInteraction = {
                _id: mockInteractionId,
                userId: mockUser.id,
                lessonId: mockLessonId,
                courseId: mockCourseId,
                response: 'Mitochondria are the powerhouses of the cell.'
            };

            TutorInteraction.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockInteraction)
            });

            computeSemanticSimilarity.mockResolvedValue(0.8);
            ReciteBackAttempt.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

            const result = await submitReciteBack({
                interactionId: mockInteractionId,
                lessonId: mockLessonId,
                recitation: 'Mitochondria are powerhouses',
                inputMethod: 'voice',
                attemptNumber: 1
            });

            expect(result.ok).toBe(true);
            expect(result.result.passed).toBe(true);
            expect(result.result.similarityScore).toBe(0.8);
            expect(ReciteBackAttempt.create).toHaveBeenCalled();
            expect(ConceptGap.findOneAndUpdate).not.toHaveBeenCalled();
        });

        it('should log a concept gap when max attempts reached and failed', async () => {
            const mockInteraction = {
                _id: mockInteractionId,
                userId: mockUser.id,
                lessonId: mockLessonId,
                courseId: mockCourseId,
                response: 'The process of photosynthesis converts light to energy.',
                question: 'How does photosynthesis work?'
            };

            TutorInteraction.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockInteraction)
            });

            computeSemanticSimilarity.mockResolvedValue(0.3);
            ReciteBackAttempt.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
            ConceptGap.findOneAndUpdate.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

            const result = await submitReciteBack({
                interactionId: mockInteractionId,
                lessonId: mockLessonId,
                recitation: 'I do not know',
                inputMethod: 'voice',
                attemptNumber: 3 // Max attempts
            });

            expect(result.ok).toBe(true);
            expect(result.result.passed).toBe(false);
            expect(ConceptGap.findOneAndUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: new mongoose.Types.ObjectId(mockUser.id),
                    concept: mockInteraction.response
                }),
                expect.any(Object),
                expect.any(Object)
            );
        });
    });
});
