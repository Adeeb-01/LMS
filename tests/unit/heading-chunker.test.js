import { chunkByHeadings } from '../../lib/embeddings/chunker';

describe('Heading Chunker Unit Tests', () => {
  it('should return empty array for empty input', () => {
    expect(chunkByHeadings([])).toEqual([]);
    expect(chunkByHeadings(null)).toEqual([]);
  });

  it('should group content by heading hierarchy', () => {
    const structuredContent = [
      { type: 'heading', level: 1, content: 'Chapter 1' },
      { type: 'paragraph', content: 'Para 1' },
      { type: 'heading', level: 2, content: 'Section 1.1' },
      { type: 'paragraph', content: 'Para 2' },
      { type: 'heading', level: 1, content: 'Chapter 2' },
      { type: 'paragraph', content: 'Para 3' },
    ];

    const chunks = chunkByHeadings(structuredContent);

    expect(chunks).toHaveLength(3);
    
    // Chapter 1 chunk
    expect(chunks[0].headingPath).toBe('Chapter 1');
    expect(chunks[0].content).toContain('Chapter 1');
    expect(chunks[0].content).toContain('Para 1');
    
    // Section 1.1 chunk
    expect(chunks[1].headingPath).toBe('Chapter 1 > Section 1.1');
    expect(chunks[1].content).toContain('Section 1.1');
    expect(chunks[1].content).toContain('Para 2');
    
    // Chapter 2 chunk
    expect(chunks[2].headingPath).toBe('Chapter 2');
    expect(chunks[2].content).toContain('Chapter 2');
    expect(chunks[2].content).toContain('Para 3');
  });

  it('should split large sections at paragraph boundaries', () => {
    // Each paragraph is ~1000 chars, limit is 8000
    const largeContent = [
      { type: 'heading', level: 1, content: 'Big Chapter' },
      ...Array(10).fill(0).map((_, i) => ({ 
        type: 'paragraph', 
        content: 'Paragraph ' + i + ' '.repeat(1000) 
      }))
    ];

    const chunks = chunkByHeadings(largeContent);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].headingPath).toBe('Big Chapter');
    expect(chunks[1].headingPath).toBe('Big Chapter');
  });

  it('should estimate tokens correctly (~4 chars per token)', () => {
    const content = [
      { type: 'heading', level: 1, content: 'Test' },
      { type: 'paragraph', content: 'Hello World' } // 11 chars
    ];

    const chunks = chunkByHeadings(content);
    // "Test\n\nHello World" = 4 + 2 + 11 = 17 chars
    // 17 / 4 = 4.25 -> 5 tokens
    expect(chunks[0].tokenCount).toBe(5);
  });
});
