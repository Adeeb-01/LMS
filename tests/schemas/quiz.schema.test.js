import { quizSchema } from '../../lib/validations';

describe('Quiz Schema Validation (Adaptive)', () => {
  const baseQuiz = {
    title: 'Adaptive Test Quiz',
    description: 'Testing adaptive config validation'
  };
  
  test('Valid adaptive configuration passes', () => {
    const quiz = {
      ...baseQuiz,
      adaptiveConfig: {
        enabled: true,
        precisionThreshold: 0.25,
        minQuestions: 5,
        maxQuestions: 20,
        initialTheta: 0.0
      }
    };
    const result = quizSchema.safeParse(quiz);
    expect(result.success).toBe(true);
  });
  
  test('Default values are applied when adaptiveConfig is partial', () => {
    const quiz = {
      ...baseQuiz,
      adaptiveConfig: {
        enabled: true
      }
    };
    const result = quizSchema.safeParse(quiz);
    expect(result.success).toBe(true);
    expect(result.data.adaptiveConfig.precisionThreshold).toBe(0.30);
    expect(result.data.adaptiveConfig.minQuestions).toBe(5);
  });
  
  test('Fails when minQuestions > maxQuestions', () => {
    const quiz = {
      ...baseQuiz,
      adaptiveConfig: {
        enabled: true,
        minQuestions: 15,
        maxQuestions: 10
      }
    };
    const result = quizSchema.safeParse(quiz);
    expect(result.success).toBe(false);
  });
  
  test('Content balancing weights validation', () => {
    const quiz = {
      ...baseQuiz,
      adaptiveConfig: {
        enabled: true,
        contentBalancing: {
          enabled: true,
          moduleWeights: [
            { moduleId: 'mod1', weight: 0.5 },
            { moduleId: 'mod2', weight: 0.8 }
          ]
        }
      }
    };
    const result = quizSchema.safeParse(quiz);
    expect(result.success).toBe(true);
  });
  
  test('Fails on invalid weight values', () => {
    const quiz = {
      ...baseQuiz,
      adaptiveConfig: {
        contentBalancing: {
          moduleWeights: [{ moduleId: 'mod1', weight: 1.5 }]
        }
      }
    };
    const result = quizSchema.safeParse(quiz);
    expect(result.success).toBe(false);
  });
});
