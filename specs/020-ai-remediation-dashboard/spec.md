# Feature Specification: AI-Driven Remediation Dashboard

**Feature Branch**: `020-ai-remediation-dashboard`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "Epic 4: AI-Driven Remediation Dashboard (Unit 3) - A smart remediation dashboard that aggregates student weaknesses from BAT and Oral assessments, links to source material via vector-timestamp matching, and provides deep-linked video playback for targeted concept review."

## Clarifications

### Session 2026-04-09

- Q: What is the expected timeframe for weakness profile updates after new assessment results? → A: Near real-time (<30 seconds) via background job processing
- Q: Can instructors view student weakness data? → A: Aggregated only - Instructors see class-level weakness patterns (anonymized), not individual student profiles
- Q: When is a weakness considered "resolved" and removed from the active profile? → A: Assessment-based - Removed when student passes a subsequent assessment covering that concept

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Personalized Weakness Dashboard (Priority: P1)

As a Student, I want to see a prioritized list of my conceptual weaknesses aggregated from both my BAT assessment blocks and oral recitations, so that I can understand exactly which concepts I need to review.

**Why this priority**: This is the core value proposition of the feature. Without a clear view of weaknesses, students cannot efficiently target their learning gaps. This must work before any deep-linking functionality matters.

**Independent Test**: Can be fully tested by having a student who has completed at least one BAT assessment or oral recitation view their dashboard and see a list of concepts they struggled with, prioritized by frequency or impact.

**Acceptance Scenarios**:

1. **Given** a student has completed at least one BAT assessment with some incorrect answers, **When** they open the remediation dashboard, **Then** they see a list of conceptual tags from their incorrect responses, sorted by priority.
2. **Given** a student has completed at least one oral recitation with failed concepts, **When** they open the remediation dashboard, **Then** they see those failed oral concepts integrated into the same weakness list.
3. **Given** a student has weaknesses from both BAT and oral assessments for the same concept, **When** they view the dashboard, **Then** the concept appears once with combined evidence from both sources indicating higher priority.
4. **Given** a student has no assessment history, **When** they open the remediation dashboard, **Then** they see an empty state message encouraging them to complete assessments first.
5. **Given** a student has a weakness for "recursion" and subsequently passes an assessment covering recursion, **When** they view the dashboard, **Then** "recursion" is moved from the active weakness list to a "Resolved" historical section.

---

### User Story 2 - Deep-Link to Video at Exact Timestamp (Priority: P2)

As a Student viewing my weakness dashboard, I want to click a "Review Concept" button next to any weakness and have the video player open directly at the exact second where that concept is explained, so I can immediately remediate without scrubbing through the entire lecture.

**Why this priority**: This is the key differentiator that makes remediation efficient. Once students can see their weaknesses (P1), they need the ability to jump directly to relevant content.

**Independent Test**: Can be tested by clicking "Review Concept" on any weakness item and verifying the video player starts at the correct timestamp where that concept is explained.

**Acceptance Scenarios**:

1. **Given** a student is viewing a weakness that maps to a specific video segment, **When** they click "Review Concept", **Then** the video player opens and begins playback at the exact start timestamp for that concept.
2. **Given** a concept spans a time range in the video, **When** the student clicks "Review Concept", **Then** the video starts at the beginning of that range, and the end timestamp is available for reference.
3. **Given** a student reviews a concept and returns to the dashboard, **When** they view the same weakness, **Then** they see an indicator that they have viewed the remediation content.
4. **Given** a weakness has no associated video timestamp (edge case), **When** the student views that weakness, **Then** the "Review Concept" button is disabled or shows an alternative action.

---

### User Story 3 - Cross-Assessment Weakness Aggregation (Priority: P3)

As the System, I need to collect and unify conceptual tags from both BAT blocks (Unit 1) and oral recitations (Unit 2) into a single weakness profile per student, so that remediation recommendations are comprehensive and not siloed by assessment type.

**Why this priority**: While critical for data completeness, the aggregation logic is a backend concern that supports P1 and P2. Students benefit from this implicitly through better dashboard data.

**Independent Test**: Can be tested by having a student complete both a BAT assessment and an oral recitation covering overlapping concepts, then verifying the weakness profile correctly merges data from both sources.

**Acceptance Scenarios**:

1. **Given** a student has failed a BAT block tagged with "recursion", **When** the system aggregates weaknesses, **Then** "recursion" appears in their unified weakness profile with source attribution.
2. **Given** a student has failed an oral recitation on "recursion", **When** the system aggregates weaknesses, **Then** "recursion" is merged with existing BAT data if present, or added as new if not.
3. **Given** new assessment results are recorded, **When** the system processes them, **Then** the weakness profile is updated within 30 seconds via background processing.
4. **Given** a student has no failures in a conceptual area, **When** the system aggregates weaknesses, **Then** that concept does not appear in their weakness profile.

---

### User Story 4 - Weakness Priority Scoring (Priority: P4)

As a Student, I want my weaknesses to be ranked by severity or frequency so that I focus on the most impactful concepts first, not just a random list.

