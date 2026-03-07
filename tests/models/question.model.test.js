import mongoose from 'mongoose';
import { Question } from '@/model/questionv2-model';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Question Model (IRT Parameters)', () => {
  const validQuestion = {
    quizId: new mongoose.Types.ObjectId(),
    type: 'single',
    text: 'What is the capital of France?',
    options: [
      { id: '1', text: 'Paris' },
      { id: '2', text: 'London' }
    ],
    correctOptionIds: ['1'],
    order: 0
  };

  test('should create a question with default IRT parameters', async () => {
    const question = await Question.create(validQuestion);
    expect(question.irt).toBeDefined();
    expect(question.irt.a).toBe(1.0);
    expect(question.irt.b).toBe(0.0);
    expect(question.irt.c).toBe(0.0);
  });

  test('should allow setting custom IRT parameters', async () => {
    const questionData = {
      ...validQuestion,
      irt: {
        a: 2.0,
        b: 1.5,
        c: 0.2
      }
    };
    const question = await Question.create(questionData);
    expect(question.irt.a).toBe(2.0);
    expect(question.irt.b).toBe(1.5);
    expect(question.irt.c).toBe(0.2);
  });
});
