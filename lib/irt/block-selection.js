/**
 * Block selection logic for BAT
 */
import { calculateFisherInformation } from './information.js';
import { getDifficultyBand, getTargetBandForTheta } from './difficulty-bands.js';

/**
 * Get fallback band order based on target band
 * @param {string} targetBand - The target difficulty band
 * @returns {string[]} Ordered list of fallback bands to try
 */
function getFallbackBandOrder(targetBand) {
  const fallbackOrders = {
    'easy': ['medium', 'hard'],
    'medium': ['easy', 'hard'],
    'hard': ['medium', 'easy']
  };
  return fallbackOrders[targetBand] || ['medium', 'easy', 'hard'];
}

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
  
  // Helper to filter unused questions by band
  const getUnusedByBand = (band) => pool.filter(q => {
    const qId = (q._id || q.id).toString();
    return !usedSet.has(qId) && getDifficultyBand(q.irt?.b ?? 0) === band;
  });
  
  // Filter unused questions in target band
  let candidates = getUnusedByBand(targetBand);
  let actualBand = targetBand;
  
  // Fallback to adjacent bands if needed (try each fallback in order)
  if (candidates.length < 2) {
    const fallbackOrder = getFallbackBandOrder(targetBand);
    
    for (const fallbackBand of fallbackOrder) {
      const fallbackCandidates = getUnusedByBand(fallbackBand);
      candidates = [...candidates, ...fallbackCandidates];
      
      if (candidates.length >= 2) {
        actualBand = fallbackBand;
        break;
      }
    }
  }
  
  // Last resort: any unused questions regardless of band
  if (candidates.length < 2) {
    candidates = pool.filter(q => {
      const qId = (q._id || q.id).toString();
      return !usedSet.has(qId);
    });
    actualBand = 'mixed';
  }
  
  if (candidates.length < 2) {
    throw new Error('INSUFFICIENT_QUESTIONS');
  }
  
  // Sort by Fisher Information (descending) and take top 2
  candidates.sort((a, b) => {
    const infoA = calculateFisherInformation(theta, a.irt || { a: 1, b: 0, c: 0 });
    const infoB = calculateFisherInformation(theta, b.irt || { a: 1, b: 0, c: 0 });
    return infoB - infoA;
  });
  
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
