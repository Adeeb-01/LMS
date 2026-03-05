# Quickstart: Refactor Course Management

**Feature**: 002-refactor-course-management  
**Date**: 2026-03-05

## Prerequisites

- Node.js 18+ installed
- MongoDB running (local or Atlas)
- Environment variables configured (see below)

## Environment Variables

No new environment variables required for this feature. Existing variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lms

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# File Upload (existing)
UPLOAD_DIR=./uploads
MAX_VIDEO_SIZE=500000000  # 500MB
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

No new dependencies are added in this refactor.

### 2. Run Development Server

```bash
npm run dev
```

### 3. Access the Application

- Dashboard: http://localhost:3000/en/dashboard
- Add Course: http://localhost:3000/en/dashboard/courses/add
- Edit Course: http://localhost:3000/en/dashboard/courses/[courseId]

## Testing the Refactored Features

### Course Creation Flow

1. Log in as an instructor
2. Navigate to Dashboard → Courses → Add Course
3. Fill in unified form (title, subtitle, description, thumbnail, price, category)
4. Submit to create draft course
5. Verify redirect to course edit page

### Course Editing

1. Navigate to an existing course
2. Verify sections are organized (Basic Info, Media, Pricing, Status)
3. Test inline editing for each field
4. Verify publish status badge visibility

### Module Management

1. On course edit page, add a new module
2. Add multiple modules and test drag-and-drop reorder
3. Test module deletion (with and without lessons)

### Lesson Management

1. Navigate to a module
2. Add lessons with video upload
3. Test retry on simulated upload failure (disconnect network briefly)
4. Test lesson reorder via drag-and-drop

### Publishing Workflow

1. Create a new course (no modules)
2. Attempt to publish → should fail with checklist
3. Add a module with a lesson
4. Publish → should succeed
5. Unpublish → verify course hidden from catalog

### Soft Delete

1. Create a course and enroll a test student
2. As instructor, delete the course
3. Verify soft delete (course hidden, enrollment preserved)
4. As admin, verify ability to view/restore deleted courses

## Key Files Modified

### Server Actions
- `app/actions/course.js` - Enhanced createCourse, deleteCourse, publish validation
- `app/actions/module.js` - Minor documentation updates
- `app/actions/lesson.js` - Minor documentation updates

### Components
- `app/[locale]/dashboard/courses/add/page.jsx` - Unified creation form
- `app/[locale]/dashboard/courses/[courseId]/page.jsx` - Organized edit sections
- `app/[locale]/dashboard/courses/[courseId]/_components/` - New section wrappers
- `components/ui/publish-badge.jsx` - New reusable status badge

### Models
- `model/course-model.js` - Added deletedAt, deletedBy fields

### Validation
- `lib/validations.js` - Added publish validation helper

## Troubleshooting

### Course won't publish
- Check that course has at least 1 module
- Check that at least 1 module has at least 1 lesson
- Use `validatePublishRequirements` action to see detailed checklist

### Video upload fails repeatedly
- Check network connectivity
- Verify file size under MAX_VIDEO_SIZE limit
- Check UPLOAD_DIR permissions
- Check server logs for specific error

### Deleted course still visible
- Clear browser cache
- Verify `deletedAt` field is set in database
- Check query doesn't explicitly include deleted courses

## Related Documentation

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [Server Actions Contract](./contracts/server-actions.md)
- [Research](./research.md)
