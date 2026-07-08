import { calculateFisherInformation } from '../../../lib/irt/information';

describe('Fisher Information (IRT)', () => {
  test('Maximum information is at θ = b when c = 0', () => {
    const info0 = calculateFisherInformation(0, { a: 1.0, b: 0.0, c: 0.0 });
    const info1 = calculateFisherInformation(1.0, { a: 1.0, b: 0.0, c: 0.0 });
    const infoNeg1 = calculateFisherInformation(-1.0, { a: 1.0, b: 0.0, c: 0.0 });
    
    expect(info0).toBeGreaterThan(info1);
    expect(info0).toBeGreaterThan(infoNeg1);
    // At θ=b, P=0.5, c=0: I = a² * (P-c)² * (1-P) / ((1-c)² * P) = 1 * 0.25 * 0.5 / 0.5 = 0.25
    expect(info0).toBeCloseTo(0.25, 2);
  });
  
  test('Information scales with a²', () => {
    const infoA1 = calculateFisherInformation(0, { a: 1.0, b: 0.0, c: 0.0 });
    const infoA2 = calculateFisherInformation(0, { a: 2.0, b: 0.0, c: 0.0 });
    expect(infoA2).toBeCloseTo(infoA1 * 4, 2); // a=2, a²=4
  });
  
  test('Guessing parameter (c) reduces maximum information', () => {
    const infoC0 = calculateFisherInformation(0, { a: 1.0, b: 0.0, c: 0.0 });
    const infoC2 = calculateFisherInformation(0, { a: 1.0, b: 0.0, c: 0.2 });
    expect(infoC2).toBeLessThan(infoC0);
  });
});
