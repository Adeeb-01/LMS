import { transcribeAudio } from '@/lib/ai/transcription';
import { evaluateOralAnswer } from '@/lib/ai/evaluation';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

// Mock global fetch
global.fetch = jest.fn();

describe('AI Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transcribeAudio', () => {
    it('should return transcribed text from Whisper', async () => {
      const mockTranscription = { text: 'Hello world' };
      const createMock = jest.fn().mockResolvedValue(mockTranscription);
      
      OpenAI.prototype.audio = {
        transcriptions: {
          create: createMock
        }
      };

      // Mock fetch response with a reader
      const mockStream = {
        getReader: jest.fn().mockReturnValue({
          read: jest.fn()
            .mockResolvedValueOnce({ done: false, value: Buffer.from('audio data') })
            .mockResolvedValueOnce({ done: true })
        })
      };

      global.fetch.mockResolvedValue({
        ok: true,
        body: mockStream
      });

      const result = await transcribeAudio('https://example.com/audio.webm');
      expect(result).toBe('Hello world');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/audio.webm');
    });

    it('should throw error if transcription fails', async () => {
      const createMock = jest.fn().mockRejectedValue(new Error('OpenAI Error'));
      
      OpenAI.prototype.audio = {
        transcriptions: {
          create: createMock
        }
      };

      // Mock fetch response
      const mockStream = {
        getReader: jest.fn().mockReturnValue({
          read: jest.fn().mockResolvedValue({ done: true })
        })
      };

      global.fetch.mockResolvedValue({
        ok: true,
        body: mockStream
      });

      await expect(transcribeAudio('https://example.com/audio.webm')).rejects.toThrow('OpenAI Error');
    });
  });

  describe('evaluateOralAnswer', () => {
    it('should return score and feedback from GPT', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ score: 85, feedback: 'Good job' })
            }
          }
        ]
      };
      const createMock = jest.fn().mockResolvedValue(mockResponse);
      
      OpenAI.prototype.chat = {
        completions: {
          create: createMock
        }
      };

      const result = await evaluateOralAnswer('Hello world', 'Hello world');
      expect(result).toEqual({ score: 85, feedback: 'Good job' });
    });

    it('should handle non-JSON response from GPT gracefully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Just text feedback without JSON'
            }
          }
        ]
      };
      const createMock = jest.fn().mockResolvedValue(mockResponse);
      
      OpenAI.prototype.chat = {
        completions: {
          create: createMock
        }
      };

      const result = await evaluateOralAnswer('Hello world', 'Hello world');
      expect(result.score).toBeDefined();
      expect(result.feedback).toBe('Just text feedback without JSON');
    });
  });
});
