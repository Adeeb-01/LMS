import { generateEmbedding, generateBatchEmbeddings } from '@/lib/embeddings/gemini';
import { cosineSimilarity } from './semantic-similarity';

/**
 * Analyzes concept coverage of a student response against a set of key concepts.
 * 
 * @param {string} studentResponse - The student's response text
 * @param {string[]} keyConcepts - List of concepts to check for
 * @param {number} threshold - Minimum similarity score to consider a concept "addressed" (default: 0.6)
 * @returns {Promise<{ addressed: string[], missing: string[], details: Array<{ concept: string, similarity: number, addressed: boolean }> }>}
 */
export async function analyzeConceptCoverage(studentResponse, keyConcepts, threshold = 0.6) {
    if (!studentResponse || !keyConcepts || !Array.isArray(keyConcepts) || keyConcepts.length === 0) {
        return { addressed: [], missing: [], details: [] };
    }

    try {
        // 1. Generate embeddings for student response and all concepts
        const studentEmbedding = await generateEmbedding(studentResponse);
        
        // Use batch embedding for efficiency if possible
        const conceptEmbeddings = await generateBatchEmbeddings(keyConcepts);
        
        // 2. Compute similarity for each concept
        const details = keyConcepts.map((concept, index) => {
            const conceptEmbedding = conceptEmbeddings[index];
            const similarity = cosineSimilarity(studentEmbedding, conceptEmbedding);
            const addressed = similarity >= threshold;
            
            return {
                concept,
                similarity,
                addressed
            };
        });

        // 3. Categorize results
        const addressed = details.filter(d => d.addressed).map(d => d.concept);
        const missing = details.filter(d => !d.addressed).map(d => d.concept);

        return {
            addressed,
            missing,
            details
        };
    } catch (error) {
        console.error('[CONCEPT_COVERAGE_ERROR]', error);
        return { addressed: [], missing: [], details: [] };
    }
}
