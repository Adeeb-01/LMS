/**
 * Ability Level and Percentile Display Utility for IRT
 * 
 * Maps ability level (θ) to student-friendly descriptions and percentiles
 * 
 * @param {number} theta - Student's ability level (θ)
 * @returns {object} { label, percentile }
 */
export function mapAbilityToDisplay(theta) {
  let label = "Novice";
  
  if (theta < -1.5) label = "Novice";
  else if (theta < -0.5) label = "Developing";
  else if (theta < 0.5) label = "Proficient";
  else if (theta < 1.5) label = "Advanced";
  else label = "Expert";
  
  // Percentile calculation using Standard Normal CDF approximation (Φ(θ))
  // Φ(θ) = 100 * (1/2) * (1 + erf(θ / √2))
  const erf = (x) => {
    // Numerical approximation of the error function
    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);
    
    // Constants for approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  };
  
  const percentile = 100 * (0.5 * (1 + erf(theta / Math.sqrt(2))));
  
  return {
    label,
    percentile: Math.round(percentile * 10) / 10 // Round to one decimal place
  };
}
