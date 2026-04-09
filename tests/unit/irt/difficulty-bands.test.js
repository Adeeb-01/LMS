import { getDifficultyBand, getTargetBandForTheta, validateBatPool } from '@/lib/irt/difficulty-bands';

describe('difficulty-bands', () => {
  describe('getDifficultyBand', () => {
    it('should return easy for b < -1', () => {
      expect(getDifficultyBand(-1.5)).toBe('easy');
      expect(getDifficultyBand(-2.0)).toBe('easy');
    });

    it('should return medium for -1 <= b <= 1', () => {
      expect(getDifficultyBand(-1.0)).toBe('medium');
      expect(getDifficultyBand(0)).toBe('medium');
      expect(getDifficultyBand(1.0)).toBe('medium');
    });

    it('should return hard for b > 1', () => {
      expect(getDifficultyBand(1.1)).toBe('hard');
      expect(getDifficultyBand(2.0)).toBe('hard');
    });
  });

  describe('getTargetBandForTheta', () => {
    it('should return easy for theta < -1', () => {
      expect(getTargetBandForTheta(-1.1)).toBe('easy');
    });

    it('should return medium for -1 <= theta <= 1', () => {
      expect(getTargetBandForTheta(0)).toBe('medium');
    });

    it('should return hard for theta > 1', () => {
      expect(getTargetBandForTheta(1.1)).toBe('hard');
    });
  });

  describe('validateBatPool', () => {
    it('should return valid true when all bands have 4+ questions', () => {
      const questions = [
        ...Array(4).fill({ irt: { b: -1.5 } }),
        ...Array(4).fill({ irt: { b: 0 } }),
        ...Array(4).fill({ irt: { b: 1.5 } }),
      ];
      const result = validateBatPool(questions);
      expect(result.valid).toBe(true);
      expect(result.counts.easy).toBe(4);
      expect(result.counts.medium).toBe(4);
      expect(result.counts.hard).toBe(4);
    });

    it('should return valid false when any band has < 4 questions', () => {
      const questions = [
        ...Array(3).fill({ irt: { b: -1.5 } }),
        ...Array(4).fill({ irt: { b: 0 } }),
        ...Array(4).fill({ irt: { b: 1.5 } }),
      ];
      const result = validateBatPool(questions);
      expect(result.valid).toBe(false);
    });
  });
});
