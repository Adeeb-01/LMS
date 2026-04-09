# Quickstart: AI-Driven Remediation Dashboard

**Feature**: 020-ai-remediation-dashboard  
**Date**: 2026-04-09

## Prerequisites

- Node.js 22.x
- MongoDB running (local or Atlas)
- ChromaDB running and configured
- Existing LMS environment with BAT and Oral assessment data

## Environment Variables

No new environment variables required. Uses existing:

```bash
# Already in .env
MONGODB_URI=mongodb://...
CHROMA_HOST=http://localhost:8000
CHROMA_COLLECTION=lms_embeddings
```

## Setup Steps

### 1. Install Dependencies

No new dependencies required. Uses existing packages.

### 2. Create Models

```bash
# Files to create:
# - model/weakness-profile.model.js
# - model/remediation-session.model.js
```

### 3. Create Server Actions

```bash
# File to create:
# - app/actions/remediation.js
```

### 4. Create Background Service

```bash
# File to create:
# - service/remediation-queue.js
```

### 5. Create UI Components

```bash
# Files to create:
# - app/[locale]/(main)/dashboard/remediation/page.js
# - app/[locale]/(main)/dashboard/remediation/_components/weakness-list.jsx
# - app/[locale]/(main)/dashboard/remediation/_components/weakness-card.jsx
# - app/[locale]/(main)/dashboard/remediation/_components/remediation-player.jsx
# - app/[locale]/(main)/dashboard/remediation/_components/resolved-section.jsx
```

## Testing the Feature

### Manual Testing Flow

1. **Complete a BAT assessment with some wrong answers**
   - Navigate to a course with BAT enabled
   - Take the assessment, intentionally miss some questions
   - Verify the submission includes `missedConceptTags`

2. **Complete an Oral assessment with some failures**
   - Navigate to a lesson with oral assessments
   - Submit responses that miss key concepts
   - Verify `conceptsMissing` is recorded

3. **View Remediation Dashboard**
   - Navigate to `/dashboard/remediation?courseId=<course_id>`
   - Verify weaknesses appear from both sources
   - Check priority ordering (recent + frequent = higher)

4. **Test Deep-Link Video**
   - Click "Review Concept" on a weakness
   - Verify video player opens at correct timestamp
   - Verify "viewed" indicator appears after returning

5. **Test Weakness Resolution**
   - Retake assessment, passing the previously weak concept
   - Return to dashboard
   - Verify concept moved to "Resolved" section

### Automated Tests

```bash
# Run unit tests
npm test -- --grep "remediation"

# Run integration tests
npm test -- --grep "remediation.test"
```

## API Usage Examples

### Get Student's Weakness Profile

```javascript
import { getWeaknessProfile } from '@/app/actions/remediation';

const result = await getWeaknessProfile({
  courseId: '507f1f77bcf86cd799439011',
  status: 'active',
  page: 1,
  limit: 10
});

if (result.success) {
  console.log('Active weaknesses:', result.data.items);
  console.log('Stats:', result.data.stats);
}
```

### Mark Weakness as Viewed

```javascript
import { markWeaknessViewed } from '@/app/actions/remediation';

const result = await markWeaknessViewed({
  weaknessItemId: '507f1f77bcf86cd799439012'
});

if (result.success) {
  console.log('Viewed at:', result.data.viewedAt);
}
```

### Instructor: Get Class Aggregation

```javascript
import { getClassWeaknessAggregation } from '@/app/actions/remediation';

const result = await getClassWeaknessAggregation({
  courseId: '507f1f77bcf86cd799439011',
  limit: 20
});

if (result.success) {
  console.log('Top class weaknesses:', result.data.concepts);
  console.log('Students affected:', result.data.totalWithWeaknesses);
}
```

## Common Issues

### Weaknesses Not Appearing

1. Check that BAT/Oral assessments have `conceptTags` defined
2. Verify aggregation job completed (check `lastAggregatedAt`)
3. Manually trigger aggregation if needed

### Video Timestamps Missing

1. Check ChromaDB is healthy: `GET /api/health`
2. Verify lecture documents are indexed with timestamps
3. Check concept tag matches indexed content

### Priority Scores Unexpected

1. Review scoring algorithm in `lib/remediation/priority-scorer.js`
2. Check `failureCount` and `lastFailedAt` values
3. Verify `sources` array includes all failure instances

## Performance Notes

- Dashboard load target: <3 seconds
- Aggregation job target: <30 seconds
- Pagination recommended for profiles with 50+ items
- Video segment queries are cached per concept/course
