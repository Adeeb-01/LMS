# Research: AI-Driven Remediation Dashboard

**Feature**: 020-ai-remediation-dashboard  
**Date**: 2026-04-09

## Research Tasks Completed

### 1. Existing Data Sources for Weakness Aggregation

**Decision**: Aggregate from two existing sources:
- BAT Attempts: `Attempt.bat.missedConceptTags` (array of strings)
- Oral Responses: `StudentResponse.conceptsMissing` (array of strings)

**Rationale**: Both sources already capture concept-level failure data in consistent string array format. The existing `ConceptGap` model provides a pattern but is lesson-scoped; we need course-wide aggregation.

**Alternatives Considered**:
- Extend ConceptGap model → Rejected: Would require schema migration and breaks lesson-scoped design
- Query raw responses each time → Rejected: Too slow for dashboard load requirements

### 2. Vector Database Timestamp Retrieval

**Decision**: Query ChromaDB using concept tags as semantic search, retrieving `startTimestamp` and `endTimestamp` from chunk metadata.

**Rationale**: The existing ChromaDB integration stores lecture chunks with metadata including timestamps. Semantic search on concept tags will find the most relevant video segments.

**Implementation Pattern**:
```javascript
// Existing pattern in service/chroma.js
const results = await collection.query({
  queryEmbeddings: [conceptEmbedding],
  nResults: 1,
  where: { courseId: courseId.toString() }
});
// Metadata contains: { startTimestamp, endTimestamp, lessonId, ... }
```

**Alternatives Considered**:
- Direct timestamp lookup table → Rejected: Requires manual mapping maintenance
- Full-text search on transcripts → Rejected: Less accurate than semantic matching

### 3. Priority Scoring Algorithm

**Decision**: Composite score based on frequency, recency, and source diversity.

**Formula**:
```
priorityScore = (frequencyWeight * failureCount) + 
                (recencyWeight * recencyFactor) + 
                (diversityWeight * sourceCount)

Where:
- frequencyWeight = 0.4
- recencyWeight = 0.35
- diversityWeight = 0.25
- recencyFactor = 1 / (daysSinceLastFailure + 1)
- sourceCount = 1 (BAT only), 1 (Oral only), or 2 (both)
```

**Rationale**: Balances multiple signals - concepts failed more often, more recently, and across multiple assessment types deserve higher priority.

**Alternatives Considered**:
- Simple failure count → Rejected: Ignores recency
- Time-based only → Rejected: Ignores severity of repeated failures

### 4. Background Job Architecture

**Decision**: Use existing BullMQ pattern with new `remediation-queue.js` service.

**Trigger Points**:
1. After BAT attempt submission (`submitBatBlock` with status='completed')
2. After Oral response submission (`submitOralResponse` with passed=false)

**Rationale**: Follows existing patterns in `service/mcq-generation-queue.js` and `service/oral-generation-queue.js`. Provides reliable async processing without blocking user actions.

**Alternatives Considered**:
- Synchronous aggregation → Rejected: Would slow down assessment submission
- Cron-based batch → Rejected: Doesn't meet <30s requirement

### 5. Video Player Deep-Link Integration

**Decision**: Use URL query parameters for timestamp deep-linking.

**Pattern**:
```javascript
// Navigate to video with timestamp
router.push(`/courses/${courseId}/lessons/${lessonId}?t=${startTimestamp}`);

// Video player reads timestamp from URL
const searchParams = useSearchParams();
const startTime = searchParams.get('t');
```

**Rationale**: Standard web pattern, works with existing video player component, supports sharing/bookmarking.

**Alternatives Considered**:
- Modal overlay with embedded player → Rejected: Breaks navigation context
- Client-side state only → Rejected: Not shareable/bookmarkable

### 6. Instructor Aggregated Analytics

**Decision**: Separate query path for instructors that aggregates across students without exposing individual identities.

**Query Pattern**:
```javascript
// Instructor view: concept frequency across class
const classWeaknesses = await WeaknessProfile.aggregate([
  { $match: { courseId, status: 'active' } },
  { $unwind: '$items' },
  { $group: {
    _id: '$items.conceptTag',
    studentCount: { $addToSet: '$studentId' },
    totalOccurrences: { $sum: 1 }
  }},
  { $project: {
    concept: '$_id',
    affectedStudents: { $size: '$studentCount' },
    totalOccurrences: 1
  }}
]);
```

**Rationale**: Provides pedagogical value (which concepts need more class attention) without privacy concerns.

### 7. Weakness Resolution Detection

**Decision**: Listen for successful assessment completions and mark matching weaknesses as resolved.

**Detection Points**:
1. BAT: When `Attempt.status = 'submitted'` and concept not in `missedConceptTags`
2. Oral: When `StudentResponse.passed = true` and concept in `conceptsCovered`

**Rationale**: Assessment-based resolution ensures students demonstrate mastery, not just video consumption.

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| How to normalize concept tags across sources? | Use lowercase trimmed comparison; exact match required |
| What if concept has no video segment? | Show weakness with disabled "Review Concept" button |
| How to handle very large profiles (50+ items)? | Paginate with 10 items per page, "Show All" option |
| Should resolved items be permanently deleted? | No, move to historical section with `resolvedAt` timestamp |
