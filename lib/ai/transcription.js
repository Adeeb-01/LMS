import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import pipeline from "stream";
import { tmpdir } from "os";
import { createWriteStream } from "fs";

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
 * Transcribes audio using OpenAI Whisper.
 * @param {string} audioUrl - The URL of the audio file to transcribe.
 * @returns {Promise<string>} - The transcribed text.
 */
export async function transcribeAudio(audioUrl) {
    if (!audioUrl) return "";

    let tempFilePath;
    try {
        const client = getOpenAI();
        // 1. Download the file to a temp location
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`Failed to fetch audio from ${audioUrl}`);
        
        const tempDir = tmpdir();
        const fileName = `whisper-${Date.now()}.webm`;
        tempFilePath = path.join(tempDir, fileName);
        
        const fileStream = createWriteStream(tempFilePath);
        
        // Node 18+ native fetch response.body is a web stream
        // For createWriteStream we need to handle it accordingly
        const reader = response.body.getReader();
        await new Promise((resolve, reject) => {
            (async function() {
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

        // 2. Send to Whisper
        const transcription = await client.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
        });

        return transcription.text;
    } catch (error) {
        console.error("[WHISPER_TRANSCRIBE_ERROR]", error);
        throw error;
    } finally {
        // 3. Clean up temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                console.warn("Failed to delete temp file:", tempFilePath);
            }
        }
    }
}
