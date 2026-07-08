/**
 * Ollama client for local Gemma 4 E4B inference.
 * Supports text generation and audio transcription (via /api/chat).
 *
 * Audio requirements for Gemma 4 E4B:
 *   - Format: WAV with RIFF header
 *   - Sample rate: 16 kHz
 *   - Channels: mono
 *   - Max duration: ~30 seconds
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:e4b";

/**
 * Check if Ollama is reachable.
 * @returns {Promise<boolean>}
 */
export async function isOllamaAvailable() {
    try {
        const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
            signal: AbortSignal.timeout(3000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Send a chat completion request to Ollama.
 *
 * @param {Array<{role: string, content: string, images?: string[]}>} messages
 * @param {object} [options]
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 * @param {number} [options.num_ctx]
 * @returns {Promise<string>} The assistant message content.
 */
export async function ollamaChat(messages, options = {}) {
    const { model = OLLAMA_MODEL, temperature = 0.7, num_ctx = 8192 } = options;

    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            messages,
            stream: false,
            options: { temperature, num_ctx },
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.message?.content ?? "";
}

/**
 * Transcribe audio via Ollama Gemma 4 E4B.
 * The audio must be WAV 16 kHz mono, base64-encoded.
 * Ollama accepts audio bytes in the `images` field.
 *
 * @param {string} wavBase64 - Base64-encoded WAV audio.
 * @param {string} [prompt] - Custom transcription prompt.
 * @returns {Promise<string>} Transcribed text.
 */
export async function ollamaTranscribe(wavBase64, prompt) {
    const transcriptionPrompt =
        prompt ||
        "Transcribe the following speech segment in its original language. " +
        "Only output the transcription, with no newlines. " +
        "When transcribing numbers, write the digits.";

    return ollamaChat(
        [
            {
                role: "user",
                content: transcriptionPrompt,
                images: [wavBase64],
            },
        ],
        { temperature: 0.1, num_ctx: 4096 }
    );
}

/**
 * Generate a text response (for RAG tutor, evaluation, etc.).
 *
 * @param {string} systemPrompt - System instruction.
 * @param {string} userPrompt - User message / question with context.
 * @param {object} [options]
 * @returns {Promise<string>} Generated text.
 */
export async function ollamaGenerate(systemPrompt, userPrompt, options = {}) {
    const messages = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    return ollamaChat(messages, { temperature: 0.7, num_ctx: 8192, ...options });
}
