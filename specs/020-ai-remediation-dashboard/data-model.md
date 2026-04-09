# Data Model: AI-Driven Remediation Dashboard

**Feature**: 020-ai-remediation-dashboard  
**Date**: 2026-04-09

## New Entities

### WeaknessProfile

Per-student aggregated weakness collection for a course.

```javascript
// model/weakness-profile.model.js
const weaknessItemSchema = new Schema({
  conceptTag: {
    type: String,
    required: true,
    maxlength: 200
  },
  normalizedTag: {
    type: String,
    required: true,
    index: true
  },
  priorityScore: {
    type: Number,
    required: true,
    default: 0,
    index: true
  },
  failureCount: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  sources: [{
    type: {
      type: String,
      enum: ['bat', 'oral'],
      required: true
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    failedAt: {
      type: Date,
      required: true
    }
  }],
  videoSegment: {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    videoId: { type: String },
    startTimestamp: { type: Number },
    endTimestamp: { type: Number },
    resolved: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active',
    index: true
  },
  viewedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    assessmentType: { type: String, enum: ['bat', 'oral'] },
    assessmentId: { type: Schema.Types.ObjectId }
  },
  lastFailedAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const weaknessProfileSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  items: {
    type: [weaknessItemSchema],
    default: []
  },
  lastAggregatedAt: {
    type: Date,
    default: null
  },
  stats: {
    totalActive: { type: Number, default: 0 },
    totalResolved: { type: Number, default: 0 },
    averagePriority: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes
weaknessProfileSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
weaknessProfileSchema.index({ courseId: 1, 'items.status': 1 }); // For instructor aggregation
weaknessProfileSchema.index({ 'items.normalizedTag': 1, courseId: 1 }); // For concept lookup
```

**Field Descriptions**:
- `studentId`: Reference to the student user
- `courseId`: Reference to the course
- `items`: Array of weakness items with priority scores
- `items[].conceptTag`: Original concept tag string
- `items[].normalizedTag`: Lowercase trimmed version for matching
- `items[].priorityScore`: Calculated priority (0-100)
- `items[].failureCount`: Number of times this concept was failed
- `items[].sources`: Array tracking each failure source
- `items[].videoSegment`: Cached timestamp data from vector DB
- `items[].status`: 'active' or 'resolved'
- `items[].viewedAt`: When student clicked "Review Concept"
- `items[].resolvedAt`: When weakness was marked resolved
- `lastAggregatedAt`: Last background job run timestamp
- `stats`: Precomputed statistics for dashboard display

### RemediationSession

Tracks student remediation video viewing activity.

```javascript
// model/remediation-session.model.js
const remediationSessionSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  weaknessProfileId: {
    type: Schema.Types.ObjectId,
    ref: 'WeaknessProfile',
    required: true
  },
  weaknessItemId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  conceptTag: {
    type: String,
    required: true
  },
  lessonId: {
    type: Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  videoId: {
    type: String,
    required: true
  },
  startTimestamp: {
    type: Number,
    required: true
  },
  endTimestamp: {
    type: Number
  },
  watchDuration: {
    type: Number,
    default: 0
  },
  completedSegment: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
remediationSessionSchema.index({ studentId: 1, conceptTag: 1 });
remediationSessionSchema.index({ weaknessProfileId: 1, weaknessItemId: 1 });
```

**Field Descriptions**:
- `studentId`: Reference to the student
- `weaknessProfileId`: Reference to the parent profile
- `weaknessItemId`: Reference to the specific weakness item
- `conceptTag`: The concept being remediated
- `lessonId`, `videoId`: Video reference
- `startTimestamp`, `endTimestamp`: Video segment timestamps
- `watchDuration`: Seconds watched in this session
- `completedSegment`: Whether student watched to endTimestamp
- `startedAt`, `endedAt`: Session timing

## Entity Relationships

```
User (1) ──────────────── (N) WeaknessProfile
  │                              │
  │                              ├── items[] ──── (N) WeaknessItem
  │                              │                      │
  │                              │                      └── videoSegment
  │                              │                             │
  └── (N) RemediationSession ────┘                             │
                │                                              │
                └──────────────────────────────────────────────┘
                        (references lesson/video via timestamp)

Attempt.bat.missedConceptTags ───┐
                                 ├──► WeaknessProfile.items[]
StudentResponse.conceptsMissing ─┘

ChromaDB Embeddings ──► videoSegment.startTimestamp/endTimestamp
```

## Zod Validation Schemas

```javascript
// lib/validations/remediation.js
import { z } from 'zod';

export const weaknessItemSchema = z.object({
  conceptTag: z.string().min(1).max(200),
  priorityScore: z.number().min(0).max(100),
  failureCount: z.number().int().min(1),
  status: z.enum(['active', 'resolved']),
  viewedAt: z.date().nullable(),
  resolvedAt: z.date().nullable(),
  videoSegment: z.object({
    lessonId: z.string(),
    videoId: z.string(),
    startTimestamp: z.number().min(0),
    endTimestamp: z.number().min(0)
  }).nullable()
});

export const getWeaknessProfileSchema = z.object({
  courseId: z.string().min(1),
  status: z.enum(['active', 'resolved', 'all']).default('active'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10)
});

export const markViewedSchema = z.object({
  weaknessItemId: z.string().min(1)
});

export const startRemediationSessionSchema = z.object({
  weaknessItemId: z.string().min(1),
  lessonId: z.string().min(1),
  startTimestamp: z.number().min(0)
});

export const aggregateClassWeaknessesSchema = z.object({
  courseId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(20)
});
```

## State Transitions

### WeaknessItem Status

```
[New Failure Detected]
        │
        ▼
    ┌────────┐
    │ active │◄──────────────────────┐
    └────┬───┘                       │
         │                           │
         │ [Student passes           │ [Student fails
         │  assessment with          │  same concept
         │  this concept]            │  again]
         │                           │
         ▼                           │
    ┌──────────┐                     │
    │ resolved │─────────────────────┘
    └──────────┘
```

### Aggregation Flow

```
[BAT Attempt Submitted]          [Oral Response Submitted]
         │                                │
         ▼                                ▼
    missedConceptTags[]           conceptsMissing[]
         │                                │
         └────────────┬───────────────────┘
                      │
                      ▼
         [Background Job Triggered]
                      │
                      ▼
         [Fetch WeaknessProfile]
                      │
                      ▼
         [Merge new concepts]
         [Update failure counts]
         [Recalculate priorities]
                      │
                      ▼
         [Query ChromaDB for timestamps]
                      │
                      ▼
         [Save updated profile]
```

## Migration Notes

No migration required for existing data. The aggregation job will populate WeaknessProfile documents on first run for each student. Existing `ConceptGap` model remains unchanged for lesson-scoped functionality.
