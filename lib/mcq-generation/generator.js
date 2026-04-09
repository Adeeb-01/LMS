import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { validateGeminiResponse } from './question-validator.js';
import { BLOOM_B_VALUE_MAP } from './difficulty-estimator.js';

/**
 * Gemini MCQ Generator Service
 * Using gemini-2.5-flash (or configured model) for question generation.
 */

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// JSON Schema for Gemini Output
const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        questions: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    text: { type: SchemaType.STRING },
                    options: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                id: { type: SchemaType.STRING },
                                text: { type: SchemaType.STRING }
                            },
                            required: ["id", "text"]
                        }
                    },
                    correctOptionId: { type: SchemaType.STRING },
                    explanation: { type: SchemaType.STRING },
                    difficulty: {
                        type: SchemaType.OBJECT,
                        properties: {
                            bValue: { type: SchemaType.NUMBER },
                            bloomLevel: { 
                                type: SchemaType.STRING, 
                                enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"]
                            },
                            reasoning: { type: SchemaType.STRING }
                        },
                        required: ["bValue", "bloomLevel", "reasoning"]
                    }
                },
                required: ["text", "options", "correctOptionId", "explanation", "difficulty"]
            }
        },
        skipped: { type: SchemaType.BOOLEAN },
        skipReason: { type: SchemaType.STRING }
    },
    required: ["questions", "skipped", "skipReason"]
};

const DEFAULT_MODEL_CANDIDATES = [
    process.env.GEMINI_GENERATION_MODEL, // optional override, highest priority
    "gemini-2.5-flash-lite",  // Most budget-friendly, good for free tier
    "gemini-2.5-flash",       // Best price-performance
    "gemini-2.5-pro",         // Most advanced (fallback)
].filter(Boolean);

function getModel(modelName) {
    return genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        },
        systemInstruction: `You are an expert university-level exam creator specialized in pedagogical assessment. 
Your goal is to generate high-quality multiple-choice questions from lecture content that accurately test student understanding across various Bloom's Taxonomy levels.
CRITICAL: You must filter out non-educational content. If a chunk contains only:
- Table of Contents
- Bibliography or References
- Document metadata (author, date, page numbers)
- Acknowledgments
- Navigational text
- Chunks with insufficient educational substance
Then you MUST set "skipped": true and provide a clear "skipReason".`
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error) {
    const status = error?.status;
    if (status === 429) return true;
    // Service overload / transient upstream errors
    if (status === 503 || status === 502 || status === 500 || status === 504) return true;
    const msg = String(error?.message || "");
    return (
        msg.includes("503") ||
        msg.includes("Service Unavailable") ||
        msg.includes("high demand") ||
        msg.includes("429") ||
        msg.includes("Too Many Requests") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("ENOTFOUND")
    );
}

function computeBackoffMs(attempt, initialMs) {
    // exponential backoff with jitter, capped
    const exp = Math.min(6, attempt); // cap exponent growth
    const base = Math.pow(2, exp) * initialMs;
    const jitter = Math.floor(base * (0.15 + Math.random() * 0.2)); // 15-35%
    return Math.min(120_000, base + jitter);
}

/**
 * Generates MCQs from a content chunk using Gemini.
 * @param {string} textChunk - The content to generate questions from.
 * @param {Object} context - Optional context like heading path.
 * @param {Array} existingQuestions - Optional list of existing questions to avoid duplicates.
 * @returns {Promise<Object>} - The generated questions or skip reason.
 */
