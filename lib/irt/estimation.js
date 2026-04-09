import * as math from 'mathjs';
import { calculateProbability } from './probability.js';
import { calculateFisherInformation } from './information.js';

/**
 * Expected A Posteriori (EAP) Estimation of student ability (θ)
 * 
 * E(θ | u) = ∫ θ L(θ | u) π(θ) dθ / ∫ L(θ | u) π(θ) dθ
 * 
 * Uses numerical integration with 41 quadrature points over θ ∈ [-4, 4]
 * 
 * @param {Array<object>} responses - Array of response data [{ correct, params }, ...]
 * @param {object} responses.params - Item parameters { a, b, c }
 * @param {boolean} responses.correct - Whether the student answered correctly
 * @returns {object} { theta: number, se: number }
 */
export function estimateAbilityEAP(responses) {
  // Define 41 quadrature points from -4 to 4 (step 0.2)
  const numPoints = 41;
  const range = 8;
  const step = range / (numPoints - 1);
  const thetaPoints = Array.from({ length: numPoints }, (_, i) => -4 + i * step);
  
  // Standard normal prior π(θ) = (1/√(2π)) * exp(-θ²/2)
  const calculatePrior = (theta) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-Math.pow(theta, 2) / 2);
  
  // Likelihood function L(θ | u) = ∏ P(θ)^u * (1-P(θ))^(1-u)
  const calculateLikelihood = (theta) => {
    return responses.reduce((acc, response) => {
      const p = calculateProbability(theta, response.params);
      const val = response.correct ? p : 1 - p;
      return acc * val;
    }, 1);
  };
  
  let numeratorSum = 0;
  let denominatorSum = 0;
  
  thetaPoints.forEach(theta => {
    const prior = calculatePrior(theta);
    const likelihood = calculateLikelihood(theta);
    const density = likelihood * prior;
    
    numeratorSum += theta * density;
    denominatorSum += density;
  });
  
  const estimatedTheta = numeratorSum / denominatorSum;
  
  // Standard Error Calculation SE(θ) = 1/√(ΣI(θ))
  const items = responses.map(r => r.params);
  const se = calculateStandardError(estimatedTheta, items);
  
  return {
    theta: estimatedTheta,
    se
  };
}

/**
 * Standard Error of Measurement for a given ability (θ) and set of items
 * 
 * Formula: SE(θ) = 1 / sqrt(Sum(I(θ, item_i)))
 * 
 * @param {number} theta - Estimated ability
 * @param {Array<object>} items - List of item parameters
 * @returns {number} Standard error
 */
export function calculateStandardError(theta, items) {
  if (!items || items.length === 0) return 1.0; // Initial default SE
  
  const totalInfo = items.reduce((acc, item) => {
    return acc + calculateFisherInformation(theta, item);
  }, 0);
  
  return 1 / Math.sqrt(totalInfo);
}
