import { transcribeAudio } from '@/lib/ai/transcription';
import { evaluateOralAnswer } from '@/lib/ai/evaluation';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
  SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER' },
}));

global.fetch = jest.fn();

describe('AI Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transcribeAudio (Gemini)', () => {
    it('should return transcribed text from Gemini', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Hello world' },
      });

      const mockStream = {
        getReader: jest.fn().mockReturnValue({
          read: jest.fn()
            .mockResolvedValueOnce({ done: false, value: Buffer.from('audio data') })
            .mockResolvedValueOnce({ done: true }),
        }),
      };

      global.fetch.mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      const result = await transcribeAudio('https://example.com/audio.webm');
      expect(result).toBe('Hello world');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/audio.webm');
    });

    it('should return empty string for falsy URL', async () => {
      const result = await transcribeAudio('');
      expect(result).toBe('');
    });
  });

  describe('evaluateOralAnswer (Gemini)', () => {
    it('should return score and feedback from Gemini', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({ score: 85, feedback: 'Good job' }) },
      });

      const result = await evaluateOralAnswer('Hello world', 'Hello world');
      expect(result).toEqual({ score: 85, feedback: 'Good job' });
    });

    it('should return zero score when inputs are missing', async () => {
      const result = await evaluateOralAnswer('', 'Hello world');
      expect(result.score).toBe(0);
    });
  });
});
