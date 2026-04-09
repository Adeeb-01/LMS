/**
 * Reference Answer Builder Utility
 * Provides functions to format or build oral question reference answers.
 */

/**
 * Validates and formats a reference answer object.
 * @param {Object} data - Input reference answer data.
 * @returns {Object} - Formatted reference answer.
 */
export function buildReferenceAnswer(data) {
    return {
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
        requiredTerminology: Array.isArray(data.requiredTerminology) ? data.requiredTerminology : [],
        acceptableVariations: Array.isArray(data.acceptableVariations) ? data.acceptableVariations : [],
        gradingCriteria: data.gradingCriteria || '',
        sampleResponse: data.sampleResponse || ''
    };
}

/**
 * Formats a reference answer for display or comparison.
 * @param {Object} referenceAnswer - The reference answer object.
 * @returns {string} - Formatted string.
 */
export function formatReferenceAnswer(referenceAnswer) {
    let output = "Key Points:\n" + referenceAnswer.keyPoints.map(p => `- ${p}`).join("\n");
    if (referenceAnswer.requiredTerminology.length > 0) {
        output += "\n\nRequired Terminology:\n" + referenceAnswer.requiredTerminology.join(", ");
    }
    if (referenceAnswer.gradingCriteria) {
        output += "\n\nGrading Criteria:\n" + referenceAnswer.gradingCriteria;
    }
    return output;
}
