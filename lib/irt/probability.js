/**
 * 3-Parameter Logistic (3PL) IRT Model Probability Function
 * 
 * Formula: P(θ) = c + (1 - c) / (1 + exp(-a * (θ - b)))
 * 
 * @param {number} theta - Student's ability level (θ)
 * @param {object} params - Item parameters { a, b, c }
 * @param {number} params.a - Discrimination parameter (slope)
 * @param {number} params.b - Difficulty parameter (location)
 * @param {number} params.c - Guessing parameter (lower asymptote)
 * @returns {number} Probability of a correct response (clamped to [0.001, 0.999])
 */
export function calculateProbability(theta, { a, b, c }) {
  const exponent = -a * (theta - b);
  const denominator = 1 + Math.exp(exponent);
  const p = c + (1 - c) / denominator;
  
  // Clamp to avoid numerical instability in Fisher Information
  return Math.max(0.001, Math.min(0.999, p));
}
