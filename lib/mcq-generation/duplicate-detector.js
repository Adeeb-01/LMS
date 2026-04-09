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
 * Calculates cosine similarity between two vectors.
 * @param {number[]} vec1 
 * @param {number[]} vec2 
 * @returns {number}
 */
export function calculateCosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Detects if a new question is a potential duplicate of existing ones.
 * @param {Object} newQuestion - { text, embedding? }
 * @param {Array<Object>} existingQuestions - List of questions to compare against { text, embedding? }
 * @param {number} threshold - Similarity threshold (default 0.85)
 * @returns {Object|null} The most similar question found if above threshold, else null
 */
export function detectDuplicate(newQuestion, existingQuestions, threshold = 0.85) {
  if (!existingQuestions || existingQuestions.length === 0) return null;

  let bestMatch = null;
  let maxSimilarity = 0;

  for (const existing of existingQuestions) {
    let similarity = 0;

    // Phase 1: Semantic similarity (if embeddings available)
    if (newQuestion.embedding && existing.embedding) {
      similarity = calculateCosineSimilarity(newQuestion.embedding, existing.embedding);
    } 
    // Phase 2: Token-based similarity fallback
    else {
      similarity = calculateJaccardSimilarity(newQuestion.text, existing.text);
    }
    
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestMatch = existing;
    }
  }

  return maxSimilarity >= threshold ? { question: bestMatch, score: maxSimilarity } : null;
}
