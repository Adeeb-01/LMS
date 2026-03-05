# Tasks: Refactor Course Management

**Input**: Design documents from `/specs/002-refactor-course-management/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md

**Tests**: No automated tests requested. Manual testing via quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/`, `components/`, `lib/`, `model/`
- Components co-located with feature pages in `_components/`
- Shared UI components in `components/ui/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema updates and shared components that all user stories depend on

- [X] T001 Add soft-delete fields (deletedAt, deletedBy) to Course model in model/course-model.js
- [X] T002 Add Mongoose index for deletedAt field in model/course-model.js
- [X] T003 [P] Create PublishBadge component in components/ui/publish-badge.jsx
- [X] T004 [P] Add courseDeleteSchema to lib/validations.js for soft-delete fields
- [X] T005 [P] Add validatePublishRequirements helper function to lib/validations.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core server action modifications that MUST be complete before UI work

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete

- [X] T006 Modify createCourse action to accept all fields (title, subtitle, description, thumbnail, price, category) in app/actions/course.js
- [X] T007 Modify deleteCourse action to perform soft-delete when enrollments exist in app/actions/course.js
- [X] T008 Modify changeCoursePublishState to validate requirements before publishing in app/actions/course.js
- [X] T009 [P] Add validatePublishRequirements server action in app/actions/course.js
- [X] T010 [P] Add restoreCourse server action (admin-only) in app/actions/course.js
- [X] T011 Update course queries to exclude soft-deleted courses by default in queries/courses.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Streamlined Course Creation (Priority: P1) 🎯 MVP

**Goal**: Unified course creation form with all essential fields in a single view

**Independent Test**: Create a new course from dashboard, fill all fields (title, subtitle, description, thumbnail, price, category), submit, verify redirect to edit page with all data persisted

### Implementation for User Story 1

- [X] T012 [P] [US1] Create unified CourseForm component in app/[locale]/dashboard/courses/add/_components/course-form.jsx
- [X] T013 [P] [US1] Create CourseBasicInfoFields component (title, subtitle, description) in app/[locale]/dashboard/courses/add/_components/course-basic-info-fields.jsx
- [X] T014 [P] [US1] Create CourseThumbnailField component with preview in app/[locale]/dashboard/courses/add/_components/course-thumbnail-field.jsx
- [X] T015 [P] [US1] Create CoursePricingFields component (price, category) in app/[locale]/dashboard/courses/add/_components/course-pricing-fields.jsx
- [X] T016 [US1] Refactor add course page to use unified CourseForm in app/[locale]/dashboard/courses/add/page.jsx
- [X] T017 [US1] Add client-side Zod validation schema matching server in app/[locale]/dashboard/courses/add/_components/course-form.jsx
- [X] T018 [US1] Add i18n translations for new form labels and validation messages in messages/en.json and messages/ar.json

**Checkpoint**: User Story 1 complete - instructors can create courses with all fields in one step

---

## Phase 4: User Story 2 - Comprehensive Course Information Editing (Priority: P1)

**Goal**: Organized course edit page with logical sections and clear status indicators

**Independent Test**: Navigate to existing course edit page, verify sections are organized (Basic Info, Media, Pricing, Status), edit each field inline, verify changes persist

### Implementation for User Story 2

- [X] T019 [P] [US2] Create CourseInfoSection wrapper component in app/[locale]/dashboard/courses/[courseId]/_components/course-info-section.jsx
- [X] T020 [P] [US2] Create CourseMediaSection wrapper component in app/[locale]/dashboard/courses/[courseId]/_components/course-media-section.jsx
- [X] T021 [P] [US2] Create CoursePricingSection wrapper component in app/[locale]/dashboard/courses/[courseId]/_components/course-pricing-section.jsx
- [X] T022 [P] [US2] Create CourseStatusSection wrapper component in app/[locale]/dashboard/courses/[courseId]/_components/course-status-section.jsx
- [X] T023 [US2] Refactor course edit page to use section wrappers in app/[locale]/dashboard/courses/[courseId]/page.jsx
- [X] T024 [US2] Add PublishBadge to course header showing current status in app/[locale]/dashboard/courses/[courseId]/page.jsx
- [X] T025 [US2] Add i18n translations for section headers in messages/en.json and messages/ar.json

**Checkpoint**: User Story 2 complete - course editing is organized into logical sections with clear status

---

## Phase 5: User Story 3 - Module Management (Priority: P1)

**Goal**: Full module CRUD with drag-and-drop reordering and cascade delete confirmation

**Independent Test**: Add new module, edit module title, reorder via drag-and-drop, delete module (with and without lessons), verify all operations persist correctly

### Implementation for User Story 3

- [X] T026 [P] [US3] Add PublishBadge to ModuleList items in app/[locale]/dashboard/courses/[courseId]/_components/module-list.jsx
- [X] T027 [P] [US3] Create cascade delete confirmation dialog component in app/[locale]/dashboard/courses/[courseId]/_components/module-delete-dialog.jsx
- [X] T028 [US3] Enhance ModulesForm with improved add module UX in app/[locale]/dashboard/courses/[courseId]/_components/module-form.jsx
- [X] T029 [US3] Update module delete action to show confirmation with lesson count in app/[locale]/dashboard/courses/[courseId]/_components/module-list.jsx
- [X] T030 [US3] Add i18n translations for module management messages in messages/en.json and messages/ar.json

**Checkpoint**: User Story 3 complete - instructors can fully manage modules with clear feedback

---

## Phase 6: User Story 4 - Lesson Management (Priority: P2)

**Goal**: Full lesson CRUD with video upload retry logic and access level toggling

**Independent Test**: Add lesson to module, upload video (test retry by simulating failure), set external URL, reorder lessons, toggle access level, delete lesson, verify all operations

### Implementation for User Story 4

- [X] T031 [P] [US4] Add upload retry logic with exponential backoff to VideoUploadField in app/[locale]/dashboard/courses/[courseId]/modules/[moduleId]/_components/video-upload-field.jsx
- [X] T032 [P] [US4] Add retry count display and manual retry/cancel buttons to VideoUploadField in app/[locale]/dashboard/courses/[courseId]/modules/[moduleId]/_components/video-upload-field.jsx
- [X] T033 [P] [US4] Add PublishBadge to LessonList items in app/[locale]/dashboard/courses/[courseId]/modules/[moduleId]/_components/lesson-list.jsx
- [X] T034 [US4] Enhance LessonModal with improved field organization in app/[locale]/dashboard/courses/[courseId]/modules/[moduleId]/_components/lesson-modal.jsx
- [X] T035 [US4] Update LessonAccessForm with clear preview/enrolled-only toggle in app/[locale]/dashboard/courses/[courseId]/modules/[moduleId]/_components/lesson-access-form.jsx
- [X] T036 [US4] Add i18n translations for lesson management and upload retry messages in messages/en.json and messages/ar.json

**Checkpoint**: User Story 4 complete - instructors can fully manage lessons with reliable video upload

---

## Phase 7: User Story 5 - Course Publishing Workflow (Priority: P2)

**Goal**: Clear publishing workflow with validation checklist and status visibility at all levels

**Independent Test**: Create course without modules → attempt publish → see checklist, add module/lesson → publish succeeds, unpublish → verify catalog visibility changes, verify status badges throughout

### Implementation for User Story 5

- [X] T037 [P] [US5] Create PublishChecklist component showing missing requirements in app/[locale]/dashboard/courses/[courseId]/_components/publish-checklist.jsx
- [X] T038 [P] [US5] Create PublishButton component with validation integration in app/[locale]/dashboard/courses/[courseId]/_components/publish-button.jsx
- [X] T039 [US5] Update CourseActions to use new PublishButton with checklist in app/[locale]/dashboard/courses/[courseId]/_components/course-action.jsx
- [X] T040 [US5] Add publish status badges to module edit page header in app/[locale]/dashboard/courses/[courseId]/modules/[moduleId]/page.jsx
- [X] T041 [US5] Ensure PublishBadge shows on all course/module/lesson views consistently
- [X] T042 [US5] Add i18n translations for publish checklist items and status labels in messages/en.json and messages/ar.json

**Checkpoint**: User Story 5 complete - publishing workflow is clear with validation and status visibility

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T043 [P] Review all components for consistent loading states
- [X] T044 [P] Review all components for consistent error handling with toast messages
- [X] T045 [P] Verify keyboard accessibility for all new interactive components
- [X] T046 [P] Update dashboard courses list to exclude soft-deleted courses in app/[locale]/dashboard/courses/page.jsx
- [X] T047 Review and optimize component re-renders for drag-and-drop performance
- [X] T048 Run quickstart.md validation - test all scenarios end-to-end
- [X] T049 Update component documentation comments where needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1), US2 (P1), US3 (P1) can proceed in parallel
  - US4 (P2), US5 (P2) can proceed in parallel after P1 stories
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational - Independent of other stories
- **User Story 5 (P2)**: Can start after Foundational - Uses PublishBadge from Setup

### Within Each User Story

- Parallel [P] component creation first
- Page integration after components ready
- i18n translations last (after all text finalized)

### Parallel Opportunities

**Setup Phase**:
```
T003 + T004 + T005 (all [P])
```

**Foundational Phase**:
```
T009 + T010 (all [P])
```

**User Story 1**:
```
T012 + T013 + T014 + T015 (all [P] components)
Then: T016 → T017 → T018
```

**User Story 2**:
```
T019 + T020 + T021 + T022 (all [P] sections)
Then: T023 → T024 → T025
```

**User Story 3**:
```
T026 + T027 (all [P])
Then: T028 → T029 → T030
```

**Across Stories (after Foundational)**:
```
US1 + US2 + US3 can run in parallel
Then: US4 + US5 can run in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T011)
3. Complete Phase 3: User Story 1 (T012-T018)
4. **STOP and VALIDATE**: Test course creation end-to-end
5. Deploy/demo if ready - instructors can now create courses efficiently

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy (MVP: streamlined course creation)
3. Add User Story 2 → Test → Deploy (organized editing)
4. Add User Story 3 → Test → Deploy (module management)
5. Add User Story 4 → Test → Deploy (lesson management with upload retry)
6. Add User Story 5 → Test → Deploy (publishing workflow)
7. Polish phase → Final validation

### Parallel Team Strategy

With multiple developers after Foundational:

- **Developer A**: User Story 1 (course creation form)
- **Developer B**: User Story 2 (course edit sections)
- **Developer C**: User Story 3 (module management)

Then:
- **Developer A**: User Story 4 (lesson management)
- **Developer B**: User Story 5 (publishing workflow)
- **Developer C**: Polish phase

---

## Notes

- All components use existing patterns: react-hook-form + zodResolver + shadcn/ui
- Preserve existing atomic form components (TitleForm, DescriptionForm, etc.)
- New components are wrappers that group existing components
- Soft-delete only affects Course model; modules/lessons use existing hard delete
- PublishBadge supports three states: published (green), draft (yellow), deleted (red)
- Upload retry uses exponential backoff: 1s, 2s, 4s delays
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
