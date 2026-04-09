import { generateQuestionsFromChunk } from '../../lib/mcq-generation/generator';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the entire module
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      })
    })),
    _mockGenerateContent: mockGenerateContent,
    SchemaType: {
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      BOOLEAN: 'BOOLEAN'
    }
  };
});

describe('MCQ Generator Service Unit Tests', () => {
  let mockGenerateContent;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent = require('@google/generative-ai')._mockGenerateContent;
  });

  const validText = "The solar system consists of the Sun and the objects that orbit it. The eight planets are Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.";

  const validResponse = {
    questions: [
      {
        text: "Which of the following is an object that orbits the Sun?",
        options: [
          { id: "a", text: "Earth" },
          { id: "b", text: "Moon" },
          { id: "c", text: "Star" },
          { id: "d", text: "Comet" }
        ],
        correctOptionId: "a",
        explanation: "Earth is one of the eight planets that orbit the Sun.",
        difficulty: {
          bValue: -1.0,
          bloomLevel: "remember",
          reasoning: "Recall of basic facts about the solar system."
        }
      }
    ],
    skipped: false,
    skipReason: null
  };

  it('should generate questions for valid content', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(validResponse)
      }
    });

    const result = await generateQuestionsFromChunk(validText);
    
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].text).toBe(validResponse.questions[0].text);
    expect(result.skipped).toBe(false);
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should handle skipped content', async () => {
    const skipResponse = {
      questions: [],
      skipped: true,
      skipReason: "Table of contents"
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(skipResponse)
      }
    });

    const result = await generateQuestionsFromChunk("Table of Contents: Chapter 1, Chapter 2");
    expect(result.skipped).toBe(true);
    expect(result.questions).toHaveLength(0);
  });

  it('should throw error for invalid Gemini response structure', async () => {
    const invalidResponse = {
      wrongKey: []
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(invalidResponse)
      }
    });

    await expect(generateQuestionsFromChunk(validText)).rejects.toThrow();
  });

  it('should throw error for empty or too short text', async () => {
    const shortResult = await generateQuestionsFromChunk("Too short");
    expect(shortResult.skipped).toBe(true);
    expect(shortResult.skipReason).toBe("Chunk too short or invalid");
  });

  it('should handle Gemini API errors', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Error'));
    await expect(generateQuestionsFromChunk(validText)).rejects.toThrow('API Error');
  });
});
