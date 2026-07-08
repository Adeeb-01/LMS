import ffmpeg from './config.js';
import path from 'path';
import fs from 'fs';
import { alignmentConfig } from './config.js';

/**
 * Extracts mono 16kHz audio from a video file.
 * @param {string} videoPath - Absolute path to the video file
 * @returns {Promise<string>} - Path to the temporary audio file
 */
export async function extractAudio(videoPath) {
  return new Promise((resolve, reject) => {
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      return reject(new Error(`Video file not found at: ${videoPath}`));
    }

    // Generate output audio path
    const audioPath = path.join(
      path.dirname(videoPath),
      `audio_${path.basename(videoPath, path.extname(videoPath))}_${Date.now()}.mp3`
    );

    // Validate video duration before processing
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(new Error(`Failed to probe video: ${err.message}`));
      
      // Check for audio streams
      const hasAudio = metadata.streams.some(s => s.codec_type === 'audio');
      if (!hasAudio) {
        return resolve(null); // No audio stream found, skip alignment
      }

      const duration = metadata.format.duration;
      if (duration > alignmentConfig.maxVideoDurationSeconds) {
        return reject(new Error(`Video duration (${Math.round(duration)}s) exceeds maximum allowed (${alignmentConfig.maxVideoDurationSeconds}s)`));
      }

      // Extract as mono mp3 at 32kbps — small enough for the Whisper API
      // 25MB limit. At 32kbps: ~109 min max, covering most lectures.
      ffmpeg(videoPath)
        .noVideo()
        .audioChannels(1)
        .audioFrequency(16000)
        .audioBitrate('32k')
        .toFormat('mp3')
        .on('error', (err) => {
          reject(new Error(`FFmpeg error during audio extraction: ${err.message}`));
        })
        .on('end', () => {
          const stats = fs.statSync(audioPath);
          const sizeMB = stats.size / (1024 * 1024);
          if (sizeMB > 24) {
            reject(new Error(`Extracted audio is ${sizeMB.toFixed(1)}MB, exceeding the 25MB API limit. Consider a shorter video.`));
            return;
          }
          resolve(audioPath);
        })
        .save(audioPath);
    });
  });
}

/**
 * Cleanup temporary audio file.
 * @param {string} audioPath - Path to the file to delete
 */
export async function cleanupAudio(audioPath) {
  try {
    if (fs.existsSync(audioPath)) {
      await fs.promises.unlink(audioPath);
    }
  } catch (err) {
    console.error(`Failed to cleanup audio file at ${audioPath}:`, err);
  }
}
