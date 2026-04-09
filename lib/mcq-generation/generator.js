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

const modelName = process.env.GEMINI_GENERATION_MODEL || "gemini-2.5-flash";

const model = genAI.getGenerativeModel({
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
    const MAX_RETRIES = 5;
    const INITIAL_RETRY_DELAY = 3000; // 3 seconds

    while (retryCount <= MAX_RETRIES) {
        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const parsedResponse = JSON.parse(responseText);
            
            const validation = validateGeminiResponse(parsedResponse);
            if (!validation.isValid) {
                console.warn("[GEMINI_RESPONSE_VALIDATION_FAILED]", validation.errors);
                throw new Error(`Invalid response from Gemini: ${validation.errors.join(", ")}`);
            }

            return validation.data;
        } catch (error) {
            const isRateLimit = error.status === 429 || error.message.includes("429") || error.message.includes("Too Many Requests");
            
            if (isRateLimit && retryCount < MAX_RETRIES) {
                retryCount++;
                
                // Default exponential backoff
                let delay = Math.pow(2, retryCount) * INITIAL_RETRY_DELAY;
                
                // Try to extract specific retry delay from Gemini error details
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

                console.warn(`[GEMINI_RATE_LIMIT] Rate limit hit. Retrying in ${Math.round(delay/1000)}s (Attempt ${retryCount}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            console.error("[MCQ_GENERATION_ERROR]", error);
            throw error;
        }
    }
}
