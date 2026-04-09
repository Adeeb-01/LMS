import mammoth from "mammoth";

/**
 * Extracts text and basic structure from a .docx file buffer
 * @param {Buffer} buffer - The file buffer
 * @returns {Promise<Object>} - The extracted text and structure
 */
export async function extractTextFromDocx(buffer) {
  const startTime = Date.now();

  try {
    // 1. Extract full text for search indexing
    const rawResult = await mammoth.extractRawText({ buffer });
    const fullText = rawResult.value;

    // 2. Extract HTML to derive structure
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const html = htmlResult.value;

    // 3. Simple parser for structured content
    // We'll use regex to split the HTML into blocks and identify types
    const structuredContent = parseHtmlToBlocks(html);

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    return {
      fullText,
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      structuredContent,
      extractedAt: new Date(),
      extractionDurationMs: durationMs,
      warnings: [...rawResult.messages, ...htmlResult.messages]
    };
  } catch (error) {
    console.error("DOCX Extraction Error:", error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

/**
 * Very basic HTML parser to convert mammoth HTML output to our structured format
 * Handles: <p>, <h1>..<h6>, <li>, <table>
 */
function parseHtmlToBlocks(html) {
  const blocks = [];
  
  // Use regex to match tags and their content
  // Note: This is a simple parser specifically for mammoth's clean HTML output
  const tagRegex = /<(p|h[1-6]|li|tr|table)>(.*?)<\/\1>/gs;
  let match;

  // For lists, mammoth uses <li> directly if we don't configure it
  // We'll treat each <li> as a block
  
  while ((match = tagRegex.exec(html)) !== null) {
    const [_, tag, content] = match;
    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
    
    if (!cleanContent && tag !== 'table' && tag !== 'tr') continue;

    if (tag.startsWith('h')) {
      blocks.push({
        type: 'heading',
        level: parseInt(tag.substring(1)),
        content: cleanContent
      });
    } else if (tag === 'li') {
      blocks.push({
        type: 'list',
        level: 1, // Default nesting level
        content: cleanContent
      });
    } else if (tag === 'table') {
      // For MVP, we'll just extract text from table cells and treat as paragraph or generic text
      // In a real scenario, we might want a more complex table structure
      const tableText = content.replace(/<[^>]*>/g, " ").trim();
      if (tableText) {
        blocks.push({
          type: 'table',
          content: tableText
        });
      }
    } else {
      // Default to paragraph
      blocks.push({
        type: 'paragraph',
        content: cleanContent
      });
    }
  }

  // If no blocks were found but we have text, add as a single paragraph
  if (blocks.length === 0 && html.replace(/<[^>]*>/g, "").trim()) {
    blocks.push({
      type: 'paragraph',
      content: html.replace(/<[^>]*>/g, "").trim()
    });
  }

  return blocks;
}
