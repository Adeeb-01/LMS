import { selectNextQuestion } from '../../../lib/irt/selection';

describe('MFI Question Selection', () => {
  const pool = [
    { id: '1', params: { a: 1.0, b: -2.0, c: 0.0 }, moduleId: 'mod1' },
    { id: '2', params: { a: 1.0, b: 0.0, c: 0.0 }, moduleId: 'mod1' },
    { id: '3', params: { a: 1.0, b: 2.0, c: 0.0 }, moduleId: 'mod2' },
    { id: '4', params: { a: 2.0, b: 0.5, c: 0.0 }, moduleId: 'mod2' } // High discrimination at θ=0.5
  ];
  
  test('Selects high information item for θ=0', () => {
    const selected = selectNextQuestion(0, pool, []);
    expect(selected.id).toBe('4'); // a=2, b=0.5 is better for θ=0 than a=1, b=0
  });
  
  test('Selects high discrimination item when θ matches difficulty', () => {
    const selected = selectNextQuestion(0.5, pool, []);
    expect(selected.id).toBe('4'); // a=2, b=0.5 is better for θ=0.5 than b=0
  });
  
  test('Excludes already answered questions', () => {
    const selected = selectNextQuestion(0, pool, ['2']);
    expect(selected.id).not.toBe('2');
    expect(selected.id).toBe('4'); // Next best for θ=0
  });
  
  test('Applies content weights for balancing', () => {
    // For θ=1, normally 4 (a=2, b=0.5) or 3 (a=1, b=2) would be best.
    // Let's bias heavily towards module 1 (items 1, 2)
    const selected = selectNextQuestion(1.0, pool, [], { 
      contentWeights: { 'mod1': 10.0, 'mod2': 1.0 } 
    });
    expect(selected.moduleId).toBe('mod1');
  });
  
  test('Returns null when pool is exhausted', () => {
    const selected = selectNextQuestion(0, pool, ['1', '2', '3', '4']);
    expect(selected).toBeNull();
  });
});
