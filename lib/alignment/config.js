import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

// Configure FFmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export const alignmentConfig = {
  // Video duration limit: 2 hours (7200 seconds)
  maxVideoDurationSeconds: 7200,
  
  // Whisper model settings
  whisperModel: 'Xenova/whisper-small',
  whisperQuantized: true,
  
  // Retry policy: 5 minutes delay (300,000 ms)
  retryDelayMs: 300000,
  maxRetries: 1,
  
  // Alignment thresholds: Below 70% is flagged
  lowConfidenceThreshold: 70,
};

export default ffmpeg;
