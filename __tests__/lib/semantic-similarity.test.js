import { computeSemanticSimilarity, cosineSimilarity } from '@/lib/ai/semantic-similarity';
import { generateEmbedding } from '@/lib/embeddings/gemini';

jest.mock('@/lib/embeddings/gemini', () => ({
  generateEmbedding: jest.fn(),
}));

describe('Semantic Similarity Utility', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const v = [1, 0, 1];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const v1 = [1, 0];
      const v2 = [0, 1];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });

    it('should return -1 for opposite vectors', () => {
      const v1 = [1, 1];
      const v2 = [-1, -1];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1);
    });

    it('should handle zero vectors', () => {
      const v1 = [0, 0];
      const v2 = [1, 1];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });

    it('should handle different length vectors', () => {
      const v1 = [1, 1];
      const v2 = [1, 1, 1];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });
  });

  describe('computeSemanticSimilarity', () => {
    it('should return similarity based on embeddings', async () => {
      generateEmbedding.mockImplementation(async (text) => {
        if (text === 'hello') return [1, 0];
        if (text === 'hi') return [0.8, 0.2];
        return [0, 0];
      });

      const similarity = await computeSemanticSimilarity('hello', 'hi');
      // cosine([1,0], [0.8, 0.2]) = (1*0.8 + 0*0.2) / (sqrt(1)*sqrt(0.8^2+0.2^2))
      // = 0.8 / sqrt(0.64 + 0.04) = 0.8 / sqrt(0.68) ≈ 0.8 / 0.8246 ≈ 0.97
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1);
    });

    it('should return 0 if one text is empty', async () => {
      const similarity = await computeSemanticSimilarity('hello', '');
      expect(similarity).toBe(0);
    });

    it('should return 0 on embedding error', async () => {
      generateEmbedding.mockRejectedValue(new Error('API Error'));
      const similarity = await computeSemanticSimilarity('hello', 'hi');
      expect(similarity).toBe(0);
    });
  });
});
