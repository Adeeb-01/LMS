import { calculateProbability } from './probability.js';
import { calculateFisherInformation } from './information.js';

/**
 * Expected A Posteriori (EAP) Estimation of student ability (θ)
 * 
 * E(θ | u) = ∫ θ L(θ | u) π(θ) dθ / ∫ L(θ | u) π(θ) dθ
 * 
 * Uses numerical integration with 41 quadrature points over θ ∈ [-4, 4].
 * Computation is done in log-space to avoid likelihood underflow with many responses.
 * 
 * @param {Array<object>} responses - Array of response data [{ correct, params }, ...]
 * @param {object} responses.params - Item parameters { a, b, c }
 * @param {boolean} responses.correct - Whether the student answered correctly
 * @returns {object} { theta: number, se: number }
 */
export function estimateAbilityEAP(responses) {
  const numPoints = 41;
  const range = 8;
  const step = range / (numPoints - 1);
  const thetaPoints = Array.from({ length: numPoints }, (_, i) => -4 + i * step);
  
  // Log of standard normal prior: log π(θ) = -0.5*log(2π) - θ²/2
  const LOG_2PI = Math.log(2 * Math.PI);
  const logPrior = (theta) => -0.5 * LOG_2PI - 0.5 * theta * theta;
  
  // Log-likelihood: log L(θ | u) = Σ [u*log P(θ) + (1-u)*log(1-P(θ))]
  const logLikelihood = (theta) => {
    return responses.reduce((acc, response) => {
      const p = calculateProbability(theta, response.params);
      return acc + (response.correct ? Math.log(p) : Math.log(1 - p));
    }, 0);
  };
  
  // Compute log-posterior at each quadrature point
  const logPosteriors = thetaPoints.map(theta => logLikelihood(theta) + logPrior(theta));
  
  // Shift by max for numerical stability before exponentiating
  const maxLogPosterior = Math.max(...logPosteriors);
  
  let numeratorSum = 0;
  let denominatorSum = 0;
  
  thetaPoints.forEach((theta, i) => {
    const density = Math.exp(logPosteriors[i] - maxLogPosterior);
    numeratorSum += theta * density;
    denominatorSum += density;
  });
  
  const estimatedTheta = denominatorSum > 0 ? numeratorSum / denominatorSum : 0;
  
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
