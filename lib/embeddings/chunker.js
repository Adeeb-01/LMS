/**
 * Splits structured content into semantic chunks based on heading hierarchy.
 * 
 * Requirements:
 * - Group content blocks by heading hierarchy.
 * - Generate headingPath (e.g., "Chapter 1 > Section 1.1").
 * - Target limit: 2000 tokens (~8000 characters).
 * - Split at paragraph boundaries, preserve heading context in metadata.
 * 
 * @param {Array} structuredContent - Array of content blocks from LectureDocument
 * @returns {Array} Array of TextChunk objects: { content, headingPath, headingLevel, chunkIndex, tokenCount }
 */
export function chunkByHeadings(structuredContent) {
  if (!structuredContent || !Array.isArray(structuredContent) || structuredContent.length === 0) {
    return [];
  }

  const CHAR_LIMIT = 8000; // Approximately 2000 tokens (4 chars/token)
  const chunks = [];
  let currentPath = []; // Tracks hierarchy: [{ level, content }]
  let currentChunkText = "";
  let currentSectionPath = "";
  let currentSectionLevel = 0;
  let chunkIndex = 0;

  /**
   * Internal helper to finalize and store a chunk
   */
  function addChunk(content, path, level) {
    const trimmed = content.trim();
    if (!trimmed) return;
    
    chunks.push({
      content: trimmed,
      headingPath: path,
      headingLevel: level,
      chunkIndex: chunkIndex++,
      tokenCount: Math.ceil(trimmed.length / 4) // Rough estimation per research.md
    });
  }

  /**
   * Flushes current buffer into a chunk
   */
  function flush() {
    if (currentChunkText.trim()) {
      addChunk(currentChunkText, currentSectionPath, currentSectionLevel);
      currentChunkText = "";
    }
  }

  for (const block of structuredContent) {
    if (block.type === 'heading') {
      // Flush any existing content before starting a new heading section
      flush();
      
      const level = block.level || 1;
      
      // Update path hierarchy: remove deeper or sibling levels
      while (currentPath.length > 0 && currentPath[currentPath.length - 1].level >= level) {
        currentPath.pop();
      }
      currentPath.push({ level, content: block.content });
      
      currentSectionPath = currentPath.map(h => h.content).join(' > ');
      currentSectionLevel = level;
      
      // Start the next chunk with the heading text itself
      currentChunkText = block.content;
    } else {
      const blockText = block.content;
      
      // Handle extremely large blocks (e.g., very long paragraphs)
      if (blockText.length > CHAR_LIMIT) {
        // Flush what we have before the huge block
        flush();
        
        let remaining = blockText;
        while (remaining.length > CHAR_LIMIT) {
          const splitPos = findBestSplitPoint(remaining, CHAR_LIMIT);
          addChunk(remaining.substring(0, splitPos), currentSectionPath, currentSectionLevel);
          remaining = remaining.substring(splitPos).trim();
        }
        currentChunkText = remaining;
        continue;
      }

      // Check if adding this block exceeds limit. 
      // If it does, flush current buffer and start a new one.
      // This ensures we split at "paragraph boundaries" (between blocks).
      const nextText = currentChunkText ? currentChunkText + "\n\n" + blockText : blockText;
      if (nextText.length > CHAR_LIMIT) {
        flush();
        currentChunkText = blockText;
      } else {
        currentChunkText = nextText;
      }
    }
  }

  // Final flush for any remaining content
  flush();

  return chunks;
}

/**
 * Finds a good split point in a long string, preferring sentence ends or spaces.
 * 
 * @param {string} text - The text to split
 * @param {number} limit - The character limit
 * @returns {number} The split position
 */
function findBestSplitPoint(text, limit) {
  if (text.length <= limit) return text.length;
  
  const searchRange = text.substring(0, limit);
  
  // Try to find the last sentence end (., ?, !)
  const lastSentenceEnd = Math.max(
    searchRange.lastIndexOf('. '),
    searchRange.lastIndexOf('? '),
    searchRange.lastIndexOf('! ')
  );
  
  // If we found a sentence end in the last 30% of the limit, split there
  if (lastSentenceEnd > limit * 0.7) {
    return lastSentenceEnd + 1;
  }
  
  // Otherwise, try to find the last space in the last 50%
  const lastSpace = searchRange.lastIndexOf(' ');
  if (lastSpace > limit * 0.5) {
    return lastSpace;
  }
  
  // Fallback to hard split
  return limit;
}
