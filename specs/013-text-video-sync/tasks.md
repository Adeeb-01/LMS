# Tasks: Text-Video Timestamp Synchronization

**Input**: Design documents from `/specs/013-text-video-sync/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/alignment-api.md

**Tests**: Tests are included per Constitution Principle VII (Rigorous Testing Standards).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure project for alignment feature

- [X] T001 Install alignment dependencies: `npm install @xenova/transformers fluent-ffmpeg ffmpeg-static string-similarity`
- [X] T002 [P] Add alignment Zod validation schemas in lib/validations.js
- [X] T003 [P] Configure ffmpeg path in lib/alignment/config.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models and infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create VideoTranscript model in model/video-transcript.model.js
- [X] T005 [P] Create AlignmentJob model in model/alignment-job.model.js
- [X] T006 Extend LectureDocument model with videoTranscriptId reference in model/lecture-document.model.js
- [X] T007 [P] Create audio extraction utility in lib/alignment/audio-extractor.js
- [X] T008 [P] Create Whisper transcription service in lib/alignment/transcriber.js
- [X] T009 [P] Create text alignment algorithm in lib/alignment/text-aligner.js (includes marking not-spoken blocks and unmatched audio segments per FR-007/FR-008)
- [X] T010 Create job queue processor in service/alignment-queue.js
- [X] T011 Create background job runner in lib/alignment/job-processor.js (integrates T007, T008, T009)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Automatic Text-to-Video Alignment (Priority: P1) 🎯 MVP

**Goal**: When document extraction completes, automatically queue alignment processing. Pipeline extracts audio, generates transcript, aligns text blocks, and stores results.

**Independent Test**: Upload a DOCX with a lecture video, wait for processing, verify each text block has start/end timestamps in database.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T012 [P] [US1] Unit test for audio extraction in tests/unit/audio-extractor.test.js
- [X] T013 [P] [US1] Unit test for text alignment algorithm in tests/unit/text-aligner.test.js
- [X] T014 [P] [US1] Integration test for alignment pipeline in tests/integration/alignment-pipeline.test.js

### Implementation for User Story 1

- [X] T015 [US1] Implement triggerAlignment server action in app/actions/alignment.js
- [X] T016 [US1] Implement getAlignmentStatus server action in app/actions/alignment.js
- [X] T017 [US1] Add video duration validation (2-hour limit) in lib/alignment/audio-extractor.js
- [X] T018 [US1] Implement automatic retry logic (5-min delay) in lib/alignment/job-processor.js
- [X] T019 [US1] Create alignment status component in components/alignment/alignment-status.jsx
- [X] T020 [US1] Hook document extraction completion to trigger alignment in app/actions/lecture-document.js
- [X] T021 [US1] Add cascade delete for VideoTranscript when Lesson/LectureDocument deleted

**Checkpoint**: Core alignment pipeline functional. Can trigger alignment and see results in database.

---

## Phase 4: User Story 2 - Students Jump to Video from Text (Priority: P2)

**Goal**: Students click any paragraph in study materials to jump to that moment in the video. Video playback highlights the current text block.

**Independent Test**: As enrolled student, view study materials, click paragraph, verify video seeks to correct timestamp.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Integration test for click-to-seek in tests/integration/video-text-sync.test.js

### Implementation for User Story 2

- [X] T023 [US2] Implement getAlignments server action in app/actions/alignment.js
- [X] T024 [US2] Create timestamp badge component in components/alignment/timestamp-badge.jsx
- [X] T025 [P] [US2] Create video-text sync hook in app/[locale]/(main)/courses/[id]/lessons/[lessonId]/_components/video-text-sync.jsx
- [X] T026 [US2] Extend study-materials.jsx with click-to-seek functionality in app/[locale]/(main)/courses/[id]/lessons/[lessonId]/_components/study-materials.jsx
- [X] T027 [US2] Implement playback position highlighting (timeupdate event) in video-text-sync.jsx
- [X] T028 [US2] Add "not covered in video" toast for not-spoken blocks

**Checkpoint**: Students can click text to jump to video and see current text highlighted during playback.

---

## Phase 5: User Story 3 - Questions Inherit Video Timestamps (Priority: P3)

**Goal**: When questions are generated from synchronized text, they inherit timestamps. Students see "Watch Explanation" link in quiz results.

**Independent Test**: Generate question from synchronized text block, verify timestamp stored, click "Watch Explanation" from results.

> **Note**: This user story prepares infrastructure for future AI question generation. The timestamp lookup (T031) and watch-explanation-link (T032) can be integrated when question generation is implemented.

### Tests for User Story 3 ⚠️

- [X] T029 [P] [US3] Unit test for timestamp propagation in tests/unit/question-timestamp.test.js

### Implementation for User Story 3

- [X] T030 [US3] Extend Question model with sourceTimestamp fields (startSeconds, endSeconds, lessonId) in model/questionv2-model.js
- [X] T031 [US3] Add timestamp lookup helper for question generation in lib/alignment/timestamp-lookup.js
- [X] T032 [US3] Implement "Watch Explanation" link component in components/alignment/watch-explanation-link.jsx
- [X] T033 [US3] Integrate watch-explanation-link in quiz results view in app/[locale]/(main)/courses/[id]/quizzes/[quizId]/results/_components/question-result.jsx

**Checkpoint**: Questions with timestamps show "Watch Explanation" that jumps to video moment.

---

## Phase 6: User Story 4 - Instructor Reviews Alignment Quality (Priority: P4)

**Goal**: Instructors view alignment results with confidence scores, see low-confidence blocks highlighted, and manually adjust timestamps.

**Independent Test**: As instructor, view alignment results, verify confidence scores visible, adjust one timestamp, verify change persists.

### Tests for User Story 4 ⚠️

- [X] T034 [P] [US4] Integration test for timestamp adjustment in tests/integration/alignment-review.test.js

### Implementation for User Story 4

- [X] T035 [US4] Implement adjustTimestamp server action in app/actions/alignment.js
- [X] T036 [US4] Implement retryAlignment server action in app/actions/alignment.js
- [X] T037 [P] [US4] Create confidence indicator component in components/alignment/confidence-indicator.jsx
- [X] T038 [US4] Create alignment review page in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/alignment/page.jsx
- [X] T039 [US4] Create alignment review component in app/[locale]/dashboard/courses/[courseId]/lessons/[lessonId]/alignment/_components/alignment-review.jsx
- [X] T040 [US4] Implement manual timestamp picker (click video to set timestamp)
- [X] T041 [US4] Add low-confidence highlighting (blocks < 70% flagged red)
- [X] T042 [US4] Preserve manually verified timestamps on re-alignment

**Checkpoint**: Instructors can review, flag, and correct alignment results.

---

## Phase 7: API Routes & Access Control

**Purpose**: REST endpoints for client-side data fetching with proper authorization

- [X] T043 Create GET /api/alignments/lesson/[lessonId]/route.js for alignment data
- [X] T044 Create GET /api/alignments/job/[jobId]/route.js for job status polling
- [X] T045 Add course-scoped access control to all alignment endpoints (instructors + enrolled students)
- [X] T046 Add instructor-only guards for trigger, adjust, and retry operations

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T047 [P] Add i18n translations for alignment UI strings in messages/en.json and messages/ar.json
- [X] T048 [P] Add loading states and error handling to all alignment components
- [X] T049 Add alignment status indicator to lesson management dashboard
- [X] T050 Performance optimization: debounce timeupdate handler
- [X] T051 Run quickstart.md validation steps
- [X] T052 Update README with alignment feature documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 can start immediately after Foundational
  - US2 depends on US1 completion (needs alignment data to display)
  - US3 can start after Foundational (independent of US2)
  - US4 depends on US1 completion (needs alignment data to review)
- **API Routes (Phase 7)**: Depends on US1 completion
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```text
Phase 2 (Foundational)
       │
       ▼
