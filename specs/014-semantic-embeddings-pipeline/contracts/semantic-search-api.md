# API Contract: Semantic Search

**Feature**: 014-semantic-embeddings-pipeline  
**Date**: 2026-03-12

## Overview

REST API for semantic search across indexed lecture content. All endpoints require authentication and enforce course enrollment for students.

## Base URL

```
/api/semantic-search
```

## Authentication

All endpoints require a valid NextAuth session. The session user ID is used for enrollment verification.

## Endpoints

### POST /api/semantic-search

Perform semantic search across course content.

**Request Body**:
```json
{
  "query": "string (3-500 chars, required)",
  "courseId": "string (ObjectId, required)",
  "limit": "number (1-10, optional, default: 5)",
  "threshold": "number (0-1, optional, default: 0.7)"
}
```

**Response (200 OK)**:
```json
{
  "query": "What is the role of mitochondria?",
  "results": [
    {
      "chunkId": "embed-abc123-def456-0",
      "score": 0.89,
      "text": "Mitochondria are the powerhouse of the cell, responsible for producing ATP through cellular respiration...",
      "headingPath": "Chapter 3 > Cell Biology > Organelles",
      "lessonId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "lessonTitle": "Introduction to Cell Biology",
      "courseId": "65f1a2b3c4d5e6f7a8b9c0d2"
    }
  ],
  "totalMatches": 7,
  "searchTimeMs": 145
}
```

**Response (400 Bad Request)** - Invalid input:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Query must be at least 3 characters",
  "field": "query"
}
```

**Response (401 Unauthorized)** - Not authenticated:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**Response (403 Forbidden)** - Not enrolled in course:
```json
{
  "error": "FORBIDDEN",
  "message": "You are not enrolled in this course"
}
```

**Response (503 Service Unavailable)** - ChromaDB unavailable:
```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Search service temporarily unavailable. Please try again later."
}
```

### GET /api/semantic-search/status

Get the embedding/indexing status for a course or lesson.

**Query Parameters**:
- `courseId` (required): Course to check
- `lessonId` (optional): Specific lesson to check

**Response (200 OK)** - Course-level status:
```json
{
  "courseId": "65f1a2b3c4d5e6f7a8b9c0d2",
  "totalLessons": 12,
  "indexedLessons": 10,
  "pendingLessons": 1,
  "failedLessons": 1,
  "totalChunks": 245,
  "lastIndexedAt": "2026-03-12T10:30:00Z"
}
```

**Response (200 OK)** - Lesson-level status:
```json
{
  "lessonId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "status": "indexed",
  "chunksIndexed": 15,
  "lastIndexedAt": "2026-03-12T10:30:00Z",
  "jobId": "65f1a2b3c4d5e6f7a8b9c0d3"
}
```

**Status values**: `pending`, `processing`, `indexed`, `failed`, `none` (no document)

## Server Actions

### searchCourseContent

Server Action for semantic search (alternative to API endpoint).

**Location**: `app/actions/semantic-search.js`

**Signature**:
```javascript
export async function searchCourseContent(query, courseId, options = {}) {
  // options: { limit: 5, threshold: 0.7 }
  // Returns: SearchResponse object
}
```

**Usage**:
```javascript
'use client';
import { searchCourseContent } from '@/app/actions/semantic-search';

const results = await searchCourseContent(
  'What is photosynthesis?',
  courseId,
  { limit: 5 }
);
```

### triggerIndexing

Trigger re-indexing of a lecture document (instructor only).

**Location**: `app/actions/indexing.js`

**Signature**:
```javascript
export async function triggerIndexing(lectureDocumentId) {
  // Returns: { jobId: string, status: 'pending' }
}
```

### cancelIndexing

Cancel an in-progress indexing job.

**Location**: `app/actions/indexing.js`

**Signature**:
```javascript
export async function cancelIndexing(jobId) {
  // Returns: { success: boolean }
}
```

## Rate Limiting

- Search: 30 requests per minute per user
- Status: 60 requests per minute per user

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | User not enrolled in course |
| `NOT_FOUND` | 404 | Course or lesson not found |
| `SERVICE_UNAVAILABLE` | 503 | ChromaDB or Gemini API unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Examples

### cURL - Search

```bash
curl -X POST https://lms.example.com/api/semantic-search \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "query": "explain the krebs cycle",
    "courseId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "limit": 3
  }'
```

### JavaScript - Search with Server Action

```javascript
'use client';

import { useState } from 'react';
import { searchCourseContent } from '@/app/actions/semantic-search';

export function CourseSearch({ courseId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await searchCourseContent(query, courseId);
      setResults(response.results);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        placeholder="Ask a question about this course..."
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      {results.map((result) => (
        <div key={result.chunkId}>
          <h4>{result.headingPath}</h4>
          <p>{result.text}</p>
          <small>From: {result.lessonTitle} (Score: {result.score.toFixed(2)})</small>
        </div>
      ))}
    </div>
  );
}
```
