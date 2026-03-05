/**
 * lib/quiz-storage.js
 * 
 * Shared utility for managing quiz answers in localStorage.
 * Provides a reliable backup for student answers to prevent data loss 
 * during network interruptions or page refreshes.
 */

const STORAGE_PREFIX = 'quiz_answers_';
const STALE_HOURS = 24;

/**
 * Saves quiz answers and metadata to localStorage.
 * 
 * @param {string} attemptId - The unique ID of the quiz attempt
 * @param {Object} data - The data to save
 * @param {Object} data.answers - Map of questionId to selectedOptionIds
 * @param {string} data.quizId - The ID of the quiz
 * @param {string} [data.expiresAt] - Optional ISO timestamp for when the attempt expires
 */
export function saveAnswers(attemptId, data) {
  if (typeof window === 'undefined') return;
  
  const key = `${STORAGE_PREFIX}${attemptId}`;
  const state = {
    ...data,
    attemptId,
    lastSaved: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save quiz answers to localStorage:', error);
  }
}

/**
 * Loads quiz answers and metadata from localStorage.
 * 
 * @param {string} attemptId - The unique ID of the quiz attempt
 * @returns {Object|null} The saved state or null if not found
 */
export function loadAnswers(attemptId) {
  if (typeof window === 'undefined') return null;
  
  const key = `${STORAGE_PREFIX}${attemptId}`;
  const raw = localStorage.getItem(key);
  
  if (!raw) return null;
  
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse quiz answers from localStorage:', error);
    return null;
  }
}

/**
 * Clears saved answers for a specific attempt.
 * 
 * @param {string} attemptId - The unique ID of the quiz attempt
 */
export function clearAnswers(attemptId) {
  if (typeof window === 'undefined') return;
  
  const key = `${STORAGE_PREFIX}${attemptId}`;
  localStorage.removeItem(key);
}

/**
 * Cleans up stale quiz entries from localStorage (>24h old).
 * Should be called on initialization or page load.
 */
export function cleanupStale() {
  if (typeof window === 'undefined') return;
  
  const now = new Date();
  const keysToRemove = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.lastSaved) {
          const lastSaved = new Date(data.lastSaved);
          const diffHours = (now - lastSaved) / (1000 * 60 * 60);
          
          if (diffHours > STALE_HOURS) {
            keysToRemove.push(key);
          }
        }
      } catch (e) {
        // If it's not valid JSON or missing lastSaved, we might want to keep it or clear it
        // For safety, we'll clear it if it's our prefix but unreadable
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Checks if localStorage has newer answers than the server timestamp.
 * 
 * @param {string} attemptId - The unique ID of the quiz attempt
 * @param {string} serverTimestamp - ISO timestamp from the server (e.g., attempt.updatedAt)
 * @returns {boolean} True if local data is newer
 */
export function hasNewerAnswers(attemptId, serverTimestamp) {
  const local = loadAnswers(attemptId);
  if (!local || !local.lastSaved) return false;
  
  const localTime = new Date(local.lastSaved);
  const serverTime = new Date(serverTimestamp);
  
  return localTime > serverTime;
}
