import stringSimilarity from 'string-similarity';

/**
 * Normalizes text for comparison.
 * @param {string} text 
 * @returns {string}
 */
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

/**
 * Aligns document text blocks with a transcript based on word-level similarity.
 * @param {Array<Object>} structuredContent - From LectureDocument (e.g., paragraphs, headings)
 * @param {Array<Object>} transcriptWords - From VideoTranscript (word, start, end)
 * @param {number} threshold - Confidence threshold (0-100)
 * @returns {Array<Object>} - Alignments for each block
 */
export function alignTextWithTranscript(structuredContent, transcriptWords, threshold = 70) {
  if (!transcriptWords || transcriptWords.length === 0) {
    return structuredContent.map((_, index) => ({
      blockIndex: index,
      startSeconds: null,
      endSeconds: null,
      confidence: 0,
      status: 'unable-to-align'
    }));
  }

  // Normalize transcript words
  const transcriptNorm = transcriptWords.map(w => normalize(w.word));
  const fullTranscriptNorm = transcriptNorm.join(' ');

  let currentTranscriptIndex = 0;

  return structuredContent.map((block, blockIndex) => {
    const blockNorm = normalize(block.content);
    if (!blockNorm) {
      return {
        blockIndex,
        startSeconds: null,
        endSeconds: null,
        confidence: 100,
        status: 'not-spoken'
      };
    }

    // Heuristic: Search for the block in a sliding window starting from currentTranscriptIndex
    // We expect blocks to appear in order.
    const searchRange = transcriptNorm.slice(currentTranscriptIndex, currentTranscriptIndex + 500); // 500 words ahead
    const searchStr = searchRange.join(' ');

    // If block is very short, exact match might be risky, but similarity helps
    const findBestWindow = () => {
      let bestMatch = { score: 0, start: -1, end: -1 };
      const blockWords = blockNorm.split(' ');
      const blockWordCount = blockWords.length;
      
      // Try slightly different window sizes around the block word count
      const windowSizes = [
        Math.max(1, Math.floor(blockWordCount * 0.8)),
        blockWordCount,
        Math.ceil(blockWordCount * 1.2)
      ].filter((v, i, a) => a.indexOf(v) === i); // Unique sizes

      for (const windowSize of windowSizes) {
        // Look for a matching window
        for (let i = 0; i < searchRange.length - windowSize + 1; i++) {
          const windowText = searchRange.slice(i, i + windowSize).join(' ');
          const score = stringSimilarity.compareTwoStrings(blockNorm, windowText);
          
          if (score > bestMatch.score) {
            bestMatch = { score, start: i, end: i + windowSize };
          }

          if (score > 0.95) break;
        }
        if (bestMatch.score > 0.95) break;
      }

      return bestMatch;
    };

    const match = findBestWindow();
    const confidence = Math.round(match.score * 100);

    if (match.score >= (threshold / 100)) {
      const globalStart = currentTranscriptIndex + match.start;
      const globalEnd = currentTranscriptIndex + match.end - 1;

      const result = {
        blockIndex,
        startSeconds: transcriptWords[globalStart].start,
        endSeconds: transcriptWords[globalEnd].end,
        confidence,
        status: 'aligned'
      };

      // Move the index forward for the next block
      currentTranscriptIndex = Math.min(globalEnd + 1, transcriptWords.length - 1);
      return result;
    } else {
      // If we can't find it in the current search range, it's either skipped or way ahead.
      // We'll mark as unable-to-align but don't move the index forward yet.
      return {
        blockIndex,
        startSeconds: null,
        endSeconds: null,
        confidence,
        status: 'unable-to-align'
      };
    }
  });
}
