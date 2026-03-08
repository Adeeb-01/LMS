# Implementation Tasks: Add Oral Question Type

**Feature**: `010-add-oral-question`
**Status**: Generated

## Phase 1: Setup

- [ ] T001 Install AWS S3 SDK for cloud storage in `package.json` (`npm install @aws-sdk/client-s3`)
- [ ] T002 Install OpenAI SDK in `package.json` (`npm install openai`)
- [ ] T003 Set up mock environment variables for local testing in `.env` (S3 and OpenAI)
- [ ] T004 Create foundational directories for AI and storage utilities in `lib/ai/` and `lib/storage/`

## Phase 2: Foundational Data & Storage

- [ ] T005 [P] Implement `Question` schema updates in `models/Question.ts` (add `type: 'oral'` and `referenceAnswer`)
- [ ] T006 [P] Implement `StudentAnswer` schema updates in `models/Answer.ts` (add `audioUrl`, `transcribedText`, `gradingStatus`)
- [ ] T007 Implement Zod validation schema updates for Question creation in `schemas/question.schema.ts`
- [ ] T008 Implement Zod validation schema updates for Answer submission in `schemas/answer.schema.ts`
- [ ] T009 Implement S3 pre-signed URL generation utility in `lib/storage/s3.ts`

## Phase 3: User Story 1 - Create an Oral Question (P1)

**Goal**: As an instructor, I want to create an "oral" question type and provide a standard `referenceAnswer` text so that I can evaluate students' spoken answers against a baseline.
**Independent Test**: Can be fully tested by creating a new question in the system with type "oral" and a populated `referenceAnswer` field, and verifying it saves correctly to the database.

- [ ] T010 [US1] Create UI component `OralQuestionForm.tsx` in `components/questions/` for instructors
- [ ] T011 [US1] Integrate `OralQuestionForm.tsx` into the main assessment creation view
- [ ] T012 [US1] Update question creation Server Action/API to handle the new `oral` type and validate `referenceAnswer`
- [ ] T013 [US1] Write unit tests for the Question Zod schema validation to ensure `referenceAnswer` is required when type is `oral`

## Phase 4: User Story 2 - Answer an Oral Question (P2)

**Goal**: As a student taking an assessment, I want to be presented with an oral question and be able to provide my spoken response, so that I can be evaluated on my speaking skills.
**Independent Test**: Can be tested by rendering an oral question in an assessment interface and submitting a response.

- [ ] T014 [US2] Create generic `AudioRecorder.tsx` component in `components/ui/` using native `MediaRecorder` API
- [ ] T015 [US2] Create `OralQuestionPlayer.tsx` in `components/questions/` integrating the `AudioRecorder`
- [ ] T016 [US2] Implement API endpoint `app/api/upload/audio-url/route.ts` to provide pre-signed URLs to the frontend
- [ ] T017 [US2] Update answer submission Server Action/API to accept `audioUrl` and handle the "skipped due to mic" edge case
- [ ] T018 [US2] Write unit tests for Answer Zod schema validation (requiring `audioUrl` or skipped state)

## Phase 5: User Story 3 - AI Evaluation of Oral Answer (P3)

**Goal**: As a system, I want to compare the student's spoken answer against the instructor's `referenceAnswer` using an AI judge, so that the student receives an accurate automated grade.
**Independent Test**: Can be tested by mocking a student's answer and triggering the AI evaluation process to compare it against the `referenceAnswer`.

- [ ] T019 [US3] [P] Implement OpenAI Whisper transcription utility in `lib/ai/transcription.ts`
- [ ] T020 [US3] [P] Implement OpenAI GPT evaluation utility in `lib/ai/evaluation.ts`
- [ ] T021 [US3] Create API route `app/api/evaluate-oral/route.ts` to handle async evaluation background jobs
- [ ] T022 [US3] Update the Answer Submission flow to trigger the async evaluation upon successful submission
- [ ] T023 [US3] Update student UI to display "Grading Pending" state when `gradingStatus` is pending/evaluating
- [ ] T024 [US3] Write unit tests mocking OpenAI APIs to verify the evaluation logic calculates scores correctly

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T025 Ensure graceful degradation and error handling if microphone access is denied in `AudioRecorder.tsx`
- [ ] T026 Update general assessment UI to show appropriate loading spinners during async submission/audio upload
- [ ] T027 Verify mobile responsiveness of the `AudioRecorder` UI

## Implementation Strategy

1. **MVP Scope**: Focus on completing Setup, Phase 2, and Phase 3 (User Story 1) to ensure the data model supports the new type.
2. **Incremental Delivery**: Phase 4 enables the frontend capturing of audio, which can be tested independently of the AI backend.
3. **Parallel Execution Opportunities**:
   - T005 & T006 (Database schema updates) can be done in parallel.
   - T019 & T020 (OpenAI utilities) can be implemented in parallel before the async route is built.
