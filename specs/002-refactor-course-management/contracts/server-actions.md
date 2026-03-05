# Server Actions Contract: Refactor Course Management

**Feature**: 002-refactor-course-management  
**Date**: 2026-03-05  
**Status**: Complete

## Overview

This document defines the server action interfaces for course, module, and lesson management. It includes both existing actions (unchanged) and new/modified actions for this refactor.

## Course Actions (app/actions/course.js)

### createCourse (MODIFY)

Create a new course with all metadata in a single call.

**Current Signature**:
```javascript
async function createCourse(data)
// data: { title, description }
```

**New Signature**:
```javascript
async function createCourse(data)
// data: { title, subtitle?, description?, thumbnail?, price?, category? }
```

**Input Schema**:
```javascript
z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  description: z.string().optional(),
  thumbnail: z.string().url().optional(),
  price: z.number().min(0).optional(),
  category: z.string().optional() // ObjectId as string
}).strict()
```

**Output**:
```javascript
{ success: true, courseId: string }
// or throws Error with message
```

**Authorization**: Authenticated user with Instructor role

---

### updateCourse (UNCHANGED)

Update course metadata.

**Signature**:
```javascript
async function updateCourse(courseId, data)
```

**Authorization**: Course owner or Admin

---

### deleteCourse (MODIFY)

Delete a course. Performs soft-delete if enrollments exist.

**Current Behavior**: Always hard delete

**New Behavior**:
```javascript
async function deleteCourse(courseId)
// If enrollments exist: soft delete (set deletedAt, deletedBy)
// If no enrollments: hard delete (remove from DB)
```

**Output**:
```javascript
{ success: true, softDeleted: boolean }
```

**Authorization**: Course owner or Admin

---

### changeCoursePublishState (MODIFY)

Toggle course publish state with validation.

**Current Behavior**: Toggle `active` without validation

**New Behavior**:
```javascript
async function changeCoursePublishState(courseId)
// When publishing (active: false → true):
//   - Validate: at least 1 module with at least 1 lesson
//   - If invalid: return { success: false, missing: string[] }
// When unpublishing: no validation needed
```

**Output**:
```javascript
// Success
{ success: true, active: boolean }

// Validation failure (publish only)
{ success: false, canPublish: false, missing: ['At least 1 module required'] }
```

**Authorization**: Course owner or Admin

---

### validatePublishRequirements (NEW)

Check if a course meets publishing requirements without changing state.

**Signature**:
```javascript
async function validatePublishRequirements(courseId)
```

**Output**:
```javascript
{
  canPublish: boolean,
  missing: string[],  // Human-readable missing items
  stats: {
    moduleCount: number,
    lessonCount: number
  }
}
```

**Authorization**: Course owner or Admin

---

### restoreCourse (NEW)

Restore a soft-deleted course.

**Signature**:
```javascript
async function restoreCourse(courseId)
```

**Output**:
```javascript
{ success: true }
// or throws Error if course not found or not soft-deleted
```

**Authorization**: Admin only

---

## Module Actions (app/actions/module.js)

### createModule (UNCHANGED)

Create a module within a course.

**Signature**:
```javascript
async function createModule(data)
// data: { title, slug?, courseId, order? }
```

**Authorization**: Course owner

---

### updateModule (UNCHANGED)

Update module metadata.

**Signature**:
```javascript
async function updateModule(moduleId, data)
```

**Authorization**: Module owner (via course)

---

### deleteModule (UNCHANGED)

Delete a module and cascade delete its lessons.

**Signature**:
```javascript
async function deleteModule(moduleId, courseId)
```

**Behavior**: Hard delete module + all lessons. Already shows confirmation in UI.

**Authorization**: Module owner (via course)

---

### reOrderModules (UNCHANGED)

Reorder modules within a course.

**Signature**:
```javascript
async function reOrderModules(data)
// data: [{ id: string, position: number }]
```

**Authorization**: Course owner (verified for all modules)

---

### changeModulePublishState (UNCHANGED)

Toggle module publish state.

**Signature**:
```javascript
async function changeModulePublishState(moduleId)
```

**Authorization**: Module owner (via course)

---

## Lesson Actions (app/actions/lesson.js)

### createLesson (UNCHANGED)

Create a lesson within a module.

**Signature**:
```javascript
async function createLesson(data)
// data: { title, slug?, moduleId, order?, description?, video fields... }
```

**Authorization**: Module owner (via course)

---

### updateLesson (UNCHANGED)

Update lesson metadata and video.

**Signature**:
```javascript
async function updateLesson(lessonId, data)
```

**Authorization**: Lesson owner (via module → course)

---

### deleteLesson (UNCHANGED)

Delete a lesson and its associated video file.

**Signature**:
```javascript
async function deleteLesson(lessonId, moduleId)
```

**Authorization**: Lesson owner (via module → course)

---

### reOrderLesson (UNCHANGED)

Reorder lessons within a module.

**Signature**:
```javascript
async function reOrderLesson(data)
// data: [{ id: string, position: number }]
```

**Authorization**: Module owner (verified for all lessons)

---

### changeLessonPublishState (UNCHANGED)

Toggle lesson publish state.

**Signature**:
```javascript
async function changeLessonPublishState(lessonId)
```

**Authorization**: Lesson owner (via module → course)

---

## Error Handling

All actions follow the same error pattern:

```javascript
// Validation error
throw new Error('Title is required')

// Authorization error
throw new Error('Unauthorized')  // Caught by error boundary → 403

// Not found
throw new Error('Course not found')  // Caught by error boundary → 404
```

Client components catch errors and display via `toast.error(error.message)`.

## Authorization Summary

| Action | Owner | Admin |
|--------|-------|-------|
| createCourse | ✅ (becomes owner) | ✅ |
| updateCourse | ✅ | ✅ |
| deleteCourse | ✅ | ✅ |
| changeCoursePublishState | ✅ | ✅ |
| validatePublishRequirements | ✅ | ✅ |
| restoreCourse | ❌ | ✅ |
| createModule | ✅ (course owner) | ✅ |
| updateModule | ✅ | ✅ |
| deleteModule | ✅ | ✅ |
| reOrderModules | ✅ | ✅ |
| changeModulePublishState | ✅ | ✅ |
| createLesson | ✅ (module owner) | ✅ |
| updateLesson | ✅ | ✅ |
| deleteLesson | ✅ | ✅ |
| reOrderLesson | ✅ | ✅ |
| changeLessonPublishState | ✅ | ✅ |
