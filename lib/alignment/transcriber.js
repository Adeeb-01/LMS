import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs";
import path from "path";

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
        segments: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    text: { type: SchemaType.STRING },
                    start: { type: SchemaType.NUMBER },
                    end: { type: SchemaType.NUMBER },
                },
                required: ["text", "start", "end"],
            },
        },
    },
    required: ["segments"],
};

/**
 * Transcribes an audio file with word-level timestamps using Gemini.
 * Gemini returns segment-level timestamps; we interpolate word-level
 * timestamps within each segment for the alignment pipeline.
 *
 * @param {string} audioPath - Path to the audio file (mp3, wav, etc.)
 * @returns {Promise<{text: string, segments: Array, words: Array}>}
 */
export async function transcribeAudio(audioPath) {
    try {
        const audioBuffer = fs.readFileSync(audioPath);
        const base64Audio = audioBuffer.toString("base64");
        const ext = path.extname(audioPath).replace(".", "");
        const mimeType = getMimeType(ext);

        const prompt = `Transcribe this audio recording precisely. Return the transcription broken into timed segments.

Rules:
- Each segment should be a natural phrase or sentence (roughly 5-15 words).
- "start" and "end" are in seconds (decimal, e.g. 12.5).
- Preserve all specialized terminology exactly as spoken.
- Cover the ENTIRE audio — do not skip or summarize any part.
- If the audio is silent or unintelligible, return an empty segments array.`;

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
                        "You are a precise audio transcription engine. Your only job is to convert speech to text with accurate timestamps. Never summarize, paraphrase, or add commentary.",
                });

                const result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType,
                            data: base64Audio,
                        },
                    },
                    { text: prompt },
                ]);

                const parsed = JSON.parse(result.response.text());
                const segments = (parsed.segments || []).map((seg) => ({
                    text: seg.text || "",
                    start: Number(seg.start) || 0,
                    end: Number(seg.end) || 0,
                }));

                const fullText = segments.map((s) => s.text).join(" ");
                const words = interpolateWordTimestamps(segments);

                return { text: fullText, segments, words };
            } catch (e) {
                lastError = e;
                const isOverloaded = e?.status === 503 || e?.status === 429;
                if (isOverloaded) continue;
                throw e;
            }
        }
        throw lastError || new Error("All Gemini models unavailable for transcription");
    } catch (error) {
        console.error("[ALIGNMENT_TRANSCRIPTION_ERROR]", error);
        throw new Error(`Transcription failed: ${error.message}`);
    }
}

/**
 * Interpolates word-level timestamps from segment-level timestamps.
 * Distributes time evenly across words within each segment.
 */
function interpolateWordTimestamps(segments) {
    const words = [];
    for (const seg of segments) {
        const segWords = seg.text.trim().split(/\s+/).filter(Boolean);
        if (segWords.length === 0) continue;

        const duration = seg.end - seg.start;
        const wordDuration = duration / segWords.length;

        for (let i = 0; i < segWords.length; i++) {
            words.push({
                word: segWords[i],
                start: Math.round((seg.start + i * wordDuration) * 100) / 100,
                end: Math.round((seg.start + (i + 1) * wordDuration) * 100) / 100,
            });
        }
    }
    return words;
}

function getMimeType(ext) {
    const map = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        webm: "audio/webm",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
        mp4: "audio/mp4",
    };
    return map[ext] || "audio/mpeg";
}