**Why this priority**: Enhances the usability of P1 but is not strictly required for basic functionality. Students can still benefit from an unsorted list.

**Independent Test**: Can be tested by verifying that weaknesses with multiple failures or recent failures appear higher in the list than single or older failures.

**Acceptance Scenarios**:

1. **Given** a student has failed the same concept twice in BAT assessments, **When** they view the dashboard, **Then** that concept ranks higher than concepts failed only once.
2. **Given** a student failed a concept recently and another concept weeks ago, **When** they view the dashboard, **Then** the recent failure is prioritized higher.
3. **Given** a student failed a concept in both BAT and oral assessments, **When** they view the dashboard, **Then** that concept ranks higher than concepts failed in only one assessment type.

---

### Edge Cases

- What happens when a concept tag exists in assessments but has no matching video segment in the vector database? (Show weakness but disable deep-link, provide alternative resources if available)
- How does the system handle a student who has completed assessments but has no weaknesses (100% correct)? (Show congratulatory message and suggest advanced topics)
- What happens when the source video is deleted or unavailable? (Show error state with explanation, offer to flag for instructor review)
- How are duplicate concept tags handled when they differ slightly (e.g., "Recursion" vs "recursion" vs "recursive functions")? (Normalize tags during aggregation using canonical concept mappings)
- What happens when a student's weakness profile is very large (50+ concepts)? (Paginate or limit initial display with option to "Show All")

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST aggregate conceptual tags from incorrectly answered BAT assessment blocks into the student's weakness profile.
- **FR-002**: System MUST aggregate conceptual tags from failed oral recitation responses into the student's weakness profile.
- **FR-003**: System MUST merge weaknesses from multiple assessment types into a single unified profile per student.
- **FR-004**: System MUST query the vector database to retrieve the exact start and end timestamps for each conceptual tag.
- **FR-005**: System MUST display a prioritized list of weaknesses on the student's remediation dashboard.
- **FR-006**: System MUST provide a "Review Concept" action for each weakness that has an associated video timestamp.
- **FR-007**: System MUST launch the video player at the exact start timestamp when a student clicks "Review Concept".
- **FR-008**: System MUST track which remediation content a student has viewed.
- **FR-009**: System MUST handle cases where a concept has no matching video timestamp gracefully.
- **FR-010**: System MUST calculate a priority score for each weakness based on frequency and recency of failures.
- **FR-011**: System MUST display the source(s) of each weakness (BAT, Oral, or both).
- **FR-012**: System MUST update the weakness profile when new assessment results are recorded.
- **FR-013**: System MUST restrict individual weakness profiles to the owning student only (private by default).
- **FR-014**: System MUST provide instructors with anonymized, aggregated class-level weakness patterns without exposing individual student identities.
- **FR-015**: System MUST mark a weakness as "resolved" when the student passes a subsequent assessment (BAT or Oral) that covers that concept.
- **FR-016**: System MUST move resolved weaknesses from the active list to a historical record accessible to the student.

### Key Entities

- **WeaknessProfile**: A per-student collection of conceptual weaknesses derived from assessment failures. Contains aggregated weakness items with priority scores, sources, and timestamps.
- **WeaknessItem**: An individual concept the student has struggled with. Includes the concept tag, priority score, assessment sources (BAT/Oral), video segment references, and view status.
- **VideoSegment**: A timestamped portion of lecture video associated with a specific concept. Contains start timestamp, end timestamp, concept tag, and source video reference.
- **ConceptTag**: A normalized identifier for a learning concept. Used to link assessment questions, oral prompts, and video segments together.
- **RemediationSession**: A record of a student viewing a remediation video segment. Tracks which concept, timestamp, video, and completion status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can access their remediation dashboard and see their personalized weakness list within 3 seconds of page load.
- **SC-002**: 95% of weakness items display accurate video timestamp links (start within 5 seconds of actual concept explanation in video).
- **SC-003**: Students can navigate from weakness item to video playback at the correct timestamp in under 2 clicks.
- **SC-004**: Students who use the remediation dashboard show 30% improvement in subsequent assessment scores on previously weak concepts within their next 3 assessment attempts.
- **SC-005**: System successfully aggregates weaknesses from both BAT and Oral assessments with 100% completeness (no missed failures).
- **SC-006**: 80% of students with available weaknesses engage with at least one remediation video link within their first dashboard visit.
- **SC-007**: Average time to remediate a single concept (view weakness → watch relevant video segment) is under 5 minutes.

## Assumptions

- The existing BAT assessment system (Unit 1) tags incorrect answers with conceptual tags that can be retrieved.
- The existing oral recitation system (Unit 2) tags failed responses with conceptual tags that can be retrieved.
- Video content has been processed and indexed in a vector database with concept-to-timestamp mappings.
- The video player component supports deep-linking to specific timestamps via URL parameters or API.
- Concept tags are reasonably standardized or a normalization mapping exists.
- Students have access to the course videos referenced in their weakness profiles.
