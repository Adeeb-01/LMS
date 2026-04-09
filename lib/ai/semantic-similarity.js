import { generateEmbedding } from '@/lib/embeddings/gemini';

/**
 * Computes semantic similarity between two strings using Gemini embeddings.
 * 
 * @param {string} text1 - First text to compare
 * @param {string} text2 - Second text to compare
 * @returns {Promise<number>} - Cosine similarity score (0 to 1)
 */
export async function computeSemanticSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    try {
        const [embedding1, embedding2] = await Promise.all([
            generateEmbedding(text1),
            generateEmbedding(text2)
        ]);
        
        return cosineSimilarity(embedding1, embedding2);
    } catch (error) {
        console.error('[SEMANTIC_SIMILARITY_ERROR]', error);
        return 0;
    }
}

/**
 * Computes cosine similarity between two vectors.
 * 
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} - Similarity score
 */
export function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
}
