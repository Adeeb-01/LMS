import { calculateProbability } from '../../../lib/irt/probability';

describe('IRT Probability (3PL)', () => {
  test('θ = b should yield 0.5 when c = 0', () => {
    const p = calculateProbability(0, { a: 1.0, b: 0.0, c: 0.0 });
    expect(p).toBeCloseTo(0.5);
  });
  
  test('θ > b should yield p > 0.5', () => {
    const p = calculateProbability(1.0, { a: 1.0, b: 0.0, c: 0.0 });
    expect(p).toBeGreaterThan(0.5);
  });
  
  test('θ < b should yield p < 0.5', () => {
    const p = calculateProbability(-1.0, { a: 1.0, b: 0.0, c: 0.0 });
    expect(p).toBeLessThan(0.5);
  });
  
  test('θ >> b should yield p ≈ 0.999 (clamped)', () => {
    const p = calculateProbability(10.0, { a: 1.0, b: 0.0, c: 0.0 });
    expect(p).toBe(0.999);
  });
  
  test('θ << b should yield p ≈ 0.001 (clamped)', () => {
    const p = calculateProbability(-10.0, { a: 1.0, b: 0.0, c: 0.0 });
    expect(p).toBe(0.001);
  });
  
  test('Guessing parameter (c) affects probability', () => {
    const p0 = calculateProbability(-5.0, { a: 1.0, b: 0.0, c: 0.0 });
    const p02 = calculateProbability(-5.0, { a: 1.0, b: 0.0, c: 0.2 });
    expect(p02).toBeGreaterThan(p0);
    expect(p02).toBeGreaterThanOrEqual(0.2);
  });
  
  test('Discrimination parameter (a) affects slope', () => {
    const pA1 = calculateProbability(1.0, { a: 1.0, b: 0.0, c: 0.0 });
    const pA2 = calculateProbability(1.0, { a: 2.0, b: 0.0, c: 0.0 });
    expect(pA2).toBeGreaterThan(pA1); // Steeper slope for a=2.0 at θ=1
  });
});
