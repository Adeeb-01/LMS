import { analyzeConceptCoverage } from '@/lib/ai/concept-coverage';
import { generateEmbedding, generateBatchEmbeddings } from '@/lib/embeddings/gemini';

jest.mock('@/lib/embeddings/gemini', () => ({
  generateEmbedding: jest.fn(),
  generateBatchEmbeddings: jest.fn(),
}));

describe('Concept Coverage Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should identify addressed and missing concepts', async () => {
    // Mock student response embedding
    generateEmbedding.mockResolvedValue([1, 0]);
    
    // Mock concept embeddings
    // Concept 1: "hello" (similar to [1, 0])
    // Concept 2: "world" (orthogonal to [1, 0])
    generateBatchEmbeddings.mockResolvedValue([
      [0.9, 0.1], // Concept 1: similarity ≈ 0.99 (addressed)
      [0.1, 0.9]  // Concept 2: similarity ≈ 0.11 (missing)
    ]);

    const result = await analyzeConceptCoverage('student response', ['concept1', 'concept2'], 0.6);

    expect(result.addressed).toContain('concept1');
    expect(result.missing).toContain('concept2');
    expect(result.details).toHaveLength(2);
    expect(result.details[0].concept).toBe('concept1');
    expect(result.details[0].addressed).toBe(true);
    expect(result.details[1].concept).toBe('concept2');
    expect(result.details[1].addressed).toBe(false);
  });

  it('should handle empty student response', async () => {
    const result = await analyzeConceptCoverage('', ['concept1']);
    expect(result.addressed).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
  });

  it('should handle empty concepts list', async () => {
    const result = await analyzeConceptCoverage('response', []);
    expect(result.addressed).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
  });

  it('should return empty results on embedding error', async () => {
    generateEmbedding.mockRejectedValue(new Error('API Error'));
    const result = await analyzeConceptCoverage('response', ['concept1']);
    expect(result.addressed).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
  });
});
