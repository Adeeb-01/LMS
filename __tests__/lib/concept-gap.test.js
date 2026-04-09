import mongoose from 'mongoose';
import { ConceptGap } from '@/model/concept-gap.model';
import { getLoggedInUser } from '@/lib/loggedin-user';
import { getConceptGapSummary } from '@/app/actions/oral-assessment';

// Mock dependencies
jest.mock('@/service/mongo', () => ({
    dbConnect: jest.fn().mockResolvedValue(true)
}));

jest.mock('@/lib/loggedin-user', () => ({
    getLoggedInUser: jest.fn()
}));

jest.mock('@/model/concept-gap.model', () => ({
    ConceptGap: {
        find: jest.fn()
    }
}));

describe('Concept Gap Logging Unit Tests', () => {
    const mockUser = { id: new mongoose.Types.ObjectId().toString(), role: 'student' };
    const mockLessonId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
        getLoggedInUser.mockResolvedValue(mockUser);
    });

    describe('getConceptGapSummary', () => {
        it('should return concept gaps for a user in a lesson', async () => {
            const mockGaps = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    concept: 'Photosynthesis',
                    failureCount: 3,
                    source: 'recite_back'
                }
            ];

            ConceptGap.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockGaps)
            });

            const result = await getConceptGapSummary(mockLessonId);

            expect(result.ok).toBe(true);
            expect(result.gaps).toHaveLength(1);
            expect(result.gaps[0].concept).toBe('Photosynthesis');
        });

        it('should fail if user not logged in', async () => {
            getLoggedInUser.mockResolvedValue(null);

            const result = await getConceptGapSummary(mockLessonId);

            expect(result.ok).toBe(false);
            expect(result.error).toContain('Unauthorized');
        });
    });
});