┌──────────────────┐
│ US1: Alignment   │ ◄── MVP COMPLETE HERE
│ Pipeline (P1)    │
└────────┬─────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌────────┐ ┌────────┐ ┌────────┐
│US2:    │ │US3:    │ │US4:    │
│Click-  │ │Question│ │Review  │
│to-Seek │ │Links   │ │UI      │
│(P2)    │ │(P3)    │ │(P4)    │
└────────┘ └────────┘ └────────┘
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before UI components
- Core implementation before integration

### Parallel Opportunities

**Setup Phase**:
- T002, T003 can run in parallel

**Foundational Phase**:
- T004, T005, T007, T008, T009 can run in parallel
- T006 depends on T004
- T010, T011 depend on T007, T008, T009

**User Story 1**:
- T012, T013, T014 (tests) can run in parallel
- T015, T016 can run in parallel after tests
- T019 can start while T015-T018 are in progress

**User Story 2**:
- T024, T025 can run in parallel
- T026, T027 depend on T025

**User Story 4**:
- T037 can run in parallel with T035, T036

---

## Parallel Example: Foundational Phase

```bash
# Launch all independent foundational tasks together:
Task: "Create VideoTranscript model in model/video-transcript.model.js"
Task: "Create AlignmentJob model in model/alignment-job.model.js"
Task: "Create audio extraction utility in lib/alignment/audio-extractor.js"
Task: "Create Whisper transcription service in lib/alignment/transcriber.js"
Task: "Create text alignment algorithm in lib/alignment/text-aligner.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Trigger alignment, verify timestamps in DB
5. Deploy/demo if ready - core value delivered

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test pipeline → Deploy (MVP!)
3. Add US2 → Test click-to-seek → Deploy (student value!)
4. Add US3 → Test question links → Deploy
5. Add US4 → Test instructor review → Deploy (full feature!)

### Parallel Team Strategy

With multiple developers after Foundational:
- Developer A: User Story 1 → User Story 2
- Developer B: User Story 3 (independent)
- Developer C: User Story 4 (after US1 complete)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 is the MVP - delivers core alignment capability
- US2 provides primary student-facing value
- US3 enhances quiz experience (optional if questions not yet implemented)
- US4 adds instructor quality control (can be deferred)
- Whisper model downloads ~244MB on first run - factor into first deployment
- Processing time target: 2x video duration (10-min video = 20-min processing)
