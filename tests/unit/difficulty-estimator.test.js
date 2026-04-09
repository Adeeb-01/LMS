import { BLOOM_B_VALUE_MAP, isBValueValidForBloomLevel, getDefaultBValueForBloomLevel } from '../../lib/mcq-generation/difficulty-estimator';

describe('Difficulty Estimator', () => {
    describe('BLOOM_B_VALUE_MAP', () => {
        it('should have all Bloom levels defined', () => {
            const expectedLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
            expectedLevels.forEach(level => {
                expect(BLOOM_B_VALUE_MAP).toHaveProperty(level);
                expect(BLOOM_B_VALUE_MAP[level]).toHaveLength(2);
                expect(BLOOM_B_VALUE_MAP[level][0]).toBeLessThan(BLOOM_B_VALUE_MAP[level][1]);
            });
        });
    });

    describe('isBValueValidForBloomLevel', () => {
        it('should return true for valid b-values', () => {
            expect(isBValueValidForBloomLevel(-1.0, 'remember')).toBe(true);
            expect(isBValueValidForBloomLevel(0.0, 'understand')).toBe(true);
            expect(isBValueValidForBloomLevel(2.0, 'create')).toBe(true);
        });

        it('should return false for invalid b-values', () => {
            expect(isBValueValidForBloomLevel(1.0, 'remember')).toBe(false);
            expect(isBValueValidForBloomLevel(-2.0, 'create')).toBe(false);
        });

        it('should return false for unknown bloom levels', () => {
            expect(isBValueValidForBloomLevel(0.0, 'invalid')).toBe(false);
        });
    });

    describe('getDefaultBValueForBloomLevel', () => {
        it('should return the midpoint of the range', () => {
            expect(getDefaultBValueForBloomLevel('remember')).toBe(-1.25);
            expect(getDefaultBValueForBloomLevel('understand')).toBe(0.0);
            expect(getDefaultBValueForBloomLevel('create')).toBe(2.0);
        });

        it('should return 0.0 for unknown bloom levels', () => {
            expect(getDefaultBValueForBloomLevel('invalid')).toBe(0.0);
        });
    });
});
