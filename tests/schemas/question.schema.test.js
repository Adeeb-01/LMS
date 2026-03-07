import { questionSchema } from '@/lib/validations';

describe('Question Zod Schema (IRT Parameters)', () => {
  const baseQuestion = {
    type: 'multiple_choice',
    text: 'What is 2+2?',
    options: [
      { id: '1', text: '3' },
      { id: '2', text: '4' }
    ],
    correctOptionIds: ['2'],
    points: 1
  };

  test('should allow valid IRT parameters', () => {
    const validData = {
      ...baseQuestion,
      irt: {
        a: 1.5,
        b: 0.5,
        c: 0.1
      }
    };
    const result = questionSchema.safeParse(validData);
    expect(result.success).toBe(true);
    expect(result.data.irt).toEqual({ a: 1.5, b: 0.5, c: 0.1 });
  });

  test('should use default IRT parameters if missing', () => {
    const result = questionSchema.safeParse(baseQuestion);
    expect(result.success).toBe(true);
    // Note: Zod defaults only apply if the field is undefined and has a .default()
    expect(result.data.irt).toEqual({ a: 1.0, b: 0.0, c: 0.0 });
  });

  test('should fail if a <= 0', () => {
    const invalidData = {
      ...baseQuestion,
      irt: { a: 0, b: 0, c: 0 }
    };
    const result = questionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('should fail if c < 0', () => {
    const invalidData = {
      ...baseQuestion,
      irt: { a: 1, b: 0, c: -0.1 }
    };
    const result = questionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('should fail if c > 1', () => {
    const invalidData = {
      ...baseQuestion,
      irt: { a: 1, b: 0, c: 1.1 }
    };
    const result = questionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
