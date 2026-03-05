# Data Model: Refactor Course Management

**Feature**: 002-refactor-course-management  
**Date**: 2026-03-05  
**Status**: Complete

## Overview

This refactoring preserves existing data models with minimal schema additions. The only changes are:
1. Add soft-delete fields to Course model
2. Document existing schema structure for reference

## Entity Changes

### Course (model/course-model.js)

**New Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `deletedAt` | Date | No | null | Timestamp when course was soft-deleted |
| `deletedBy` | ObjectId (ref: User) | No | null | User who performed the soft-delete |

**Existing Fields** (no changes):

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | String | Yes | — | Course title (max 200 chars) |
| `subtitle` | String | No | — | Course subtitle |
| `description` | String | No | — | Course description |
| `thumbnail` | String | No | — | URL to thumbnail image |
| `modules` | [ObjectId] | No | [] | References to Module documents |
| `price` | Number | No | 0 | Course price |
| `active` | Boolean | No | false | Publish status |
| `category` | ObjectId | No | null | Reference to Category |
| `instructor` | ObjectId | Yes | — | Reference to User (instructor) |
| `testimonials` | [Object] | No | [] | Student testimonials |
| `learning` | [String] | No | [] | Learning objectives |
| `createdOn` | Date | No | now | Creation timestamp |
| `modifiedOn` | Date | No | now | Last modification timestamp |

**Indexes**:
- Existing: `instructor`, `category`, `active`
- New: `deletedAt` (for query filtering)

**Query Scope**:
- Default queries exclude `deletedAt: { $ne: null }`
- Admin queries can include deleted courses explicitly

### Module (model/module.model.js)

**No Changes** — existing schema preserved.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | String | Yes | — | Module title (max 200 chars) |
| `description` | String | No | — | Module description |
| `active` | Boolean | No | false | Publish status |
| `slug` | String | No | auto | URL-safe identifier |
| `course` | ObjectId | Yes | — | Reference to parent Course |
| `lessonIds` | [ObjectId] | No | [] | References to Lesson documents |
| `order` | Number | No | 0 | Display order within course |

### Lesson (model/lesson.model.js)

**No Changes** — existing schema preserved.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | String | Yes | — | Lesson title (max 200 chars) |
| `description` | String | No | — | Lesson description (max 5000 chars) |
| `duration` | Number | No | 0 | Duration in seconds |
| `video_url` | String | No | — | Legacy video URL field |
| `videoProvider` | Enum | No | 'local' | 'local' or 'external' |
| `videoFilename` | String | No | — | Local video filename |
| `videoUrl` | String | No | — | External video URL |
| `videoMimeType` | String | No | — | Video MIME type |
| `videoSize` | Number | No | 0 | Video file size in bytes |
| `active` | Boolean | No | false | Publish status |
| `slug` | String | No | auto | URL-safe identifier |
| `access` | Enum | No | 'private' | 'private' or 'public' (preview) |
| `order` | Number | No | 0 | Display order within module |

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                         Course                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ instructor  │  │  category   │  │  modules[]  │          │
│  │ (User ref)  │  │(Category ref)│  │(Module refs)│          │
│  └─────────────┘  └─────────────┘  └──────┬──────┘          │
│                                           │                  │
│  NEW: deletedAt, deletedBy                │                  │
└───────────────────────────────────────────┼──────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         Module                               │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │   course    │  │ lessonIds[] │                           │
│  │(Course ref) │  │(Lesson refs)│                           │
│  └─────────────┘  └──────┬──────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         Lesson                               │
│  (No parent reference - linked via Module.lessonIds)        │
│  Video fields: videoProvider, videoFilename, videoUrl, etc. │
└─────────────────────────────────────────────────────────────┘
```

## State Transitions

### Course States

```
┌──────────┐    create()     ┌──────────┐
│          │ ──────────────► │          │
│  (none)  │                 │  DRAFT   │
│          │                 │ active=F │
└──────────┘                 └────┬─────┘
                                  │
                    publish()     │     unpublish()
                    (validated)   ▼         │
                             ┌──────────┐   │
                             │PUBLISHED │◄──┘
                             │ active=T │
                             └────┬─────┘
                                  │
                    softDelete()  │ (when enrollments exist)
                    (enrollments) ▼
                             ┌──────────┐
                             │ DELETED  │
                             │deletedAt │
                             │  set     │
                             └──────────┘
```

### Publish Validation Rules

A course can transition from DRAFT to PUBLISHED only when:
1. Course has at least 1 module (`modules.length >= 1`)
2. At least 1 module has at least 1 lesson (`module.lessonIds.length >= 1`)

### Delete Behavior

| Scenario | Action |
|----------|--------|
| Course with no enrollments | Hard delete (remove from DB) |
| Course with enrollments | Soft delete (set `deletedAt`, `deletedBy`) |
| Module (any) | Hard delete + cascade delete lessons |
| Lesson (any) | Hard delete + remove video file if local |

## Zod Schema Updates

### lib/validations.js additions

```javascript
// Add to courseSchema for soft-delete support
export const courseDeleteSchema = z.object({
  deletedAt: z.date().nullable().optional(),
  deletedBy: z.string().nullable().optional()
});

// Publish validation helper (not a Zod schema, business logic)
export function validatePublishRequirements(course, modules) {
  const missing = [];
  
  if (!modules || modules.length === 0) {
    missing.push('At least 1 module required');
  } else {
    const hasLessons = modules.some(m => m.lessonIds?.length > 0);
    if (!hasLessons) {
      missing.push('At least 1 lesson required in a module');
    }
  }
  
  return {
    canPublish: missing.length === 0,
    missing
  };
}
```

## Migration Strategy

**Approach**: No migration script needed.

**Rationale**:
- New fields (`deletedAt`, `deletedBy`) default to `null`
- Existing documents are valid without these fields
- Mongoose handles missing fields gracefully
- Query scopes check for `deletedAt: { $ne: null }` which works for documents without the field

**Backward Compatibility**:
- All existing courses remain accessible
- No data transformation required
- New fields only populated on soft-delete action
