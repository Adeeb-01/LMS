import OpenAI from "openai";

let openai;

function getOpenAI() {
    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
}

/**
 * Evaluates a transcribed oral answer against a reference answer using OpenAI GPT.
 * @param {string} transcribedText - The student's transcribed answer.
 * @param {string} referenceAnswer - The instructor's reference answer.
 * @returns {Promise<{score: number, feedback: string}>}
 */
export async function evaluateOralAnswer(transcribedText, referenceAnswer) {
    if (!transcribedText || !referenceAnswer) {
        return {
            score: 0,
            feedback: "Missing transcription or reference answer for evaluation."
        };
    }

    try {
        const client = getOpenAI();
        const response = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert oral examiner. Your task is to evaluate a student's spoken answer (provided as transcription) against a reference answer provided by the instructor.
                    
                    Provide a score from 0 to 100 based on:
                    1. Semantic accuracy (does it convey the same meaning?)
                    2. Completeness (are all key points mentioned?)
                    3. Clarity.
                    
                    Return your response EXACTLY in this JSON format:
                    {
                        "score": number,
                        "feedback": "string"
                    }`
                },
                {
                    role: "user",
                    content: `Reference Answer: "${referenceAnswer}"\n\nStudent Transcription: "${transcribedText}"`
                }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error("[GPT_PARSE_ERROR]", content);
            return {
                score: 0,
                feedback: content // Return raw content as feedback if JSON parse fails
            };
        }
    } catch (error) {
        console.error("[GPT_EVALUATION_ERROR]", error);
        throw error;
    }
}
