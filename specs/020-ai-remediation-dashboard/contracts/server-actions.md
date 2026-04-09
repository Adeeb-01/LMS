# Server Actions Contract: Remediation Dashboard

**Feature**: 020-ai-remediation-dashboard  
**Location**: `app/actions/remediation.js`

## Actions

### getWeaknessProfile

Retrieves the student's weakness profile for a course.

**Authorization**: Student (own profile only)

```typescript
// Input
interface GetWeaknessProfileInput {
  courseId: string;
  status?: 'active' | 'resolved' | 'all'; // default: 'active'
  page?: number;      // default: 1
  limit?: number;     // default: 10, max: 50
}

// Output
interface GetWeaknessProfileOutput {
  success: boolean;
  data?: {
    profileId: string;
    courseId: string;
    items: WeaknessItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: {
      totalActive: number;
      totalResolved: number;
      averagePriority: number;
    };
    lastAggregatedAt: string | null;
  };
  error?: {
    code: 'NOT_AUTHENTICATED' | 'NOT_ENROLLED' | 'NOT_FOUND' | 'SERVER_ERROR';
    message: string;
  };
}

interface WeaknessItem {
  id: string;
  conceptTag: string;
  priorityScore: number;
  failureCount: number;
  sources: Array<{
    type: 'bat' | 'oral';
    failedAt: string;
  }>;
  videoSegment: {
    lessonId: string;
    videoId: string;
    startTimestamp: number;
    endTimestamp: number;
  } | null;
  status: 'active' | 'resolved';
  viewedAt: string | null;
  resolvedAt: string | null;
  lastFailedAt: string;
}
```

---

### markWeaknessViewed

Records that student clicked "Review Concept" for a weakness.

**Authorization**: Student (own profile only)

```typescript
// Input
interface MarkWeaknessViewedInput {
  weaknessItemId: string;
}

// Output
interface MarkWeaknessViewedOutput {
  success: boolean;
  data?: {
    viewedAt: string;
  };
  error?: {
    code: 'NOT_AUTHENTICATED' | 'NOT_FOUND' | 'NOT_AUTHORIZED' | 'SERVER_ERROR';
    message: string;
  };
}
```

---

### startRemediationSession

Starts tracking a remediation video viewing session.

**Authorization**: Student (own profile only)

```typescript
// Input
interface StartRemediationSessionInput {
  weaknessItemId: string;
  lessonId: string;
  startTimestamp: number;
}

// Output
interface StartRemediationSessionOutput {
  success: boolean;
  data?: {
    sessionId: string;
    conceptTag: string;
    startedAt: string;
  };
  error?: {
    code: 'NOT_AUTHENTICATED' | 'NOT_FOUND' | 'NOT_AUTHORIZED' | 'SERVER_ERROR';
    message: string;
  };
}
```

---

### endRemediationSession

Ends a remediation session with watch duration data.

**Authorization**: Student (own session only)

```typescript
// Input
interface EndRemediationSessionInput {
  sessionId: string;
  watchDuration: number;  // seconds
  completedSegment: boolean;
}

// Output
interface EndRemediationSessionOutput {
  success: boolean;
  data?: {
    sessionId: string;
    watchDuration: number;
    completedSegment: boolean;
    endedAt: string;
  };
  error?: {
    code: 'NOT_AUTHENTICATED' | 'NOT_FOUND' | 'NOT_AUTHORIZED' | 'SERVER_ERROR';
    message: string;
  };
}
```

---

### getClassWeaknessAggregation

Retrieves anonymized class-level weakness patterns.

**Authorization**: Instructor (course owner) or Admin

```typescript
// Input
interface GetClassWeaknessAggregationInput {
  courseId: string;
  limit?: number;  // default: 20, max: 100
}

// Output
interface GetClassWeaknessAggregationOutput {
  success: boolean;
  data?: {
    courseId: string;
    totalStudents: number;
    totalWithWeaknesses: number;
    concepts: Array<{
      conceptTag: string;
      affectedStudents: number;     // count, not identities
      totalOccurrences: number;
      avgPriority: number;
    }>;
    generatedAt: string;
  };
  error?: {
    code: 'NOT_AUTHENTICATED' | 'NOT_AUTHORIZED' | 'NOT_FOUND' | 'SERVER_ERROR';
    message: string;
  };
}
```

---

### triggerProfileAggregation

Manually triggers weakness profile aggregation for a student.

**Authorization**: Student (own profile) or Admin

```typescript
// Input
interface TriggerProfileAggregationInput {
  courseId: string;
  studentId?: string;  // Admin only, defaults to current user
}

// Output
interface TriggerProfileAggregationOutput {
  success: boolean;
  data?: {
    jobId: string;
    status: 'queued' | 'processing';
    estimatedCompletionMs: number;
  };
  error?: {
    code: 'NOT_AUTHENTICATED' | 'NOT_AUTHORIZED' | 'ALREADY_PROCESSING' | 'SERVER_ERROR';
    message: string;
  };
}
```

## Error Codes Reference

| Code | HTTP Equivalent | Description |
|------|-----------------|-------------|
| NOT_AUTHENTICATED | 401 | User not logged in |
| NOT_AUTHORIZED | 403 | User lacks permission for this action |
| NOT_ENROLLED | 403 | Student not enrolled in course |
| NOT_FOUND | 404 | Resource does not exist |
| ALREADY_PROCESSING | 409 | Aggregation job already running |
| SERVER_ERROR | 500 | Unexpected server error |
