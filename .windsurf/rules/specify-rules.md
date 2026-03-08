# LMS-main Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-07

## Active Technologies
- JavaScript/TypeScript (Next.js 15) + Next.js App Router, `openai` Node SDK, Cloud Storage SDK (e.g., `@aws-sdk/client-s3`), React `MediaRecorder` hook/API (010-add-oral-question)
- MongoDB (Mongoose 8) for metadata, Cloud Object Storage (e.g., AWS S3, Cloudflare R2) for raw audio (010-add-oral-question)

- JavaScript/TypeScript (Node.js) + Next.js 15 (App Router), Mongoose 8, Zod 3 (009-question-irt-parameters)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

JavaScript/TypeScript (Node.js): Follow standard conventions

## Recent Changes
- 010-add-oral-question: Added JavaScript/TypeScript (Next.js 15) + Next.js App Router, `openai` Node SDK, Cloud Storage SDK (e.g., `@aws-sdk/client-s3`), React `MediaRecorder` hook/API

- 009-question-irt-parameters: Added JavaScript/TypeScript (Node.js) + Next.js 15 (App Router), Mongoose 8, Zod 3

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
