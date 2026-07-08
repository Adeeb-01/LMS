import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { ollamaTranscribe, isOllamaAvailable } from "./ollama.js";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const USE_LOCAL = process.env.AI_PROVIDER === "local";

const MODEL_CANDIDATES = [
    process.env.GEMINI_GENERATION_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
].filter(Boolean);

/**
 * Convert audio buffer to WAV 16 kHz mono (required by Ollama/Gemma 4).
 * @param {Buffer} inputBuffer - Raw audio bytes (any format ffmpeg understands).
 * @param {string} inputExt - File extension hint (e.g. "webm", "mp3").
 * @returns {Promise<Buffer>} WAV buffer.
 */
async function convertToWav16k(inputBuffer, inputExt = "webm") {
    const ffmpeg = (await import("fluent-ffmpeg")).default;
    const ffmpegPath = (await import("ffmpeg-static")).default;
    ffmpeg.setFfmpegPath(ffmpegPath);

    const tempDir = tmpdir();
    const inputPath = path.join(tempDir, `ollama-in-${Date.now()}.${inputExt}`);
    const outputPath = path.join(tempDir, `ollama-out-${Date.now()}.wav`);

    fs.writeFileSync(inputPath, inputBuffer);

    await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .noVideo()
            .audioChannels(1)
            .audioFrequency(16000)
            .audioCodec("pcm_s16le")
            .toFormat("wav")
            .on("error", reject)
            .on("end", resolve)
            .save(outputPath);
    });

    const wavBuffer = fs.readFileSync(outputPath);

    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}

    return wavBuffer;
}

/**
 * Transcribes audio using the configured provider (local Ollama or Gemini API).
 *
 * @param {string} audioUrl - The URL of the audio file to transcribe.
 * @returns {Promise<string>} - The transcribed text.
 */
export async function transcribeAudio(audioUrl) {
    if (!audioUrl) return "";

    let tempFilePath;
    try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`Failed to fetch audio from ${audioUrl}`);

        const tempDir = tmpdir();
        const fileName = `transcribe-${Date.now()}.webm`;
        tempFilePath = path.join(tempDir, fileName);

        const fileStream = createWriteStream(tempFilePath);
        const reader = response.body.getReader();
        await new Promise((resolve, reject) => {
            (async function () {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        fileStream.write(Buffer.from(value));
                    }
                    fileStream.end();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            })();
        });

        const audioBuffer = fs.readFileSync(tempFilePath);

        if (USE_LOCAL && (await isOllamaAvailable())) {
            const wavBuffer = await convertToWav16k(audioBuffer, "webm");
            return await ollamaTranscribe(wavBuffer.toString("base64"));
        }

        const ext = path.extname(new URL(audioUrl).pathname).replace(".", "") || "webm";
        const mimeType = getMimeType(ext);
        return await _geminiTranscribe(audioBuffer.toString("base64"), mimeType);
    } catch (error) {
        console.error("[TRANSCRIBE_ERROR]", error);
        throw error;
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch {}
        }
    }
}

/**
 * Transcribes audio from a base64 string (used by tutor voice input).
 *
 * @param {string} base64Audio - Base64-encoded audio data.
 * @param {string} mimeType - MIME type (e.g. "audio/webm").
 * @returns {Promise<string>} - The transcribed text.
 */
export async function transcribeAudioBase64(base64Audio, mimeType = "audio/webm") {
    if (!base64Audio) return "";

    if (USE_LOCAL && (await isOllamaAvailable())) {
        const audioBuffer = Buffer.from(base64Audio, "base64");
        const ext = mimeType.split("/")[1] || "webm";
        const wavBuffer = await convertToWav16k(audioBuffer, ext);
        return await ollamaTranscribe(wavBuffer.toString("base64"));
    }

    return await _geminiTranscribe(base64Audio, mimeType);
}

/**
 * Internal: Gemini-based transcription.
 */
async function _geminiTranscribe(base64Audio, mimeType) {
    let lastError = null;
    for (const modelName of MODEL_CANDIDATES) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                { inlineData: { mimeType, data: base64Audio } },
                {
                    text: "Transcribe this audio recording accurately. Return ONLY the transcribed text, nothing else. If the audio is empty or unintelligible, return an empty string.",
                },
            ]);
            return result.response.text().trim();
        } catch (e) {
            lastError = e;
            if (e?.status === 503 || e?.status === 429) continue;
            throw e;
        }
    }
    throw lastError || new Error("All Gemini models unavailable for transcription");
}

function getMimeType(ext) {
    const map = {
        webm: "audio/webm",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
        mp4: "audio/mp4",
        mpeg: "audio/mpeg",
        mpga: "audio/mpeg",
    };
    return map[ext] || "audio/webm";
}
