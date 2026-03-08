# Data Model: Add Oral Question Type

## Entities

### Question

Extends the existing `Question` schema to support the new `oral` type.

**New Fields:**
- `type`: String (Enum: `'multiple_choice'`, `'text'`, `'oral'`)
- `referenceAnswer`: String (Optional, but required if `type` is `'oral'`) - The standard text the instructor provides for AI comparison.

**Validation Rules:**
- If `type === 'oral'`, `referenceAnswer` must be a non-empty string.
- (Implicit) Other question types (like `multiple_choice` options) should not be required when `type === 'oral'`.

### StudentAnswer

Extends the existing `Answer` schema to support the response to an oral question.

**New Fields:**
- `audioUrl`: String (Optional) - URL pointing to the raw audio file in cloud storage.
- `transcribedText`: String (Optional) - The text resulting from the Whisper transcription.
- `gradingStatus`: String (Enum: `'pending'`, `'evaluating'`, `'completed'`, `'failed'`) - Tracks the async evaluation process.

**Validation Rules:**
- If answering an `oral` question, either `audioUrl` must be present, OR the answer must be marked as skipped/unanswerable (handling the microphone failure edge case).
- `transcribedText` and `gradingStatus` are managed by the server and should not be mutated directly by the client.

## State Transitions

### AI Evaluation Flow

1.  **Student Submits**: Client uploads audio to Cloud Storage -> Client submits Answer with `audioUrl`.
2.  **Server Receives**: Server saves Answer with `gradingStatus = 'pending'`.
3.  **Async Job Starts**: Server sets `gradingStatus = 'evaluating'`.
4.  **Transcription**: Server downloads audio from `audioUrl` and sends to OpenAI Whisper. Saves `transcribedText`.
5.  **Evaluation**: Server sends `transcribedText` and Question's `referenceAnswer` to OpenAI GPT.
6.  **Completion**: GPT returns a score/feedback. Server updates Answer score and sets `gradingStatus = 'completed'`.
    -   **Failure**: If any step fails, set `gradingStatus = 'failed'`.
