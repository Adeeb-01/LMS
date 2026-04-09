import { estimateAbilityEAP, calculateStandardError } from '../../../lib/irt/estimation';

describe('EAP Ability Estimation', () => {
  const easyItem = { a: 1.0, b: -2.0, c: 0.0 };
  const mediumItem = { a: 1.0, b: 0.0, c: 0.0 };
  const hardItem = { a: 1.0, b: 2.0, c: 0.0 };
  
  test('Correct response to easy item should increase θ', () => {
    const { theta } = estimateAbilityEAP([{ correct: true, params: easyItem }]);
    expect(theta).toBeGreaterThan(0.0);
  });
  
  test('Incorrect response to hard item should decrease θ', () => {
    const { theta } = estimateAbilityEAP([{ correct: false, params: hardItem }]);
    expect(theta).toBeLessThan(0.0);
  });
  
  test('Responses to varied difficulties result in expected θ', () => {
    const { theta: t1 } = estimateAbilityEAP([
      { correct: true, params: easyItem },
      { correct: true, params: mediumItem }
    ]);
    const { theta: t2 } = estimateAbilityEAP([
      { correct: true, params: easyItem },
      { correct: true, params: mediumItem },
      { correct: true, params: hardItem }
    ]);
    expect(t2).toBeGreaterThan(t1);
  });
  
  test('Standard Error decreases as more items are answered', () => {
    const res1 = estimateAbilityEAP([{ correct: true, params: mediumItem }]);
    const res2 = estimateAbilityEAP([
      { correct: true, params: mediumItem },
      { correct: false, params: easyItem }
    ]);
    expect(res2.se).toBeLessThan(res1.se);
  });
  
  test('Calculation handles all-correct and all-incorrect patterns', () => {
    // EAP handles extreme patterns without bias due to normal prior
    const resAllCorrect = estimateAbilityEAP([
      { correct: true, params: easyItem },
      { correct: true, params: mediumItem },
      { correct: true, params: hardItem }
    ]);
    const resAllIncorrect = estimateAbilityEAP([
      { correct: false, params: easyItem },
      { correct: false, params: mediumItem },
      { correct: false, params: hardItem }
    ]);
    
    expect(resAllCorrect.theta).toBeGreaterThan(0);
    expect(resAllIncorrect.theta).toBeLessThan(0);
    // SE is 1/sqrt(sum of Fisher Info). With 3 items a=1, max info is 3*0.25=0.75, SE=1.15
    // With a normal prior, the SE should still be well-behaved
    expect(resAllCorrect.se).toBeDefined();
    expect(resAllCorrect.se).toBeLessThan(2.0); // Basic sanity check
  });
});
