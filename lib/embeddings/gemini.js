import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini Embedding Service
 * 
 * Available models (as of 2025):
 * - gemini-embedding-001: Current text embedding model (3072 dimensions)
 * - text-embedding-004: Legacy model (768 dimensions)
 */

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const EMBEDDING_MODELS = [
    process.env.GEMINI_EMBEDDING_MODEL,
    "gemini-embedding-001",
    "text-embedding-004",
].filter(Boolean);

let activeModelName = null;

/**
 * Generates an embedding for a single text.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} - Array of floats (dimension depends on model).
 */
export async function generateEmbedding(text) {
    if (!text || typeof text !== "string") {
        throw new Error("Text is required and must be a string");
    }

    if (activeModelName) {
        try {
            const model = genAI.getGenerativeModel({ model: activeModelName });
            const result = await model.embedContent(text);
            if (result.embedding?.values) {
                return result.embedding.values;
            }
        } catch (error) {
            console.warn(`[GEMINI_EMBEDDING] Active model ${activeModelName} failed, retrying all models...`);
            activeModelName = null;
        }
    }

    let lastError = null;

    for (const modelName of EMBEDDING_MODELS) {
        try {
            console.log(`[GEMINI_EMBEDDING] Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.embedContent(text);
            
            if (!result.embedding || !result.embedding.values) {
                console.warn(`[GEMINI_EMBEDDING] Model ${modelName} returned invalid response`);
                continue;
            }
            
            console.log(`[GEMINI_EMBEDDING] Success with model: ${modelName} (${result.embedding.values.length} dimensions)`);
            activeModelName = modelName;
            return result.embedding.values;
        } catch (error) {
            lastError = error;
            const errorMsg = error.message || String(error);
            console.warn(`[GEMINI_EMBEDDING] Model ${modelName} failed: ${errorMsg.substring(0, 100)}`);
            continue;
        }
    }

    console.error("[GEMINI_EMBEDDING_ERROR] All models failed. Last error:", lastError?.message);
    throw lastError || new Error("No embedding models available");
}

/**
 * Generates embeddings for an array of texts in batch.
 * @param {string[]} texts - Array of strings (max 100 per Google API limits).
 * @returns {Promise<number[][]>} - Array of embeddings.
 */
export async function generateBatchEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
        return [];
    }

    if (texts.length > 100) {
        throw new Error("Maximum 100 texts per batch for Gemini embeddings");
    }

    for (const modelName of EMBEDDING_MODELS) {
        try {
            console.log(`[GEMINI_BATCH_EMBEDDING] Trying model: ${modelName} for ${texts.length} texts`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.batchEmbedContents({
                requests: texts.map((text) => ({
                    content: { parts: [{ text }] },
                })),
            });

            if (!result.embeddings || !Array.isArray(result.embeddings)) {
                console.warn(`[GEMINI_BATCH_EMBEDDING] Model ${modelName} returned invalid response`);
                continue;
            }

            console.log(`[GEMINI_BATCH_EMBEDDING] Success with model: ${modelName}`);
            activeModelName = modelName;
            return result.embeddings.map((e) => e.values);
        } catch (error) {
            const errorMsg = error.message || String(error);
            console.warn(`[GEMINI_BATCH_EMBEDDING] Model ${modelName} failed: ${errorMsg.substring(0, 100)}`);
            continue;
        }
    }

    console.warn("[GEMINI_BATCH_EMBEDDING_FALLBACK] Batch failed, falling back to sequential embeddings");
    const embeddings = [];
    for (const text of texts) {
        embeddings.push(await generateEmbedding(text));
    }
    return embeddings;
}
