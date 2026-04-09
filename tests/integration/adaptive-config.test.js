/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { updateQuizAdaptiveConfig, getQuizPoolAnalysis } from '@/app/actions/quizv2';
import { Quiz } from '@/model/quizv2-model';
import { Question } from '@/model/questionv2-model';
import { Course } from '@/model/course-model';
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

describe('Adaptive Configuration Integration Tests', () => {
  const instructorId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const quizId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    loggedInUser.getLoggedInUser.mockResolvedValue({
      id: instructorId.toString(),
      role: 'instructor'
    });
    // Default mock for countDocuments to prevent timeouts
    jest.spyOn(Question, 'countDocuments').mockResolvedValue(0);
  });

  describe('updateQuizAdaptiveConfig', () => {
    it('should update valid adaptive configuration', async () => {
      const mockQuiz = {
        _id: quizId,
        courseId,
        adaptiveConfig: { enabled: false },
        save: jest.fn().mockResolvedValue(true)
      };
      jest.spyOn(Quiz, 'findById').mockResolvedValue(mockQuiz);
      jest.spyOn(Question, 'countDocuments').mockResolvedValue(100);

      const config = {
        enabled: true,
        precisionThreshold: 0.25,
        minQuestions: 10,
        maxQuestions: 40
      };

      const result = await updateQuizAdaptiveConfig(quizId.toString(), config);

      expect(result.ok).toBe(true);
      expect(mockQuiz.adaptiveConfig.enabled).toBe(true);
      expect(mockQuiz.adaptiveConfig.precisionThreshold).toBe(0.25);
      expect(mockQuiz.adaptiveConfig.minQuestions).toBe(10);
      expect(mockQuiz.adaptiveConfig.maxQuestions).toBe(40);
    });

    it('should reject invalid configuration (min > max)', async () => {
      const config = {
        enabled: true,
        minQuestions: 20,
        maxQuestions: 10
      };

      const result = await updateQuizAdaptiveConfig(quizId.toString(), config);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should return warnings if question pool is small', async () => {
      const mockQuiz = {
        _id: quizId,
        courseId,
        adaptiveConfig: { enabled: false },
        save: jest.fn().mockResolvedValue(true)
      };
      jest.spyOn(Quiz, 'findById').mockResolvedValue(mockQuiz);
      
      // Mock small pool
      jest.spyOn(Question, 'countDocuments').mockResolvedValue(5);

      const config = {
        enabled: true,
        maxQuestions: 10
      };

      const result = await updateQuizAdaptiveConfig(quizId.toString(), config);

      expect(result.ok).toBe(true);
      expect(result.warnings[0]).toContain('Question pool may be insufficient');
    });
  });

  describe('getQuizPoolAnalysis', () => {
    it('should return correct distribution and recommendations', async () => {
      jest.spyOn(Quiz, 'findById').mockResolvedValue({ _id: quizId, courseId });
      
      const mockQuestions = [
        { irt: { a: 1.6, b: -2.5, c: 0 } }, // excellent, veryEasy
        { irt: { a: 1.2, b: -1.5, c: 0 } }, // good, easy
        { irt: { a: 0.8, b: 0, c: 0 } },    // acceptable, medium
        { irt: { a: 0.4, b: 1.5, c: 0 } },  // poor, hard
        { irt: { a: 1.0, b: 2.5, c: 0 } },  // good, veryHard
        { irt: null }                      // missing IRT
      ];

      jest.spyOn(Question, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockQuestions)
      });

      const result = await getQuizPoolAnalysis(quizId.toString());

      expect(result.ok).toBe(true);
      expect(result.data.totalQuestions).toBe(6);
      expect(result.data.questionsWithIRT).toBe(5);
      expect(result.data.difficultyDistribution.veryEasy).toBe(1);
      expect(result.data.discriminationQuality.excellent).toBe(1);
      expect(result.data.discriminationQuality.poor).toBe(1);
      expect(result.data.readyForAdaptive).toBe(false); // because of poor discrimination or small pool
    });
  });
});
