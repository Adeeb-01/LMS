/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { startAdaptiveAttempt, submitAdaptiveAnswer, getAdaptiveResult } from '@/app/actions/adaptive-quiz';
import { Quiz } from '@/model/quizv2-model';
import { Attempt } from '@/model/attemptv2-model';
import { Question } from '@/model/questionv2-model';
import { Enrollment } from '@/model/enrollment-model';
import * as loggedInUser from '@/lib/loggedin-user';

// Mock DB connection
jest.mock('@/service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

// Mock logged in user
jest.mock('@/lib/loggedin-user', () => ({
  getLoggedInUser: jest.fn(),
}));

describe('Adaptive Quiz Integration Tests', () => {
  const studentId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const quizId = new mongoose.Types.ObjectId();
  const deviceId = 'test-device-uuid';
  
  let questions = [];

  beforeAll(async () => {
    // Create 10 dummy questions with IRT parameters
    for (let i = 0; i < 10; i++) {
      questions.push({
        _id: new mongoose.Types.ObjectId(),
        type: 'multiple_choice',
        text: `Question ${i}`,
        options: [
          { id: '1', text: 'Opt 1' },
          { id: '2', text: 'Opt 2' }
        ],
        correctOptionIds: ['1'],
        irt: {
          a: 1.0,
          b: (i - 5) / 2, // Range from -2.5 to 2.0
          c: 0.0
        }
      });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    loggedInUser.getLoggedInUser.mockResolvedValue({
      id: studentId.toString(),
      role: 'student'
    });
    
    // Default mock behavior for models
    jest.spyOn(Quiz, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: quizId,
        courseId,
        published: true,
        adaptiveConfig: {
          enabled: true,
          precisionThreshold: 0.3,
          minQuestions: 2,
          maxQuestions: 5,
          initialTheta: 0.0
        }
      })
    });

    jest.spyOn(Enrollment, 'findOne').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      student: studentId,
      course: courseId
    });

    jest.spyOn(Question, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue(questions)
    });

    jest.spyOn(Attempt, 'findOne').mockResolvedValue(null);
    jest.spyOn(Attempt, 'create').mockImplementation((data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
      save: jest.fn().mockResolvedValue(this)
    }));
  });

  it('should start a new adaptive attempt and return first question', async () => {
    const result = await startAdaptiveAttempt(quizId.toString(), deviceId);
    
    expect(result.success).toBe(true);
    expect(result.data.attemptId).toBeDefined();
    expect(result.data.currentQuestion).toBeDefined();
    expect(result.data.currentTheta).toBe(0.0);
    expect(result.data.isResumed).toBe(false);
  });

  it('should resume an existing attempt with same deviceId', async () => {
    const attemptId = new mongoose.Types.ObjectId();
    jest.spyOn(Attempt, 'findOne').mockResolvedValue({
      _id: attemptId,
      status: 'in_progress',
      adaptive: {
        activeDeviceId: deviceId,
        questionOrder: [questions[0]._id]
      }
    });
    
    // Mock last question lookup
    jest.spyOn(Question, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue(questions[0])
    });

    const result = await startAdaptiveAttempt(quizId.toString(), deviceId);
    
    expect(result.success).toBe(true);
    expect(result.data.attemptId).toBe(attemptId.toString());
    expect(result.data.isResumed).toBe(true);
  });

  it('should block resume if deviceId mismatch', async () => {
    jest.spyOn(Attempt, 'findOne').mockResolvedValue({
      status: 'in_progress',
      adaptive: {
        activeDeviceId: 'other-device'
      }
    });

    await expect(startAdaptiveAttempt(quizId.toString(), deviceId))
      .rejects.toThrow('Active session on another device');
  });

  it('should process answers and eventually terminate', async () => {
    // 1. Start
    const startRes = await startAdaptiveAttempt(quizId.toString(), deviceId);
    const attemptId = startRes.data.attemptId;
    const q1Id = startRes.data.currentQuestion.id;

    // Mock Attempt.findById for submission
    const mockAttempt = {
      _id: attemptId,
      quizId,
      studentId,
      status: 'in_progress',
      answers: [],
      adaptive: {
        enabled: true,
        currentTheta: 0.0,
        currentSE: null,
        activeDeviceId: deviceId,
        questionOrder: [new mongoose.Types.ObjectId(q1Id)],
        thetaHistory: []
      },
      save: jest.fn().mockResolvedValue(this)
    };
    jest.spyOn(Attempt, 'findById').mockResolvedValue(mockAttempt);
    jest.spyOn(Question, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue(questions.find(q => q._id.toString() === q1Id))
    });

    // 2. Submit first answer
    const subRes = await submitAdaptiveAnswer(attemptId, q1Id, ['1'], deviceId);
    
    expect(subRes.success).toBe(true);
    expect(subRes.data.status).toBe('continuing');
    expect(subRes.data.nextQuestion).toBeDefined();
    expect(mockAttempt.adaptive.thetaHistory).toHaveLength(1);

    // 3. Mock termination on second answer (precision achieved)
    // We'll mock the internal SE calculation to be low
    // For simplicity in this test, we can just check if termination logic triggers when maxQuestions reached
    mockAttempt.adaptive.questionOrder.push(new mongoose.Types.ObjectId(subRes.data.nextQuestion.id));
    
    // Simulate answering enough to hit maxQuestions
    mockAttempt.answers.length = 4; 
    
    const finalSubRes = await submitAdaptiveAnswer(attemptId, subRes.data.nextQuestion.id, ['1'], deviceId);
    expect(finalSubRes.data.status).toBe('terminated');
    expect(finalSubRes.data.terminationReason).toBeDefined();
  });
});
