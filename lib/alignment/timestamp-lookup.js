import { dbConnect } from "@/service/mongo";
import { VideoTranscript } from "@/model/video-transcript.model";
import { LectureDocument } from "@/model/lecture-document.model";

/**
 * Finds the timestamp range for a given piece of text in a lesson.
 * Useful when generating questions from synchronized text.
 * 
 * @param {string} lessonId - The lesson ID
 * @param {string} searchText - The text snippet to find timestamps for
 * @returns {Promise<Object|null>} - { startSeconds, endSeconds } or null
 */
export async function lookupTimestampForText(lessonId, searchText) {
  await dbConnect();

  // 1. Get the transcript
  const transcript = await VideoTranscript.findOne({ lessonId }).lean();
  if (!transcript || !transcript.alignments || transcript.alignments.length === 0) {
    return null;
  }

  // 2. Get the lecture document to match text to block index
  const doc = await LectureDocument.findOne({ lessonId }).lean();
  if (!doc || !doc.extractedText || !doc.extractedText.structuredContent) {
    return null;
  }

  // 3. Find the best matching block index for the searchText
  // Simple heuristic: exact match or contains
  const normalizedSearch = searchText.toLowerCase().trim();
  const blockIndex = doc.extractedText.structuredContent.findIndex(block => 
    block.content.toLowerCase().includes(normalizedSearch)
  );

  if (blockIndex === -1) return null;

  // 4. Find alignment for this block
  const alignment = transcript.alignments.find(a => a.blockIndex === blockIndex);
  if (!alignment || alignment.status !== 'aligned') {
    return null;
  }

  return {
    startSeconds: alignment.startSeconds,
    endSeconds: alignment.endSeconds
  };
}

/**
 * Looks up timestamps for a question based on its sourceChunkId.
 * Source chunk ID format: embed-{courseId}-{lectureDocId}-{chunkIndex}
 * 
 * @param {Object} question - The question object
 * @returns {Promise<Object|null>} - { start, end, confidence } or null
 */
export async function getQuestionTimestamp(question) {
  if (!question.sourceChunkId) return null;
  
  await dbConnect();

  // 1. Extract IDs from sourceChunkId (embed-courseId-lectureDocId-chunkIndex)
  const parts = question.sourceChunkId.split('-');
  if (parts.length < 4) return null;

  const lectureDocumentId = parts[2];
  const chunkIndex = parseInt(parts[3]);

  // 2. Get the transcript for this document
  // Note: chunkIndex in chroma matches blockIndex in alignments
  const transcript = await VideoTranscript.findOne({ 
    'alignments.lectureDocumentId': lectureDocumentId 
  }).lean();

  if (!transcript || !transcript.alignments) {
    // Try lesson lookup if document ID doesn't work (backward compatibility or different schema)
    // Actually, VideoTranscript has lessonId, so let's find the document to get lessonId if needed
    const doc = await LectureDocument.findById(lectureDocumentId).lean();
    if (doc) {
      const ts = await VideoTranscript.findOne({ lessonId: doc.lessonId }).lean();
      if (ts && ts.alignments) {
        const alignment = ts.alignments.find(a => a.blockIndex === chunkIndex);
        if (alignment && alignment.status === 'aligned') {
          return {
            start: alignment.startSeconds,
            end: alignment.endSeconds,
            confidence: alignment.confidence
          };
        }
      }
    }
    return null;
  }

  const alignment = transcript.alignments.find(a => 
    a.blockIndex === chunkIndex && 
    a.status === 'aligned'
  );

  return alignment ? {
    start: alignment.startSeconds,
    end: alignment.endSeconds,
    confidence: alignment.confidence
  } : null;
}
