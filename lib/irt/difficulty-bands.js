/**
 * Difficulty band classification for BAT
 */

/**
 * Get difficulty band for a question based on IRT b parameter
 * @param {number} b - IRT difficulty parameter
 * @returns {string} 'easy' | 'medium' | 'hard'
 */
export function getDifficultyBand(b) {
  if (b < -1) return 'easy';
  if (b <= 1) return 'medium';
  return 'hard';
}

/**
 * Get target difficulty band based on current theta
 * @param {number} theta - Current ability estimate
 * @returns {string} 'easy' | 'medium' | 'hard'
 */
export function getTargetBandForTheta(theta) {
  if (theta < -1) return 'easy';
  if (theta <= 1) return 'medium';
  return 'hard';
}

/**
 * Validate question pool meets BAT requirements (4+ per band)
 * @param {Array} questions - Pool of questions with IRT parameters
 * @returns {Object} { valid: boolean, counts: object, minRequired: number }
 */
export function validateBatPool(questions) {
  const counts = { easy: 0, medium: 0, hard: 0 };
  
  questions.forEach(q => {
    const band = getDifficultyBand(q.irt?.b ?? 0);
    counts[band]++;
  });
  
  const minPerBand = 4;
  const valid = counts.easy >= minPerBand && 
                counts.medium >= minPerBand && 
                counts.hard >= minPerBand;
  
  return { valid, counts, minRequired: minPerBand };
}