export async function generateQuestionsFromChunk(textChunk, context = {}, existingQuestions = []) {
    if (!textChunk || typeof textChunk !== "string" || textChunk.length < 50) {
        return { questions: [], skipped: true, skipReason: "Chunk too short or invalid" };
    }

    const headingContext = context.headingPath ? `[Context heading: ${context.headingPath}]` : "";
    const existingContext = existingQuestions.length > 0 
        ? `Avoid generating duplicates for these existing questions:\n${existingQuestions.map(q => `- ${q}`).join("\n")}`
        : "";

    const prompt = `
Generate 1-3 university-level MCQs from the following lecture content chunk.
${headingContext}

Content:
${textChunk}

Guidelines:
1. Focus on core concepts and substantive material.
2. If the content is merely metadata, table of contents, bibliography, or otherwise not educational, set "skipped": true and provide a "skipReason".
3. Each question must have 4 options.
4. Distractors must be plausible and relevant.
5. Provide a detailed explanation for the correct answer.
6. Estimate difficulty using the "bValue" (IRT parameter, range: -3.0 to 3.0):
   - "remember": -2.0 to -0.5 (recall facts)
   - "understand": -0.5 to 0.5 (comprehension)
   - "apply": 0.0 to 1.0 (application)
   - "analyze": 0.5 to 1.5 (analysis)
   - "evaluate": 1.0 to 2.0 (critique)
   - "create": 1.5 to 2.5 (synthesis)
7. Provide pedagogical reasoning for the "bValue" and "bloomLevel".

${existingContext}
    `.trim();

    let retryCount = 0;
    const MAX_RETRIES = 6;
    const INITIAL_RETRY_DELAY = 2500; // 2.5 seconds

    while (retryCount <= MAX_RETRIES) {
        try {
            let lastError = null;

            for (const modelName of DEFAULT_MODEL_CANDIDATES) {
                try {
                    const model = getModel(modelName);
                    const result = await model.generateContent(prompt);
                    const responseText = result.response.text();
                    const parsedResponse = JSON.parse(responseText);
            
                    const validation = validateGeminiResponse(parsedResponse);
                    if (!validation.isValid) {
                        console.warn("[GEMINI_RESPONSE_VALIDATION_FAILED]", validation.errors);
                        throw new Error(`Invalid response from Gemini: ${validation.errors.join(", ")}`);
                    }

                    return validation.data;
                } catch (e) {
                    lastError = e;
                    const isOverloaded = e?.status === 503 || String(e?.message || "").includes("high demand");
                    if (isOverloaded) {
                        console.warn(`[GEMINI_OVERLOADED] Model ${modelName} overloaded, trying fallback...`);
                        continue;
                    }
                    // Non-overload error: bubble up to retry handler below
                    throw e;
                }
            }

            // If every model candidate was overloaded
            throw lastError || new Error("All Gemini models unavailable");
        } catch (error) {
            const isRetryable = isRetryableGeminiError(error);

            if (isRetryable && retryCount < MAX_RETRIES) {
                retryCount++;

                // Default exponential backoff with jitter
                let delay = computeBackoffMs(retryCount, INITIAL_RETRY_DELAY);

                // Try to extract specific retry delay from Gemini error details (when present)
                try {
                    if (error.errorDetails && Array.isArray(error.errorDetails)) {
                        const retryInfo = error.errorDetails.find(d => 
                            d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' || 
                            d.retryDelay
                        );
                        if (retryInfo && retryInfo.retryDelay) {
                            const seconds = parseInt(retryInfo.retryDelay);
                            if (!isNaN(seconds)) {
                                delay = (seconds + 2) * 1000; // Add 2s buffer
                            }
                        }
                    }
                } catch (e) {
                    // Fallback to exponential backoff if parsing fails
                }

                const status = error?.status ? `status=${error.status}` : "no-status";
                console.warn(`[GEMINI_RETRY] Transient Gemini error (${status}). Retrying in ${Math.round(delay/1000)}s (Attempt ${retryCount}/${MAX_RETRIES})`);
                await sleep(delay);
                continue;
            }

            console.error("[MCQ_GENERATION_ERROR]", error);
            throw error;
        }
    }

    // If we exit the loop without returning (should not happen normally)
    return { questions: [], skipped: true, skipReason: "Maximum retries exceeded" };
}
