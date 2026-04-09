/**
 * Token-based Jaccard similarity between two strings.
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} 0 to 1
 */
export function calculateJaccardSimilarity(str1, str2) {
    const getTokens = (s) => new Set(s.toLowerCase().split(/\W+/).filter(t => t.length > 2));
    const set1 = getTokens(str1);
    const set2 = getTokens(str2);
    
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
}

/**
 * Detects if a new oral question is a duplicate of existing ones.
 * @param {Object} newQuestion - { text }
 * @param {Array<Object>} existingQuestions - List of questions to compare against { text }
 * @param {number} threshold - Similarity threshold (default 0.90 for oral)
 * @returns {Promise<boolean>} - True if duplicate detected.
 */
export async function isDuplicateOral(newQuestion, existingQuestions, threshold = 0.90) {
    if (!existingQuestions || existingQuestions.length === 0) return false;

    for (const existing of existingQuestions) {
        const similarity = calculateJaccardSimilarity(newQuestion.text, existing.text);
        if (similarity >= threshold) {
            return true;
        }
    }

    return false;
}
