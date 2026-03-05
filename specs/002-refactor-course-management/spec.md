# Feature Specification: Refactor Course Management

**Feature Branch**: `002-refactor-course-management`  
**Created**: 2026-03-05  
**Status**: Draft  
**Input**: User description: "I want to refactor add course and the info of courses and module and lesson"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Streamlined Course Creation (Priority: P1)

As an instructor, I want a simplified and intuitive course creation flow so that I can quickly set up new courses with all essential information in fewer steps.

**Why this priority**: Course creation is the entry point for all content. A streamlined experience reduces friction and encourages instructors to create more courses.

**Independent Test**: Can be fully tested by creating a new course from scratch and verifying all required fields are captured efficiently. Delivers immediate value by reducing time-to-publish for new courses.

**Acceptance Scenarios**:

1. **Given** an authenticated instructor on the dashboard, **When** they click "Add Course", **Then** they see a unified form to enter course title, subtitle, description, and thumbnail in a single view
2. **Given** an instructor filling the course creation form, **When** they submit with valid data, **Then** the course is created and they are redirected to the course detail/edit page
3. **Given** an instructor filling the course creation form, **When** they submit with missing required fields, **Then** they see clear validation errors indicating what needs to be corrected
4. **Given** an instructor on the course creation form, **When** they want to save progress, **Then** they can save a draft course that is not yet published

---

### User Story 2 - Comprehensive Course Information Editing (Priority: P1)

As an instructor, I want to view and edit all course information in a well-organized interface so that I can manage course details, pricing, and categorization efficiently.

**Why this priority**: Instructors need to keep course information accurate and up-to-date. A well-organized editing interface improves instructor productivity.

**Independent Test**: Can be tested by editing an existing course's metadata (title, description, price, category, thumbnail) and verifying changes persist correctly.

**Acceptance Scenarios**:

1. **Given** an instructor viewing their course detail page, **When** they click on any editable field, **Then** they can edit that field inline or via a modal with immediate feedback
2. **Given** an instructor editing course information, **When** they update the thumbnail image, **Then** they see a preview before confirming the change
3. **Given** an instructor editing course pricing, **When** they change the price, **Then** the new price is reflected immediately and enrolled students retain their existing access
4. **Given** an instructor viewing course details, **When** the page loads, **Then** they see all course metadata organized in logical sections (basic info, media, pricing, status)

---

### User Story 3 - Module Management (Priority: P1)

As an instructor, I want to create, edit, reorder, and delete modules within a course so that I can structure my course content logically.

**Why this priority**: Modules are the primary organizational unit for course content. Without effective module management, instructors cannot structure their courses properly.

**Independent Test**: Can be tested by creating a new module, editing its title, reordering modules via drag-and-drop, and deleting a module. Each action should work independently.

**Acceptance Scenarios**:

1. **Given** an instructor on the course edit page, **When** they click "Add Module", **Then** they can enter a module title and the module is added to the course
2. **Given** an instructor with multiple modules, **When** they drag and drop a module to a new position, **Then** the module order is updated and persisted
3. **Given** an instructor viewing a module, **When** they click edit, **Then** they can modify the module title and description
4. **Given** an instructor with a module containing no lessons, **When** they delete the module, **Then** the module is removed from the course
5. **Given** an instructor with a module containing lessons, **When** they attempt to delete the module, **Then** they see a confirmation warning about cascading deletion of lessons

---

### User Story 4 - Lesson Management (Priority: P2)

As an instructor, I want to create, edit, reorder, and delete lessons within a module so that I can build comprehensive learning content.

**Why this priority**: Lessons contain the actual learning content. Effective lesson management enables instructors to deliver valuable educational experiences.

**Independent Test**: Can be tested by adding a lesson to a module, editing lesson details, uploading/linking video content, reordering lessons, and deleting a lesson.

**Acceptance Scenarios**:

1. **Given** an instructor on the module edit page, **When** they click "Add Lesson", **Then** they can enter lesson details including title, description, and video source
2. **Given** an instructor editing a lesson, **When** they upload a video file, **Then** they see upload progress and the video is associated with the lesson
3. **Given** an instructor editing a lesson, **When** they provide an external video URL, **Then** the URL is validated and stored
4. **Given** an instructor with multiple lessons, **When** they drag and drop a lesson to a new position, **Then** the lesson order is updated within the module
5. **Given** an instructor editing a lesson, **When** they toggle the access setting, **Then** the lesson becomes public (preview) or private (enrolled only)
6. **Given** an instructor viewing a lesson, **When** they delete the lesson, **Then** the lesson and its associated video are removed

