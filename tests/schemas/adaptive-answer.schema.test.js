import { adaptiveAnswerSchema } from '../../lib/validations';

describe('Adaptive Answer Schema Validation', () => {
  const baseAnswer = {
    attemptId: 'att-123',
    questionId: 'que-123',
    selectedOptionIds: ['opt-1'],
    deviceId: 'dev-123'
  };
  
  test('Valid adaptive answer passes', () => {
    const result = adaptiveAnswerSchema.safeParse(baseAnswer);
    expect(result.success).toBe(true);
  });
  
  test('Fails on missing attemptId', () => {
    const { attemptId, ...rest } = baseAnswer;
    const result = adaptiveAnswerSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
  
  test('Fails on invalid selectedOptionIds', () => {
    const invalid = {
      ...baseAnswer,
      selectedOptionIds: 'not-an-array'
    };
    const result = adaptiveAnswerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
  
  test('Fails on missing deviceId', () => {
    const { deviceId, ...rest } = baseAnswer;
    const result = adaptiveAnswerSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
