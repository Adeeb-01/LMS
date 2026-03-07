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

describe('Question Model Reset Logic (IRT Parameters)', () => {
  const validQuestion = {
    quizId: new mongoose.Types.ObjectId(),
    type: 'single',
    text: 'Original question text',
    options: [
      { id: '1', text: 'Option 1' },
      { id: '2', text: 'Option 2' }
    ],
    correctOptionIds: ['1'],
    irt: {
      a: 2.0,
      b: 1.5,
      c: 0.2
    },
    order: 0
  };

  test('should reset IRT parameters when question text changes', async () => {
    const question = await Question.create(validQuestion);
    
    question.text = 'Updated question text';
    await question.save();
    
    expect(question.irt.a).toBe(1.0);
    expect(question.irt.b).toBe(0.0);
    expect(question.irt.c).toBe(0.0);
  });

  test('should reset IRT parameters when options change', async () => {
    const question = await Question.create(validQuestion);
    
    question.options = [
      { id: '1', text: 'New Option 1' },
      { id: '2', text: 'New Option 2' }
    ];
    await question.save();
    
    expect(question.irt.a).toBe(1.0);
    expect(question.irt.b).toBe(0.0);
    expect(question.irt.c).toBe(0.0);
  });

  test('should NOT reset IRT parameters when other fields change', async () => {
    const question = await Question.create(validQuestion);
    
    question.points = 10;
    await question.save();
    
    expect(question.irt.a).toBe(2.0);
    expect(question.irt.b).toBe(1.5);
    expect(question.irt.c).toBe(0.2);
  });
});
