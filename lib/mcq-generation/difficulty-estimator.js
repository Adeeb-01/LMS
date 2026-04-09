/**
 * Bloom's Taxonomy to B-Value (difficulty) mapping.
 * b-value is an IRT parameter typically in range [-3.0, 3.0]
 */
export const BLOOM_B_VALUE_MAP = {
    remember: [-2.0, -0.5],   // Low difficulty
    understand: [-0.5, 0.5],  // Medium-low
    apply: [0.0, 1.0],        // Medium
    analyze: [0.5, 1.5],      // Medium-high
    evaluate: [1.0, 2.0],     // High
    create: [1.5, 2.5]        // Very high
};

/**
 * Validates if a b-value is within the expected range for a given Bloom's level.
 * @param {number} bValue 
 * @param {string} bloomLevel 
 * @returns {boolean}
 */
export function isBValueValidForBloomLevel(bValue, bloomLevel) {
    const range = BLOOM_B_VALUE_MAP[bloomLevel];
    if (!range) return false;
    return bValue >= range[0] && bValue <= range[1];
}

/**
 * Gets a default b-value (midpoint) for a given Bloom's level.
 * @param {string} bloomLevel 
 * @returns {number}
 */
export function getDefaultBValueForBloomLevel(bloomLevel) {
    const range = BLOOM_B_VALUE_MAP[bloomLevel];
    if (!range) return 0.0;
    return (range[0] + range[1]) / 2;
}
