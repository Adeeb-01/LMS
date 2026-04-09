import { getCollection } from './chroma';
import { chunkText } from '@/lib/docx/chunker';
import { generateBatchEmbeddings } from '@/lib/embeddings/gemini';

/**
 * Indexes a lecture document in ChromaDB for semantic search.
 * @param {Object} lectureDoc - The lecture document object from MongoDB
 */
export async function indexLectureDocument(lectureDoc) {
  const collection = await getCollection();
  if (!collection) {
    console.warn('[Search] ChromaDB unavailable, skipping indexing');
    return;
  }

  const { _id, lessonId, courseId, extractedText } = lectureDoc;
  const fullText = extractedText?.fullText;

  if (!fullText) {
    console.warn('[Search] No extracted text to index for document', _id);
    return;
  }

  try {
    // 1. Chunk the text
    const chunks = chunkText(fullText);
    
    // 1.5 Generate embeddings for chunks
    console.info(`[Search] Generating embeddings for ${chunks.length} chunks...`);
    const embeddings = await generateBatchEmbeddings(chunks);
    
    // 2. Prepare documents, IDs, and metadatas
    const ids = chunks.map((_, index) => `lecture-doc-${_id}-chunk-${index}`);
    const documents = chunks;
    const metadatas = chunks.map((_, index) => ({
      type: 'lecture_document',
      lectureDocumentId: _id.toString(),
      lessonId: lessonId.toString(),
      courseId: courseId.toString(),
      chunkIndex: index
    }));

    // 3. Add to ChromaDB
    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas
    });

    console.info(`[Search] Indexed ${chunks.length} chunks for document ${_id}`);
  } catch (error) {
    console.error(`[Search] Error indexing document ${_id}:`, error);
  }
}

/**
 * Removes a lecture document from semantic search index.
 * @param {string} lectureDocumentId - The document ID to remove
 */
export async function unindexLectureDocument(lectureDocumentId) {
  const collection = await getCollection();
  if (!collection) return;

  try {
    await collection.delete({
      where: { lectureDocumentId: lectureDocumentId.toString() }
    });
    console.info(`[Search] Unindexed document ${lectureDocumentId}`);
  } catch (error) {
    console.error(`[Search] Error unindexing document ${lectureDocumentId}:`, error);
  }
}
