import { ChromaClient } from 'chromadb';
import { loadDatabaseConfig } from '../lib/db/config';
import { ERROR_CODES, sanitizeErrorMessage } from '../lib/errors';

/**
 * Global object for caching ChromaDB client and connection status
 */
let cached = global.chroma;

if (!cached) {
  cached = global.chroma = { client: null, collection: null, lastError: null, isAvailable: false };
}

/**
 * Initializes the ChromaDB client using configuration from loadDatabaseConfig().
 * @returns {import('chromadb').ChromaClient|null} ChromaDB client or null if unavailable
 */
export function getClient() {
  if (cached.client) return cached.client;

  try {
    const { chroma: config } = loadDatabaseConfig();
    
    if (!config) {
      console.warn('[ChromaDB] No ChromaDB configuration found, running in unavailable mode');
      return null;
    }

    console.info(`[ChromaDB] Initializing client for host: ${config.host}`);
    
    cached.client = new ChromaClient({
      path: config.host,
    });
    
    return cached.client;
  } catch (err) {
    const message = sanitizeErrorMessage(err);
    console.error(`[ChromaDB] Client initialization error: ${message}`);
    cached.lastError = message;
    return null;
  }
}

/**
 * Gets or creates the default ChromaDB collection.
 * Collection name is read from environment variable CHROMA_COLLECTION or defaults to 'lms_embeddings'.
 * @returns {Promise<import('chromadb').Collection|null>} ChromaDB collection or null if unavailable
 */
export async function getCollection() {
  if (cached.collection) return cached.collection;

  const client = getClient();
  if (!client) return null;

  try {
    const { chroma: config } = loadDatabaseConfig();
    const collectionName = config?.collection || 'lms_embeddings';
    
    console.info(`[ChromaDB] Getting or creating collection: ${collectionName}`);
    
    cached.collection = await client.getOrCreateCollection({
      name: collectionName,
      // We handle embeddings manually using Gemini, so we provide a dummy 
      // embedding function to avoid Chroma's default which requires extra packages.
      embeddingFunction: {
        generate: async (texts) => texts.map(() => [])
      }
    });
    
    cached.isAvailable = true;
    cached.lastError = null;
    
    return cached.collection;
  } catch (err) {
    const message = sanitizeErrorMessage(err);
    console.error(`[ChromaDB] Collection error: ${message}`);
    cached.lastError = message;
    cached.isAvailable = false;
    
    // In production, we don't want to throw errors from here to allow graceful degradation
    // But we return null to signal unavailability
    return null;
  }
}

/**
 * Adds embeddings for semantic chunks to the collection.
 * @param {Array<{id: string, embedding: number[], document: string, metadata: object}>} embeddings - Array of embeddings to add
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addEmbeddings(embeddings) {
  const collection = await getCollection();
  if (!collection) return { success: false, error: 'ChromaDB collection unavailable' };

  try {
    const ids = embeddings.map(e => e.id);
    const embeddingVectors = embeddings.map(e => e.embedding);
    const documents = embeddings.map(e => e.document);
    const metadatas = embeddings.map(e => e.metadata);

    await collection.add({
      ids,
      embeddings: embeddingVectors,
      documents,
      metadatas
    });
    return { success: true };
  } catch (err) {
    const message = sanitizeErrorMessage(err);
    console.error(`[ChromaDB] Add embeddings error: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Removes all embeddings associated with a specific lecture document.
 * @param {string} lectureDocumentId - The ID of the document to unindex
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeEmbeddingsByDocument(lectureDocumentId) {
  const collection = await getCollection();
  if (!collection) return { success: false, error: 'ChromaDB collection unavailable' };

  try {
    await collection.delete({
      where: { lectureDocumentId: lectureDocumentId.toString() }
    });
    return { success: true };
  } catch (err) {
    const message = sanitizeErrorMessage(err);
    console.error(`[ChromaDB] Delete embeddings error: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Fetches all chunks associated with a specific lesson.
 * @param {string} lessonId - The ID of the lesson to fetch chunks for
 * @returns {Promise<any[]>} Array of chunks
 */
export async function getChunksByLesson(lessonId) {
  const collection = await getCollection();
  if (!collection) return [];

  try {
    const results = await collection.get({
      where: { lessonId: lessonId.toString() }
    });
    
    // Transform ChromaDB output into a cleaner format
    const transformed = [];
    if (results.ids) {
      for (let i = 0; i < results.ids.length; i++) {
        transformed.push({
          id: results.ids[i],
          document: results.documents[i],
          metadata: results.metadatas[i]
        });
      }
    }
    return transformed;
  } catch (err) {
    console.error(`[ChromaDB] Get chunks by lesson error: ${sanitizeErrorMessage(err)}`);
    return [];
  }
}

/**
 * Queries embeddings in a course-scoped context.
 * @param {number[]} queryEmbedding - The embedding vector of the search query
 * @param {string} courseId - The course ID for scoping
 * @param {number} limit - Maximum number of results
 * @returns {Promise<any[]>} Array of query results
 */
export async function queryEmbeddings(queryEmbedding, courseId, limit = 10) {
  const collection = await getCollection();
  if (!collection) return [];

  try {
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      where: { courseId: courseId.toString() }
    });
    
    // Transform ChromaDB output into a cleaner format
    const transformed = [];
    if (results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        transformed.push({
          id: results.ids[0][i],
          score: results.distances[0][i], // Lower is better in ChromaDB
          document: results.documents[0][i],
          metadata: results.metadatas[0][i]
        });
      }
    }
    return transformed;
  } catch (err) {
    console.error(`[ChromaDB] Query embeddings error: ${sanitizeErrorMessage(err)}`);
    return [];
  }
}

/**
 * Checks the health of the ChromaDB connection.
 * Performs a heartbeat check and measures response time.
 * @returns {Promise<{status: string, responseTimeMs: number, message: string, lastError: string|null}>} Health status object
 */
export async function getHealthStatus() {
  const startTime = Date.now();
  const client = getClient();
  
  if (!client) {
    return {
      status: 'unavailable',
      responseTimeMs: 0,
      message: 'Client not initialized (missing configuration)',
      lastError: cached.lastError,
    };
  }

  try {
    // Attempt a heartbeat check
    await client.heartbeat();
    
    const responseTimeMs = Date.now() - startTime;
    cached.isAvailable = true;
    cached.lastError = null;

    return {
      status: 'healthy',
      responseTimeMs,
      message: 'Connected',
      lastError: null,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    cached.isAvailable = false;
    const message = sanitizeErrorMessage(err);
    cached.lastError = message;

    console.warn(`[ChromaDB] Health check failed: ${message}`);
    
    return {
      status: 'unhealthy',
      responseTimeMs,
      message: 'Connection failed',
      lastError: message,
    };
  }
}

/**
 * Helper to determine if ChromaDB features should be attempted.
 * Returns true if the last health check or initialization was successful.
 * @returns {boolean} True if ChromaDB is considered available
 */
export function isAvailable() {
  return cached.isAvailable;
}
