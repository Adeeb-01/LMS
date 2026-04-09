import { generateGroundedResponse } from '@/lib/rag/tutor-response';
import OpenAI from 'openai';

const mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

describe('RAG Tutor Response Generation', () => {
  const mockQuestion = 'What is the main topic?';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a grounded response when context is found', async () => {
    const mockContexts = [
      { text: 'The main topic is photosynthesis.', metadata: { seconds: 10 } },
      { text: 'Photosynthesis converts light to energy.', metadata: { seconds: 45 } },
    ];

    const mockAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              response: 'Photosynthesis is the process of converting light into chemical energy.',
              isGrounded: true,
              suggestedTimestamps: [
                { seconds: 10, label: 'Main topic' },
                { seconds: 45, label: 'Conversion process' }
              ]
            }),
          },
        },
      ],
    };

    mockCreate.mockResolvedValue(mockAIResponse);

    const result = await generateGroundedResponse(mockQuestion, mockContexts);

    expect(result.response).toContain('Photosynthesis');
    expect(result.isGrounded).toBe(true);
    expect(result.timestampLinks).toHaveLength(2);
    expect(result.timestampLinks[0].seconds).toBe(10);
  });

  it('should return isGrounded: false when no context is provided', async () => {
    const mockAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              response: "I'm sorry, I couldn't find information about that in the lecture content.",
              isGrounded: false,
              suggestedTimestamps: []
            }),
          },
        },
      ],
    };

    mockCreate.mockResolvedValue(mockAIResponse);

    const result = await generateGroundedResponse(mockQuestion, []);

    expect(result.isGrounded).toBe(false);
    expect(result.timestampLinks).toHaveLength(0);
  });

  it('should handle AI generation errors gracefully', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI Error'));

    await expect(generateGroundedResponse(mockQuestion, [{ text: 'some context' }]))
      .rejects.toThrow('OpenAI Error');
  });
});
