import { calculateProbability } from './probability.js';

/**
 * Fisher Information Function for 3PL IRT Model
 * 
 * Formula: I(θ) = a² * (P(θ) - c)² / ((1 - c)² * P(θ) * (1 - P(θ)))
 * 
 * Where:
 * - a = discrimination parameter
 * - c = guessing parameter  
 * - P(θ) = probability of correct response at ability θ
 * 
 * @param {number} theta - Student's ability level (θ)
 * @param {object} params - Item parameters { a, b, c }
 * @returns {number} Fisher Information value at θ
 */
export function calculateFisherInformation(theta, params) {
  const { a, c } = params;
  const p = calculateProbability(theta, params);
  
  const numerator = Math.pow(a, 2) * Math.pow(p - c, 2);
  const denominator = Math.pow(1 - c, 2) * p * (1 - p);
  
  if (denominator === 0) return 0;
  
  return numerator / denominator;
}

/**
 * Total Information for a set of items
 * 
 * @param {number} theta - Student's ability level (θ)
 * @param {Array<object>} items - Array of item parameters [{ a, b, c }, ...]
 * @returns {number} Sum of Fisher Information
 */
export function calculateTotalInformation(theta, items) {
  return items.reduce((acc, item) => acc + calculateFisherInformation(theta, item), 0);
}