---

### User Story 5 - Course Publishing Workflow (Priority: P2)

As an instructor, I want a clear publishing workflow so that I understand when my course is visible to students and can control its availability.

**Why this priority**: Publishing controls determine course visibility. Instructors need confidence that unpublished content remains private while they develop it.

**Independent Test**: Can be tested by toggling publish state on courses, modules, and lessons, and verifying visibility changes from student perspective.

**Acceptance Scenarios**:

1. **Given** an instructor with a draft course, **When** they click "Publish", **Then** the course becomes visible to students in the course catalog
2. **Given** an instructor with a published course, **When** they click "Unpublish", **Then** the course is hidden from the catalog but existing enrolled students retain access
3. **Given** an instructor publishing a course, **When** required fields are incomplete, **Then** they see a checklist of items needed before publishing
4. **Given** an instructor, **When** they view any course/module/lesson, **Then** they see a clear visual indicator of its publish status

---

### Edge Cases

- What happens when an instructor tries to delete a course with active enrollments?
- How does the system handle video upload failures mid-upload?
- What happens when an instructor tries to publish a course with no modules or lessons?
- How does the system handle concurrent edits to the same course by the same instructor in different tabs?
- What happens when a module or lesson title contains special characters or is very long?
- How does the system handle orphaned lessons if a module deletion fails partially?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow instructors to create courses with title, subtitle, description, and thumbnail in a unified form
- **FR-002**: System MUST validate all required fields before course creation and display specific error messages
- **FR-003**: System MUST allow instructors to save courses as drafts before publishing
- **FR-004**: System MUST display all course metadata in organized, editable sections
- **FR-005**: System MUST support inline editing or modal-based editing for course fields
- **FR-006**: System MUST preview image uploads before confirmation
- **FR-007**: System MUST allow creating modules with title and optional description
- **FR-008**: System MUST support drag-and-drop reordering of modules with persistence
- **FR-009**: System MUST cascade delete lessons when a module is deleted (with user confirmation)
- **FR-010**: System MUST allow creating lessons with title, description, video source, and access level
- **FR-011**: System MUST support both local video upload and external video URL for lessons
- **FR-012**: System MUST show upload progress for video uploads
- **FR-013**: System MUST support drag-and-drop reordering of lessons within a module
- **FR-014**: System MUST allow toggling lesson access between public (preview) and private (enrolled only)
- **FR-015**: System MUST provide publish/unpublish functionality for courses, modules, and lessons
- **FR-016**: System MUST show clear visual indicators for publish status at all levels
- **FR-017**: System MUST validate publishing requirements (minimum content) before allowing publish
- **FR-018**: System MUST preserve enrolled student access when unpublishing a course

### Key Entities

- **Course**: The top-level content container with title, subtitle, description, thumbnail, price, category, and publish status. Contains multiple modules.
- **Module**: A grouping of related lessons within a course. Has title, description, order position, and publish status. Contains multiple lessons.
- **Lesson**: The atomic content unit containing educational material. Has title, description, video content (local or external), duration, access level, order position, and publish status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Instructors can create a new course with all basic information in under 2 minutes
- **SC-002**: Instructors can add a module with title in under 30 seconds
- **SC-003**: Instructors can add a lesson with video in under 3 minutes (excluding upload time)
- **SC-004**: Reordering modules or lessons via drag-and-drop completes in under 1 second
- **SC-005**: All form validation errors are displayed within 500ms of submission
- **SC-006**: 100% of course management operations provide clear success/error feedback
- **SC-007**: Publish status is always visually clear without requiring additional clicks
- **SC-008**: Instructors successfully complete course setup on first attempt at least 90% of the time

## Assumptions

- Instructors are authenticated before accessing course management features
- The existing course, module, and lesson data models will be preserved (refactor focuses on UI/UX, not data schema changes)
- Video upload functionality will continue to use the existing upload infrastructure
- Drag-and-drop reordering will continue to use the existing library (@hello-pangea/dnd)
- Authorization checks (instructor owns course/module/lesson) will remain in place
- The refactoring will maintain backward compatibility with existing courses
