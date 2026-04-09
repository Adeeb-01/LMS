/**
 * Block selection logic for BAT
 */
import { calculateFisherInformation } from './information.js';
import { getDifficultyBand, getTargetBandForTheta } from './difficulty-bands.js';

/**
 * Select a block of 2 questions from the appropriate difficulty band
 * 
 * @param {number} theta - Current ability estimate
 * @param {Array} pool - Question pool with IRT params
 * @param {Array} usedIds - Already-used question IDs (as strings)
 * @returns {Object} { questions, difficultyBand, selectionMetrics }
 */
export function selectBlock(theta, pool, usedIds = []) {
  const targetBand = getTargetBandForTheta(theta);
  const usedSet = new Set(usedIds.map(id => id.toString()));
  
  // Filter unused questions in target band
  let candidates = pool.filter(q => {
    const qId = (q._id || q.id).toString();
    return !usedSet.has(qId) && getDifficultyBand(q.irt?.b ?? 0) === targetBand;
  });
  
  let actualBand = targetBand;
  
  // Fallback to adjacent bands if needed
  if (candidates.length < 2) {
    actualBand = targetBand === 'medium' ? 'easy' : 'medium';
    const fallback = pool.filter(q => {
      const qId = (q._id || q.id).toString();
      return !usedSet.has(qId) && getDifficultyBand(q.irt?.b ?? 0) === actualBand;
    });
    candidates = [...candidates, ...fallback];
  }
  
  if (candidates.length < 2) {
    // Last resort: any unused questions
    candidates = pool.filter(q => {
      const qId = (q._id || q.id).toString();
      return !usedSet.has(qId);
    });
  }
  
  if (candidates.length < 2) {
    throw new Error('INSUFFICIENT_QUESTIONS');
  }
  
  // Sort by Fisher Information (descending) and take top 2
  candidates.sort((a, b) => 
    calculateFisherInformation(theta, b.irt) - calculateFisherInformation(theta, a.irt)
  );
  
  const selected = candidates.slice(0, 2);
  
  return {
    questions: selected,
    questionIds: selected.map(q => q._id || q.id),
    difficultyBand: actualBand,
    selectionMetrics: {
      targetBand,
      actualBand,
      fallbackUsed: actualBand !== targetBand,
      candidateCount: candidates.length,
      thetaAtSelection: theta
    }
  };
}
