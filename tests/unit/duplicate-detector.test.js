import { 
  calculateJaccardSimilarity, 
  calculateCosineSimilarity,
  detectDuplicate 
} from '../../lib/mcq-generation/duplicate-detector';

describe('Duplicate Detector', () => {
  describe('calculateJaccardSimilarity', () => {
    it('should return 1 for identical strings', () => {
      const str = "What is the capital of France?";
      expect(calculateJaccardSimilarity(str, str)).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(calculateJaccardSimilarity("Apple banana cherry", "Dog cat elephant")).toBe(0);
    });

    it('should be case-insensitive and ignore punctuation', () => {
      expect(calculateJaccardSimilarity("Hello world!", "hello, world")).toBe(1);
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 0, 1];
      expect(calculateCosineSimilarity(vec, vec)).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      expect(calculateCosineSimilarity([1, 0], [0, 1])).toBe(0);
    });

    it('should return high similarity for close vectors', () => {
      expect(calculateCosineSimilarity([1, 0.1], [1, 0.2])).toBeGreaterThan(0.9);
    });
  });

  describe('detectDuplicate', () => {
    const existing = [
      { _id: '1', text: "What is photosynthesis?", embedding: [1, 0, 0] },
      { _id: '2', text: "How do plants make food?", embedding: [0, 1, 0] }
    ];

    it('should return null if no duplicates found', () => {
      const result = detectDuplicate({ text: "What is gravity?", embedding: [0, 0, 1] }, existing);
      expect(result).toBeNull();
    });

    it('should return the match if semantic similarity is above threshold', () => {
      const result = detectDuplicate({ text: "Tell me about photosynthesis", embedding: [0.95, 0.1, 0] }, existing, 0.9);
      expect(result).not.toBeNull();
      expect(result.question._id).toBe('1');
      expect(result.score).toBeGreaterThan(0.9);
    });

    it('should fallback to token similarity if embeddings missing', () => {
      const result = detectDuplicate({ text: "What is photosynthesis?" }, existing, 0.8);
      expect(result).not.toBeNull();
      expect(result.question._id).toBe('1');
      expect(result.score).toBe(1);
    });
  });
});
