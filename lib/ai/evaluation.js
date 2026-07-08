import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const MODEL_CANDIDATES = [
    process.env.GEMINI_GENERATION_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
].filter(Boolean);

const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        score: { type: SchemaType.NUMBER },
        feedback: { type: SchemaType.STRING },
    },
    required: ["score", "feedback"],
};

/**
 * Evaluates a transcribed oral answer against a reference answer using Gemini.
 * @param {string} transcribedText - The student's transcribed answer.
 * @param {string} referenceAnswer - The instructor's reference answer.
 * @returns {Promise<{score: number, feedback: string}>}
 */
export async function evaluateOralAnswer(transcribedText, referenceAnswer) {
    if (!transcribedText || !referenceAnswer) {
        return {
            score: 0,
            feedback: "Missing transcription or reference answer for evaluation.",
        };
    }

    const prompt = `Reference Answer: "${referenceAnswer}"

Student Transcription: "${transcribedText}"

Evaluate the student's answer against the reference answer. Provide a score from 0 to 100 based on:
1. Semantic accuracy (does it convey the same meaning?)
2. Completeness (are all key points mentioned?)
3. Clarity.`;

    let lastError = null;
    for (const modelName of MODEL_CANDIDATES) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema,
                },
                systemInstruction:
                    "You are an expert oral examiner. Evaluate the student's spoken answer (provided as transcription) against the instructor's reference answer. Return a score (0-100) and constructive feedback.",
            });

            const result = await model.generateContent(prompt);
            const parsed = JSON.parse(result.response.text());
            return {
                score: Number(parsed.score) || 0,
                feedback: parsed.feedback || "",
            };
        } catch (e) {
            lastError = e;
            const isOverloaded = e?.status === 503 || e?.status === 429;
            if (isOverloaded) continue;
            throw e;
        }
    }
    throw lastError || new Error("All Gemini models unavailable for evaluation");
}
