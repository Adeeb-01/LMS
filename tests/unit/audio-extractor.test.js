import { extractAudio, cleanupAudio } from '@/lib/alignment/audio-extractor';
import fs from 'fs';
import path from 'path';
import { alignmentConfig } from '@/lib/alignment/config';

// Mock fluent-ffmpeg
jest.mock('fluent-ffmpeg', () => {
  const mFfmpeg = jest.fn(() => ({
    noVideo: jest.fn().mockReturnThis(),
    audioChannels: jest.fn().mockReturnThis(),
    audioFrequency: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function(event, cb) {
      if (event === 'end') {
        // We simulate completion in a separate call or use a helper
        this._endCb = cb;
      }
      if (event === 'error') {
        this._errorCb = cb;
      }
      return this;
    }),
    save: jest.fn().mockImplementation(function(path) {
      if (this._shouldFail) {
        this._errorCb(new Error('FFmpeg error'));
      } else {
        // In a real mock we'd create the file, but for unit test we just call the cb
        this._endCb();
      }
      return this;
    }),
  }));
  
  mFfmpeg.setFfmpegPath = jest.fn();
  mFfmpeg.ffprobe = jest.fn((path, cb) => {
    if (path.includes('too_long')) {
      cb(null, { format: { duration: 8000 } }); // > 7200
    } else if (path.includes('invalid')) {
      cb(new Error('Invalid file'));
    } else {
      cb(null, { format: { duration: 100 } });
    }
  });
  
  return mFfmpeg;
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn((path) => !path.includes('not_found')),
  dirname: jest.requireActual('path').dirname,
  basename: jest.requireActual('path').basename,
  extname: jest.requireActual('path').extname,
  promises: {
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('audio-extractor', () => {
  const mockVideoPath = '/path/to/video.mp4';

  it('should extract audio for valid video duration', async () => {
    const audioPath = await extractAudio(mockVideoPath);
    expect(audioPath).toContain('audio_video_');
    expect(audioPath).toContain('.wav');
  });

  it('should reject video exceeding maximum duration', async () => {
    await expect(extractAudio('/path/to/too_long.mp4'))
      .rejects.toThrow(/exceeds maximum allowed/);
  });

  it('should reject if video file is not found', async () => {
    await expect(extractAudio('/path/to/not_found.mp4'))
      .rejects.toThrow(/Video file not found/);
  });

  it('should reject if ffprobe fails', async () => {
    await expect(extractAudio('/path/to/invalid.mp4'))
      .rejects.toThrow(/Failed to probe video/);
  });

  it('should cleanup audio file', async () => {
    const testPath = '/path/to/audio.wav';
    await cleanupAudio(testPath);
    expect(fs.promises.unlink).toHaveBeenCalledWith(testPath);
  });
});
