/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { getAdaptiveQuizAnalytics } from '@/app/actions/adaptive-analytics';
import { Quiz } from '@/model/quizv2-model';
import { Attempt } from '@/model/attemptv2-model';
import { Question } from '@/model/questionv2-model';
import * as loggedInUser from '@/lib/loggedin-user';
import * as authorization from '@/lib/authorization';

// Mock DB connection
jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

// Mock logged in user and authorization
jest.mock('@/lib/loggedin-user', () => ({
  getLoggedInUser: jest.fn(),
}));

jest.mock('@/lib/authorization', () => ({
  assertInstructorOwnsCourse: jest.fn().mockResolvedValue(true),
  isAdmin: jest.fn().mockReturnValue(false),
}));

describe('Adaptive Analytics Integration Tests', () => {
  const instructorId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const quizId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    loggedInUser.getLoggedInUser.mockResolvedValue({
      id: instructorId.toString(),
      role: 'instructor'
    });
  });

  it('should aggregate analytics correctly across multiple attempts', async () => {
    // 1. Mock Quiz
    jest.spyOn(Quiz, 'findById').mockResolvedValue({
      _id: quizId,
      courseId,
      title: 'Adaptive Test Quiz'
    });

    // 2. Mock Questions
    const q1Id = new mongoose.Types.ObjectId();
    const q2Id = new mongoose.Types.ObjectId();
    const questions = [
      { _id: q1Id, text: 'Q1', irt: { a: 1.0, b: -1.0, c: 0 } },
      { _id: q2Id, text: 'Q2', irt: { a: 1.2, b: 1.0, c: 0 } }
    ];
    jest.spyOn(Question, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue(questions)
    });

    // 3. Mock Attempts
    const attempts = [
      {
        _id: new mongoose.Types.ObjectId(),
        status: 'submitted',
        adaptive: {
          enabled: true,
          currentTheta: 0.5,
          currentSE: 0.2,
          terminationReason: 'precision_achieved'
        },
        answers: [
          { questionId: q1Id, selectionMetrics: { fisherInformation: 0.5 } }
        ],
        submittedAt: new Date('2026-03-14T10:00:00Z'),
        createdAt: new Date('2026-03-14T09:50:00Z') // 10 mins duration
      },
      {
        _id: new mongoose.Types.ObjectId(),
        status: 'submitted',
        adaptive: {
          enabled: true,
          currentTheta: -0.5,
          currentSE: 0.25,
          terminationReason: 'max_reached'
        },
        answers: [
          { questionId: q1Id, selectionMetrics: { fisherInformation: 0.4 } },
          { questionId: q2Id, selectionMetrics: { fisherInformation: 0.6 } }
        ],
        submittedAt: new Date('2026-03-14T11:00:00Z'),
        createdAt: new Date('2026-03-14T10:40:00Z') // 20 mins duration
      }
    ];
    jest.spyOn(Attempt, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue(attempts)
    });

    const result = await getAdaptiveQuizAnalytics(quizId.toString());

    expect(result.success).toBe(true);
    expect(result.data.totalAttempts).toBe(2);
    expect(result.data.averageQuestionsToTermination).toBe(1.5); // (1+2)/2
    expect(result.data.terminationReasons.precision_achieved).toBe(1);
    expect(result.data.terminationReasons.max_reached).toBe(1);
    
    // Ability distribution
    expect(result.data.abilityDistribution.mean).toBe(0); // (0.5 + -0.5) / 2
    
    // Question usage
    const q1Usage = result.data.questionUsage.find(u => u.questionId === q1Id.toString());
    expect(q1Usage.timesSelected).toBe(2);
    expect(q1Usage.selectionRate).toBe(1); // 2/2
  });
});
