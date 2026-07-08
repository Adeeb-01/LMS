import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ollamaGenerate, isOllamaAvailable } from "@/lib/ai/ollama.js";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const USE_LOCAL = process.env.AI_PROVIDER === "local";

const MODEL_CANDIDATES = [
    process.env.GEMINI_GENERATION_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
].filter(Boolean);

const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        response: { type: SchemaType.STRING },
        isGrounded: { type: SchemaType.BOOLEAN },
        suggestedTimestamps: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    seconds: { type: SchemaType.NUMBER },
                    label: { type: SchemaType.STRING },
                },
                required: ["seconds", "label"],
            },
        },
    },
    required: ["response", "isGrounded", "suggestedTimestamps"],
};

const SYSTEM_INSTRUCTION = `You are an AI Tutor for an online course. Your goal is to answer student questions based on the provided lecture content.

GUIDELINES:
1. Use the provided [Context] snippets to answer the question.
2. If the answer is in the context, be specific and cite the context.
3. If the answer is NOT in the context, inform the student that you couldn't find the specific information in the lecture, but provide a general helpful answer based on your general knowledge, clearly stating it's general knowledge.
4. Keep responses concise, encouraging, and educational (max 300 words).
5. If you use information from a specific context, mention it.`;

const OLLAMA_SYSTEM = `${SYSTEM_INSTRUCTION}

IMPORTANT: You MUST reply with valid JSON only (no markdown, no extra text). Use this exact schema:
{
  "response": "your answer text",
  "isGrounded": true or false,
  "suggestedTimestamps": [{"seconds": 0, "label": "description"}]
}
If you have no timestamps to suggest, use an empty array for suggestedTimestamps.`;

/**
 * Generates a grounded RAG response.
 * Uses local Ollama (Gemma 4 E4B) when AI_PROVIDER=local, otherwise Gemini API.
 *
 * @param {string} question - The student's question.
 * @param {Array} contexts - Array of retrieved chunks from ChromaDB.
 * @returns {Promise<{response: string, isGrounded: boolean, timestampLinks: Array}>}
 */
export async function generateGroundedResponse(question, contexts) {
    if (!question) {
        throw new Error("Question is required");
    }

    const hasContext = Array.isArray(contexts) && contexts.length > 0;

    const contextText = hasContext
        ? contexts
              .map(
                  (c, i) =>
                      `[Context ${i + 1}]: ${c.text || c.content || JSON.stringify(c)}`
              )
              .join("\n\n")
        : "No specific lecture content found for this question.";

    const prompt = `Context from Lecture:\n${contextText}\n\nStudent Question: "${question}"`;

    if (USE_LOCAL && (await isOllamaAvailable())) {
        return _ollamaResponse(prompt, hasContext);
    }

    return _geminiResponse(prompt, hasContext);
}

async function _ollamaResponse(prompt, hasContext) {
    const raw = await ollamaGenerate(OLLAMA_SYSTEM, prompt);

    let parsed;
    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
        return {
            response: raw,
            isGrounded: false,
            timestampLinks: [],
        };
    }

    const timestampLinks = (parsed.suggestedTimestamps || [])
        .filter((ts) => typeof ts.seconds === "number" && ts.seconds >= 0)
        .map((ts) => ({
            seconds: ts.seconds,
            label: ts.label || `Jump to ${ts.seconds}s`,
        }));

    return {
        response: parsed.response || raw,
        isGrounded: (parsed.isGrounded ?? false) && hasContext,
        timestampLinks,
    };
}

async function _geminiResponse(prompt, hasContext) {
    let lastError = null;
    for (const modelName of MODEL_CANDIDATES) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema,
                },
                systemInstruction: SYSTEM_INSTRUCTION,
            });

            const result = await model.generateContent(prompt);
            const parsed = JSON.parse(result.response.text());

            const timestampLinks = (parsed.suggestedTimestamps || [])
                .filter((ts) => typeof ts.seconds === "number" && ts.seconds >= 0)
                .map((ts) => ({
                    seconds: ts.seconds,
                    label: ts.label || `Jump to ${ts.seconds}s`,
                }));

            return {
                response: parsed.response,
                isGrounded: parsed.isGrounded && hasContext,
                timestampLinks,
            };
        } catch (e) {
            lastError = e;
            if (e?.status === 503 || e?.status === 429) continue;
            throw e;
        }
    }
    throw lastError || new Error("All Gemini models unavailable for tutor response");
}
