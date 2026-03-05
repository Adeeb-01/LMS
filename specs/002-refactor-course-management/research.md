# Research: Refactor Course Management

**Feature**: 002-refactor-course-management  
**Date**: 2026-03-05  
**Status**: Complete

## Research Tasks

### 1. Soft-Delete Pattern for MongoDB/Mongoose

**Decision**: Add `deletedAt` (Date) and `deletedBy` (ObjectId ref to User) fields to Course model only.

**Rationale**:
- Modules and lessons are cascade-deleted when their parent course is soft-deleted (they remain in DB but inaccessible)
- Only courses need soft-delete because enrollments reference courses directly
- Using timestamp (`deletedAt`) instead of boolean (`isDeleted`) allows tracking when deletion occurred
- `deletedBy` provides audit trail for admin accountability

**Alternatives Considered**:
- Boolean `isDeleted` flag: Rejected because timestamp provides more information
- Soft-delete on all entities: Rejected because modules/lessons don't have direct external references
- Separate archive collection: Rejected as unnecessary complexity

**Implementation Notes**:
- Add Mongoose pre-find middleware to exclude `deletedAt: { $ne: null }` by default
- Create explicit `findWithDeleted()` query helper for admin views
- Update `deleteCourse` action to set `deletedAt` instead of `deleteOne()` when enrollments exist

### 2. Video Upload Retry Pattern

**Decision**: Implement client-side retry with exponential backoff in `VideoUploadField` component.

**Rationale**:
- Upload failures are typically transient (network issues)
- Client-side retry avoids server complexity
- Exponential backoff prevents overwhelming server on repeated failures
- User retains control with manual retry/cancel after auto-retries exhausted

**Alternatives Considered**:
- Server-side chunked upload with resume: Rejected as over-engineering for current scale
- No retry (fail immediately): Rejected as poor UX for large files
- Background upload queue: Rejected as adds significant complexity

**Implementation Notes**:
- Max 3 automatic retries with delays: 1s, 2s, 4s (exponential)
- Show retry count to user during auto-retry
- After 3 failures, show error with "Retry" and "Cancel" buttons
- Preserve file reference for manual retry (no re-selection needed)

### 3. Unified Course Creation Form Pattern

**Decision**: Single-page form with all fields visible, using sectioned layout with validation on submit.

**Rationale**:
- Current flow requires multiple page navigations after initial create
- Single form reduces time-to-complete from ~5 steps to 1 step
- Sectioned layout (Basic Info, Media, Pricing) maintains visual organization
- Submit creates draft course (not published)

**Alternatives Considered**:
- Multi-step wizard: Rejected because total fields are manageable in one view
- Keep current pattern (title only, then edit): Rejected as user research shows friction
- Modal-based creation: Rejected because form is too large for modal

**Implementation Notes**:
- Reuse existing individual form field components where possible
- Add client-side validation with Zod schema matching server
- Thumbnail upload inline with preview (already exists as ImageForm pattern)
- Default `active: false` for new courses (draft state)

### 4. Publish Validation Requirements

**Decision**: Validate minimum content (1 module + 1 lesson) server-side before allowing publish.

**Rationale**:
- Prevents publishing empty courses that frustrate students
- Server-side validation ensures rule cannot be bypassed
- Checklist UI shows what's missing before user attempts publish

**Alternatives Considered**:
- Client-only validation: Rejected as can be bypassed
- Require complete metadata (title, description, thumbnail, price): Rejected as too restrictive
- No validation: Rejected as allows empty published courses

**Implementation Notes**:
- Add `validatePublishRequirements(courseId)` helper function
- Return structured result: `{ canPublish: boolean, missing: string[] }`
- UI shows checklist derived from missing items
- Block publish action server-side if validation fails

### 5. Form Component Consolidation Pattern

**Decision**: Create wrapper components that group related fields while reusing existing atomic form components.

**Rationale**:
- Existing atomic components (TitleForm, DescriptionForm, etc.) are well-tested
- Wrapper components add visual grouping without rewriting form logic
- Maintains component modularity per Constitution Principle IV
- Reduces code duplication for common patterns (edit toggle, toast feedback)

**Alternatives Considered**:
- Complete rewrite of all forms: Rejected as high risk, no clear benefit
- Keep all forms separate: Rejected as doesn't improve UX organization
- Single monolithic form component: Rejected as violates modularity principle

**Implementation Notes**:
- `CourseInfoSection`: Groups title, subtitle, description
- `CourseMediaSection`: Groups thumbnail upload
- `CoursePricingSection`: Groups price, category
- `CourseStatusSection`: Groups publish toggle, status badge
- Each section is a presentational wrapper, delegates to existing forms

### 6. Publish Status Badge Component

**Decision**: Create reusable `PublishBadge` component in `components/ui/` for consistent status display.

**Rationale**:
- Status indicator needed on Course, Module, and Lesson views
- Consistent visual language improves UX
- Single component ensures styling consistency
- Supports both `active: true/false` and soft-deleted states

**Alternatives Considered**:
- Inline conditional rendering in each component: Rejected as duplicates logic
- Text-only status: Rejected as badges are more scannable

**Implementation Notes**:
- Props: `status: 'published' | 'draft' | 'deleted'`
- Colors: Green (published), Yellow (draft), Red (deleted)
- Uses shadcn/ui Badge component as base
- Supports optional tooltip with additional context

## Dependencies Review

| Dependency | Current Version | Status | Notes |
|------------|-----------------|--------|-------|
| @hello-pangea/dnd | Existing | ✅ Keep | Drag-and-drop works well |
| react-hook-form | Existing | ✅ Keep | Form state management |
| zod | 3.x | ✅ Keep | Schema validation |
| shadcn/ui | Existing | ✅ Keep | UI components |
| sonner | Existing | ✅ Keep | Toast notifications |

No new dependencies required.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Soft-delete breaks existing queries | Medium | High | Add default query scope, comprehensive testing |
| Unified form slower than current flow | Low | Medium | Lazy load thumbnail upload, optimize initial render |
| Existing data incompatible with new fields | Low | Low | New fields are optional with null default |
| Form component changes break existing pages | Medium | Medium | Incremental refactor, test each component |
