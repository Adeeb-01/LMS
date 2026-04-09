import { alignTextWithTranscript } from '@/lib/alignment/text-aligner';

describe('text-aligner', () => {
  const mockStructuredContent = [
    { type: 'paragraph', content: 'Welcome to this lecture on MongoDB.' },
    { type: 'heading', content: 'Key Features' },
    { type: 'paragraph', content: 'We will discuss document models and indexing.' }
  ];

  const mockTranscriptWords = [
    { word: 'welcome', start: 0.1, end: 0.5 },
    { word: 'to', start: 0.6, end: 0.8 },
    { word: 'this', start: 0.9, end: 1.2 },
    { word: 'lecture', start: 1.3, end: 1.6 },
    { word: 'on', start: 1.7, end: 1.9 },
    { word: 'mongodb', start: 2.0, end: 2.5 },
    { word: 'key', start: 10.0, end: 10.2 },
    { word: 'features', start: 10.3, end: 10.8 },
    { word: 'we', start: 20.0, end: 20.2 },
    { word: 'will', start: 20.3, end: 20.6 },
    { word: 'discuss', start: 20.7, end: 21.0 },
    { word: 'document', start: 21.1, end: 21.5 },
    { word: 'models', start: 21.6, end: 22.0 },
    { word: 'and', start: 22.1, end: 22.3 },
    { word: 'indexing', start: 22.4, end: 22.9 }
  ];

  it('should align structured content with transcript words correctly', () => {
    const results = alignTextWithTranscript(mockStructuredContent, mockTranscriptWords);
    expect(results).toHaveLength(3);
    
    // First block
    expect(results[0].status).toBe('aligned');
    expect(results[0].startSeconds).toBe(0.1);
    expect(results[0].endSeconds).toBe(2.5);
    expect(results[0].confidence).toBeGreaterThanOrEqual(70);

    // Second block (Heading)
    expect(results[1].status).toBe('aligned');
    expect(results[1].startSeconds).toBe(10.0);
    expect(results[1].endSeconds).toBe(10.8);

    // Third block
    expect(results[2].status).toBe('aligned');
    expect(results[2].startSeconds).toBe(20.0);
    expect(results[2].endSeconds).toBe(22.9);
  });

  it('should handle missing transcript words gracefully', () => {
    const results = alignTextWithTranscript(mockStructuredContent, []);
    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('unable-to-align');
    expect(results[0].startSeconds).toBeNull();
  });

  it('should mark empty content as not-spoken', () => {
    const contentWithEmpty = [
      { type: 'paragraph', content: '' }
    ];
    const results = alignTextWithTranscript(contentWithEmpty, mockTranscriptWords);
    expect(results[0].status).toBe('not-spoken');
  });

  it('should mark content as unable-to-align if similarity is too low', () => {
    const unrelatedContent = [
      { type: 'paragraph', content: 'This is completely unrelated text about kittens.' }
    ];
    const results = alignTextWithTranscript(unrelatedContent, mockTranscriptWords);
    expect(results[0].status).toBe('unable-to-align');
  });
});
