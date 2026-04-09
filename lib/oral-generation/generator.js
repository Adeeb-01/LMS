import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

/**
 * Gemini Oral Question Generator Service
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
                    cognitiveLevel: { 
                        type: SchemaType.STRING,
                        enum: ['application', 'analysis', 'synthesis', 'evaluation']
                    },
                    referenceAnswer: {
                        type: SchemaType.OBJECT,
                        properties: {
                            keyPoints: { 
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING }
                            },
                            requiredTerminology: { 
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING }
                            },
                            acceptableVariations: { 
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING }
                            },
                            gradingCriteria: { type: SchemaType.STRING },
                            sampleResponse: { type: SchemaType.STRING }
                        },
                        required: ["keyPoints", "requiredTerminology", "gradingCriteria"]
                    },
                    difficulty: {
                        type: SchemaType.OBJECT,
                        properties: {
                            bValue: { type: SchemaType.NUMBER },
                            reasoning: { type: SchemaType.STRING }
                        },
                        required: ["bValue", "reasoning"]
                    },
                    estimatedResponseTime: { type: SchemaType.STRING }
                },
                required: ["text", "cognitiveLevel", "referenceAnswer", "difficulty"]
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
    systemInstruction: `You are an expert university-level oral examination creator. 
Your goal is to generate high-quality open-ended oral questions from lecture content that require verbal explanation, analysis, or synthesis. 
Questions should be answerable in 1-3 minutes of speaking.
Focus on higher-order thinking (application, analysis, synthesis, evaluation).
CRITICAL: You must filter out non-educational content. If a chunk contains only metadata, TOC, or insufficient substance for an oral question, set "skipped": true.`
});

/**
 * Generates Oral Questions from a content chunk using Gemini.
 * @param {Object} options - Input options.
 * @param {string} options.content - The content chunk.
 * @param {string} options.cognitiveLevel - Target cognitive level.
 * @param {Object} options.context - Optional context like heading path.
 * @param {Array} options.existingQuestions - Optional list of existing questions.
 * @returns {Promise<Array>} - The generated questions.
 */
export async function generateOralQuestions({ content, cognitiveLevel, context = {}, existingQuestions = [] }) {
    if (!content || typeof content !== "string" || content.trim().split(/\s+/).length < 100) {
        return [];
    }

    const headingContext = context.headingPath ? `[Context heading: ${context.headingPath}]` : "";
    const existingContext = existingQuestions.length > 0 
        ? `Avoid generating duplicates for these existing questions:\n${existingQuestions.map(q => `- ${q}`).join("\n")}`
        : "";

    const prompt = `
Generate 1 high-quality university-level open-ended oral question from the following lecture content chunk.
${headingContext}

Content:
${content}

Target Cognitive Level: ${cognitiveLevel || 'analysis'}

Guidelines:
1. Focus on concepts that require verbal explanation and reasoning.
2. Provide a structured reference answer including 3-5 key points.
3. Include required terminology that must be used in a correct answer.
4. Estimate difficulty using "bValue" (IRT parameter, range: -3.0 to 3.0):
   - application: 0.0 to 1.0
   - analysis: 0.5 to 1.5
   - synthesis: 1.0 to 2.0
   - evaluation: 1.5 to 2.5
5. Provide pedagogical reasoning for the "bValue".

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
            
            if (parsedResponse.skipped) {
                console.log(`[ORAL_GEN_SKIPPED] ${parsedResponse.skipReason}`);
                return [];
            }

            return parsedResponse.questions;
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

                console.warn(`[GEMINI_RATE_LIMIT] Rate limit hit for oral gen. Retrying in ${Math.round(delay/1000)}s (Attempt ${retryCount}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            console.error("[ORAL_GENERATION_ERROR]", error);
            throw error;
        }
    }
}
