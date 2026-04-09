import { calculateFisherInformation } from './information.js';

/**
 * Maximum Fisher Information (MFI) Question Selection for Adaptive Testing
 * 
 * Selects the next question from the pool that provides the most information
 * at the student's current estimated ability (θ).
 * 
 * Supports content balancing by applying weight multipliers to item info
 * based on their associated modules.
 * 
 * @param {number} currentTheta - Student's current ability estimate (θ)
 * @param {Array<object>} pool - Array of candidate items [{ id, params, moduleId }, ...]
 * @param {Array<string>} answeredIds - List of IDs for questions already presented
 * @param {object} options - Selection options
 * @param {object} options.contentWeights - Module ID to weight multiplier mapping { moduleId: number }
 * @returns {object|null} Selected item or null if pool exhausted
 */
export function selectNextQuestion(currentTheta, pool, answeredIds = [], options = {}) {
  const { contentWeights = {} } = options;
  
  // Filter out already answered questions
  const candidates = pool.filter(item => {
    const itemId = (item.id || item._id).toString();
    return !answeredIds.includes(itemId);
  });
  
  if (candidates.length === 0) return null;
  
  let bestItem = null;
  let maxInformation = -Infinity;
  
  candidates.forEach(item => {
    const params = item.params || item.irt;
    // Calculate raw Fisher Information for item at current θ
    let information = calculateFisherInformation(currentTheta, params);
    
    // Apply content balancing weight if enabled
    if (item.moduleId && contentWeights[item.moduleId.toString()]) {
      information *= contentWeights[item.moduleId.toString()];
    }
    
    if (information > maxInformation) {
      maxInformation = information;
      bestItem = item;
    }
  });
  
  return {
    ...bestItem,
    selectionMetrics: {
      fisherInformation: maxInformation,
      thetaAtSelection: currentTheta,
      candidateCount: candidates.length,
      selectionReason: (bestItem && bestItem.moduleId && contentWeights[bestItem.moduleId.toString()]) ? "content_balance" : "max_info"
    }
  };
}
