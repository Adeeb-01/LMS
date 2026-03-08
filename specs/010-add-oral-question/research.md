# Research: Add Oral Question Type

## Clarification: Testing Framework
- **Decision**: Jest + React Testing Library (for frontend) and Jest + Node mocks (for backend).
- **Rationale**: The project currently lacks a testing framework in `package.json`. Jest + RTL is the industry standard for Next.js applications and aligns with the constitution's requirement for rigorous testing.
- **Alternatives considered**: Vitest (faster, but slightly different ecosystem), Playwright (for E2E, but we need unit/contract tests first).

## Dependency: OpenAI Integration
- **Decision**: Use the official `openai` Node.js SDK.
- **Rationale**: Provides robust, typed access to both Whisper (STT) and GPT models.
- **Alternatives considered**: Direct REST API calls via `fetch` (more boilerplate, harder to maintain).

## Dependency: Cloud Object Storage
- **Decision**: AWS SDK (`@aws-sdk/client-s3`) with any S3-compatible provider (e.g., AWS S3, Cloudflare R2).
- **Rationale**: Industry standard, highly scalable, and supports pre-signed URLs for secure, direct-from-browser uploads.
- **Alternatives considered**: Uploading directly to the Next.js API route and then to storage (increases server load and bandwidth).

## Best Practices: Audio Recording in Browser
- **Decision**: Use the native `MediaRecorder` API.
- **Rationale**: Built into modern browsers, no external heavy dependencies required. We will capture audio in WebM or MP4 format, which Whisper supports.
- **Alternatives considered**: Third-party recording libraries (adds unnecessary bundle size).

## Architecture: Asynchronous Evaluation
- **Decision**: Background processing queue or async API route. Since Vercel/Next.js serverless functions have timeouts, we should return a 202 Accepted immediately and trigger a background job or use a background function if deployed on Vercel, or a simple async Node process if self-hosted. For MVP, we will update the database status to "pending", kick off an async Promise, and let the client poll or listen for completion.
- **Rationale**: OpenAI Whisper and GPT calls can take 5-15 seconds combined, which risks HTTP request timeouts.
- **Alternatives considered**: Synchronous processing (risks timeouts and poor UX).
