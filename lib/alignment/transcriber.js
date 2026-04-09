import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import { WaveFile } from 'wavefile';
import { alignmentConfig } from './config.js';

let transcriberInstance = null;

/**
 * Initializes the Whisper transcription pipeline.
 * @returns {Promise<any>}
 */
async function getTranscriber() {
  if (transcriberInstance) return transcriberInstance;

  transcriberInstance = await pipeline(
    'automatic-speech-recognition',
    alignmentConfig.whisperModel,
    { 
      quantized: alignmentConfig.whisperQuantized,
    }
  );

  return transcriberInstance;
}

/**
 * Transcribes an audio file into text with word-level timestamps.
 * @param {string} audioPath - Path to the audio file (must be 16kHz mono WAV)
 * @returns {Promise<Object>} - Transcription result with segments and words
 */
export async function transcribeAudio(audioPath) {
  try {
    const transcriber = await getTranscriber();

    // Read WAV file
    const buffer = fs.readFileSync(audioPath);
    const wav = new WaveFile(buffer);

    // Ensure it's 16kHz mono (double-check after FFmpeg)
    wav.toSampleRate(16000);
    wav.toBitDepth('32f'); // Convert to Float32

    const samples = wav.getSamples();
    // Handle both mono (one array) and stereo (array of arrays)
    const float32Samples = Array.isArray(samples) && Array.isArray(samples[0]) 
      ? samples[0] 
      : samples;

    // Run transcription
    const output = await transcriber(float32Samples, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: 'word',
      force_full_sequences: false,
    });

    // Format output
    return {
      text: output.text,
      segments: output.chunks.map(chunk => ({
        text: chunk.text,
        start: chunk.timestamp[0],
        end: chunk.timestamp[1]
      })),
      // If we used word-level timestamps, they'd be in chunks too if configured right
      // Transformers.js 2.x return_timestamps: 'word' puts words in 'chunks'
      words: output.chunks.map(chunk => ({
        word: chunk.text.trim(),
        start: chunk.timestamp[0],
        end: chunk.timestamp[1]
      }))
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}
