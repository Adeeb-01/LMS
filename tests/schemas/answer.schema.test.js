import { assessmentAnswerSchema } from '@/lib/validations';

describe('Assessment Answer Zod Schema', () => {
  test('should allow valid multiple choice answer', () => {
    const validMC = {
      questionId: '65f1a2b3c4d5e6f7a8b9c0d1',
      selectedOptionIds: ['opt1']
    };
    const result = assessmentAnswerSchema.safeParse(validMC);
    expect(result.success).toBe(true);
  });

  test('should allow valid oral answer with audioUrl', () => {
    const validOral = {
      questionId: '65f1a2b3c4d5e6f7a8b9c0d1',
      audioUrl: 'https://example.com/audio.webm'
    };
    const result = assessmentAnswerSchema.safeParse(validOral);
    expect(result.success).toBe(true);
    expect(result.data.audioUrl).toBe(validOral.audioUrl);
  });

  test('should allow oral answer marked as skipped due to mic', () => {
    const skippedOral = {
      questionId: '65f1a2b3c4d5e6f7a8b9c0d1',
      skippedDueToMic: true
    };
    const result = assessmentAnswerSchema.safeParse(skippedOral);
    expect(result.success).toBe(true);
    expect(result.data.skippedDueToMic).toBe(true);
  });

  test('should fail if audioUrl is invalid URL', () => {
    const invalidOral = {
      questionId: '65f1a2b3c4d5e6f7a8b9c0d1',
      audioUrl: 'not-a-url'
    };
    const result = assessmentAnswerSchema.safeParse(invalidOral);
    expect(result.success).toBe(false);
  });

  test('should fail if questionId is missing', () => {
    const invalidData = {
      selectedOptionIds: ['opt1']
    };
    const result = assessmentAnswerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
