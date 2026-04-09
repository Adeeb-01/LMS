import { extractTextFromDocx } from '../../lib/docx/extractor';
import mammoth from 'mammoth';

jest.mock('mammoth');

describe('DOCX Extractor Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract text and structure from a valid docx buffer', async () => {
    const mockBuffer = Buffer.from('mock-docx-content');
    
    mammoth.extractRawText.mockResolvedValue({
      value: 'Chapter 1: Intro\nThis is a paragraph.',
      messages: []
    });

    mammoth.convertToHtml.mockResolvedValue({
      value: '<h1>Chapter 1: Intro</h1><p>This is a paragraph.</p>',
      messages: []
    });

    const result = await extractTextFromDocx(mockBuffer);

    expect(result.fullText).toBe('Chapter 1: Intro\nThis is a paragraph.');
    expect(result.wordCount).toBe(7);
    expect(result.structuredContent).toHaveLength(2);
    expect(result.structuredContent[0]).toEqual({
      type: 'heading',
      level: 1,
      content: 'Chapter 1: Intro'
    });
    expect(result.structuredContent[1]).toEqual({
      type: 'paragraph',
      content: 'This is a paragraph.'
    });
    expect(result.extractedAt).toBeInstanceOf(Date);
    expect(result.extractionDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle lists and tables in mammoth output', async () => {
    const mockBuffer = Buffer.from('mock-docx-content');
    
    mammoth.extractRawText.mockResolvedValue({
      value: 'Item 1 Item 2 Table content',
      messages: []
    });

    mammoth.convertToHtml.mockResolvedValue({
      value: '<ul><li>Item 1</li><li>Item 2</li></ul><table><tr><td>Table content</td></tr></table>',
      messages: []
    });

    const result = await extractTextFromDocx(mockBuffer);

    expect(result.structuredContent).toHaveLength(3);
    expect(result.structuredContent[0]).toEqual({
      type: 'list',
      level: 1,
      content: 'Item 1'
    });
    expect(result.structuredContent[1]).toEqual({
      type: 'list',
      level: 1,
      content: 'Item 2'
    });
    expect(result.structuredContent[2]).toEqual({
      type: 'table',
      content: 'Table content'
    });
  });

  it('should throw an error if mammoth fails', async () => {
    const mockBuffer = Buffer.from('mock-docx-content');
    mammoth.extractRawText.mockRejectedValue(new Error('Mammoth extraction failed'));

    await expect(extractTextFromDocx(mockBuffer)).rejects.toThrow('Failed to extract text from DOCX: Mammoth extraction failed');
  });

  it('should handle empty mammoth output gracefully', async () => {
    const mockBuffer = Buffer.from('mock-docx-content');
    
    mammoth.extractRawText.mockResolvedValue({
      value: '',
      messages: []
    });

    mammoth.convertToHtml.mockResolvedValue({
      value: '',
      messages: []
    });

    const result = await extractTextFromDocx(mockBuffer);

    expect(result.fullText).toBe('');
    expect(result.wordCount).toBe(0);
    expect(result.structuredContent).toHaveLength(0);
  });
});
