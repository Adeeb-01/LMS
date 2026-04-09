/**
 * Splits text into semantic chunks for vector indexing.
 * @param {string} text - Full text content to chunk
 * @param {number} wordsPerChunk - Target word count per chunk (default 500)
 * @param {number} overlap - Word overlap between chunks (default 50)
 * @returns {string[]} Array of text chunks
 */
export function chunkText(text, wordsPerChunk = 500, overlap = 50) {
  if (!text) return [];

  const words = text.split(/\s+/);
  if (words.length <= wordsPerChunk) {
    return [text];
  }

  const chunks = [];
  let currentPos = 0;

  while (currentPos < words.length) {
    const endPos = Math.min(currentPos + wordsPerChunk, words.length);
    const chunk = words.slice(currentPos, endPos).join(' ');
    
    if (chunk.trim()) {
      chunks.push(chunk);
    }

    if (endPos === words.length) break;
    
    // Advance by wordsPerChunk minus overlap
    currentPos += (wordsPerChunk - overlap);
  }

  return chunks;
}
