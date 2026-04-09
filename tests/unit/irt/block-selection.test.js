import { selectBlock } from '@/lib/irt/block-selection';

describe('block-selection', () => {
  const mockPool = [
    { _id: '1', irt: { a: 1, b: -1.5, c: 0.2 } },  // easy
    { _id: '2', irt: { a: 1, b: -1.2, c: 0.2 } },  // easy
    { _id: '3', irt: { a: 1, b: 0, c: 0.2 } },     // medium
    { _id: '4', irt: { a: 1, b: 0.5, c: 0.2 } },   // medium
    { _id: '5', irt: { a: 1, b: 1.5, c: 0.2 } },   // hard
    { _id: '6', irt: { a: 1, b: 2, c: 0.2 } },     // hard
  ];

  it('selects 2 questions from medium band when theta = 0', () => {
    const result = selectBlock(0, mockPool, []);
    expect(result.questions.length).toBe(2);
    expect(result.difficultyBand).toBe('medium');
  });

  it('selects 2 questions from easy band when theta = -1.5', () => {
    const result = selectBlock(-1.5, mockPool, []);
    expect(result.questions.length).toBe(2);
    expect(result.difficultyBand).toBe('easy');
  });

  it('excludes already used questions', () => {
    const result = selectBlock(0, mockPool, ['3']);
    expect(result.questions.some(q => q._id === '3')).toBe(false);
    expect(result.questions.length).toBe(2);
  });

  it('falls back to other bands if target band is empty', () => {
    const result = selectBlock(0, mockPool, ['3', '4']); // Medium band used up
    expect(result.difficultyBand).toBe('easy'); // Fallback for medium is easy
    expect(result.questions.length).toBe(2);
  });

  it('throws error if insufficient questions overall', () => {
    expect(() => selectBlock(0, mockPool.slice(0, 1), [])).toThrow('INSUFFICIENT_QUESTIONS');
  });
});
