import { generateEmbedding } from '../../lib/embeddings/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the entire module
jest.mock('@google/generative-ai', () => {
  const mockEmbedContent = jest.fn();
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        embedContent: mockEmbedContent
      })
    })),
    // Export the mock function for easy access in tests
    _mockEmbedContent: mockEmbedContent
  };
});

describe('Gemini Embeddings Service Unit Tests', () => {
  let mockEmbedContent;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmbedContent = require('@google/generative-ai')._mockEmbedContent;
  });

  it('should generate an embedding for valid text', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    mockEmbedContent.mockResolvedValue({
      embedding: { values: mockEmbedding }
    });

    const result = await generateEmbedding('Hello world');
    expect(result).toEqual(mockEmbedding);
    expect(mockEmbedContent).toHaveBeenCalledWith('Hello world');
  });

  it('should throw error for invalid input', async () => {
    await expect(generateEmbedding('')).rejects.toThrow('Text is required and must be a string');
    await expect(generateEmbedding(null)).rejects.toThrow('Text is required and must be a string');
  });

  it('should handle API errors gracefully', async () => {
    mockEmbedContent.mockRejectedValue(new Error('API Error'));
    await expect(generateEmbedding('test')).rejects.toThrow('API Error');
  });
});
