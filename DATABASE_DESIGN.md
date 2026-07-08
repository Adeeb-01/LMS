# LMS Database Design Documentation

> **Last Updated:** May 2026
>
> This document provides a comprehensive database design reference including the Entity-Relationship (ER) diagram, relational schema with field types, and all constraints (Primary Key, Foreign Key, Unique Key, Check Key).

---

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Entity-Relationship (ER) Diagram](#2-entity-relationship-er-diagram)
   - 2.1 [Full ER Diagram](#21-full-er-diagram)
   - 2.2 [Domain-Specific ER Diagrams](#22-domain-specific-er-diagrams)
3. [Relational Schema](#3-relational-schema)
4. [Constraints and Keys](#4-constraints-and-keys)
   - 4.1 [Primary Keys](#41-primary-keys)
   - 4.2 [Foreign Keys](#42-foreign-keys)
   - 4.3 [Unique Keys](#43-unique-keys)
   - 4.4 [Check Constraints](#44-check-constraints)
   - 4.5 [Indexes](#45-indexes)
5. [Entity Descriptions](#5-entity-descriptions)
6. [Relationship Descriptions](#6-relationship-descriptions)

---

## 1. Database Overview

| Property | Value |
|----------|-------|
| **Database Engine** | MongoDB 7.x |
| **ODM** | Mongoose 8.8.2 |
| **Vector Database** | ChromaDB 3.3.2 (optional, for embeddings) |
| **Total Collections** | 28 |
| **Total Relationships** | 55+ foreign key references |

### Domain Groups

| Domain | Collections | Purpose |
|--------|-------------|---------|
| **Core Platform** | User, Course, Module, Lesson, Category | Course hierarchy and users |
| **Commerce** | Enrollment, Payment | Student enrollment and payments |
| **Assessment** | Quiz, Question, Attempt, StudentResponse, Assessment | Quiz system with IRT |
| **Content Pipeline** | LectureDocument, VideoTranscript, PipelineJob, AlignmentJob, IndexingJob, GenerationJob, OralGenerationJob | AI content processing |
| **AI Tutoring** | TutorInteraction, OralAssessment, ReciteBackAttempt | RAG tutor and oral assessment |
| **Remediation** | WeaknessProfile, ConceptGap, RemediationSession | Student weakness tracking |
| **Engagement** | Watch, Testimonial, Report | Progress and reviews |

---

## 2. Entity-Relationship (ER) Diagram

### 2.1 Full ER Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CORE PLATFORM DOMAIN                                      │
│                                                                                              │
│  ┌──────────────┐       1         ┌──────────────┐       1         ┌──────────────┐          │
│  │   Category   │◄────────────────│    Course     │───────────────►│     User     │          │
│  │              │   belongs to    │              │   instructor    │  (Instructor) │          │
│  │  PK: _id    │                 │  PK: _id     │                │  PK: _id      │          │
│  └──────────────┘                │  FK: category │                │  UK: email    │          │
│                                  │  FK: instructor               └───────┬───────┘          │
│                                  │  FK: deletedBy│                       │                   │
│                                  └───────┬───────┘                       │                   │
│                                          │ 1                             │                   │
│                                          │                               │                   │
│                                          ▼ *                             │                   │
│                                  ┌──────────────┐                        │                   │
│                                  │    Module     │                        │                   │
│                                  │              │                        │                   │
│                                  │  PK: _id     │                        │                   │
│                                  │  FK: course  │                        │                   │
│                                  └───────┬───────┘                       │                   │
│                                          │ 1                             │                   │
│                                          │                               │                   │
│                                          ▼ *                             │                   │
│                                  ┌──────────────┐                        │                   │
│                                  │    Lesson     │                        │                   │
│                                  │              │                        │                   │
│                                  │  PK: _id     │                        │                   │
│                                  │  FK: courseId │                        │                   │
│                                  └──────────────┘                        │                   │
│                                                                          │                   │
└──────────────────────────────────────────────────────────────────────────┼───────────────────┘
                                                                           │
┌──────────────────────────────────────────────────────────────────────────┼───────────────────┐
│                                    COMMERCE DOMAIN                        │                   │
│                                                                          │                   │
│  ┌──────────────┐                                                        │                   │
│  │  Enrollment  │◄───────────────────────────────────────────────────────┘                   │
│  │              │   student (User)                                                           │
│  │  PK: _id     │                                                                            │
│  │  FK: student │────►[User]                                                                 │
│  │  FK: course  │────►[Course]                                                               │
│  │  FK: payment │────►[Payment]                                                              │
│  │  UK: (student│                                                                            │
│  │     + course)│                ┌──────────────┐                                            │
│  └──────────────┘                │   Payment    │                                            │
│                                  │              │                                            │
│                                  │  PK: _id     │                                            │
│                                  │  FK: user    │────►[User]                                 │
│                                  │  FK: course  │────►[Course]                               │
│                                  │  UK: referenceId (sparse)                                 │
│                                  └──────────────┘                                            │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ASSESSMENT DOMAIN                                          │
│                                                                                              │
│  ┌──────────────┐       1         ┌──────────────┐       *         ┌──────────────┐          │
│  │     Quiz     │────────────────►│   Question   │                │   Attempt    │          │
│  │              │   has many      │              │                │              │          │
│  │  PK: _id     │                 │  PK: _id     │                │  PK: _id     │          │
│  │  FK: courseId │                │  FK: quizId  │                │  FK: quizId  │          │
│  │  FK: lessonId│                │  FK: generationJobId          │  FK: studentId│          │
│  │  FK: createdBy                │  FK: oralGenerationJobId      │              │          │
│  └──────┬───────┘                │  FK: duplicateOf              │  Contains:   │          │
│         │                        └──────────────┘                │  answers[]   │          │
│         │ 1                                                      │  adaptive{}  │          │
│         │                                                        │  bat{}       │          │
│         ▼ *                                                      └──────────────┘          │
│  ┌──────────────┐                                                                          │
│  │   Attempt    │◄─────────────────[User (studentId)]                                      │
│  │  (answers[]  │                                                                          │
│  │  embedded)   │       ┌──────────────────┐                                                │
│  └──────────────┘       │ StudentResponse  │                                                │
│                         │ (Oral responses) │                                                │
│                         │                  │                                                │
│                         │  PK: _id         │                                                │
│                         │  FK: userId      │────►[User]                                     │
│                         │  FK: assessmentId│────►[OralAssessment]                           │
│                         │  FK: lessonId    │────►[Lesson]                                   │
│                         └──────────────────┘                                                │
│                                                                                              │
│  ┌──────────────┐       ┌──────────────┐                                                    │
│  │  Assessment  │       │    Report     │                                                    │
│  │  (Legacy)    │       │              │                                                    │
│  │  PK: _id     │       │  PK: _id     │                                                    │
│  └──────────────┘       │  FK: course  │────►[Course]                                       │
│                         │  FK: student │────►[User]                                         │
│                         │  FK: quizAssessment──►[Assessment]                                │
│                         │  UK: (course │                                                    │
│                         │     + student)│                                                    │
│                         └──────────────┘                                                    │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                               CONTENT PIPELINE DOMAIN                                        │
│                                                                                              │
│                              ┌───────────────────┐                                           │
│                              │    PipelineJob     │                                           │
│                              │   (Orchestrator)   │                                           │
│                              │                    │                                           │
│                              │  PK: _id           │                                           │
│                              │  FK: lessonId      │────►[Lesson]                              │
│                              │  FK: courseId       │────►[Course]                              │
│                              │  FK: triggeredBy    │────►[User]                               │
│                              │  FK: extractionJobId│────►[LectureDocument]                    │
│                              │  FK: alignmentJobId │────►[AlignmentJob]                       │
│                              │  FK: indexingJobId  │────►[IndexingJob]                        │
│                              │  FK: mcqGenerationJobId──►[GenerationJob]                     │
│                              │  FK: oralGenerationJobId─►[OralGenerationJob]                 │
│                              └─────────┬─────────┘                                           │
│                    ┌───────────────────┼───────────────────┐                                 │
│                    ▼                   ▼                   ▼                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                            │
│  │ LectureDocument  │  │  AlignmentJob    │  │   IndexingJob    │                            │
│  │                  │  │                  │  │                  │                            │
│  │ PK: _id          │  │ PK: _id          │  │ PK: _id          │                            │
│  │ FK: lessonId     │  │ FK: lessonId     │  │ FK: lectureDocId │                            │
│  │ FK: courseId     │  │ FK: courseId     │  │ FK: courseId     │                            │
│  │ FK: uploadedBy   │  │ FK: lectureDocId │  │ FK: lessonId     │                            │
│  │ FK: videoTransId │  │ FK: videoTransId │  │ FK: pipelineJobId│                            │
│  │ FK: embeddingJobId│ │ FK: pipelineJobId│  └──────────────────┘                            │
│  │ UK: lessonId     │  │ FK: triggeredBy  │                                                  │
│  └──────────────────┘  └──────────────────┘                                                  │
│                                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                            │
│  │ VideoTranscript  │  │  GenerationJob   │  │OralGenerationJob │                            │
│  │                  │  │                  │  │                  │                            │
│  │ PK: _id          │  │ PK: _id          │  │ PK: _id          │                            │
│  │ FK: lessonId     │  │ FK: lessonId     │  │ FK: lessonId     │                            │
│  │ FK: courseId     │  │ FK: courseId     │  │ FK: courseId     │                            │
│  │ UK: lessonId     │  │ FK: quizId       │  │ FK: quizId       │                            │
│  └──────────────────┘  │ FK: lectureDocId │  │ FK: lectureDocId │                            │
│                        │ FK: triggeredBy  │  │ FK: pipelineJobId│                            │
│                        │ FK: pipelineJobId│  │ FK: triggeredBy  │                            │
│                        └──────────────────┘  └──────────────────┘                            │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                AI TUTORING DOMAIN                                            │
│                                                                                              │
│  ┌───────────────────┐       1        ┌─────────────────────┐                                │
│  │ TutorInteraction  │◄──────────────│  ReciteBackAttempt  │                                │
│  │                   │  belongs to   │                     │                                │
│  │  PK: _id          │               │  PK: _id            │                                │
│  │  FK: userId       │────►[User]    │  FK: interactionId  │────►[TutorInteraction]          │
│  │  FK: lessonId     │────►[Lesson]  │  FK: userId          │────►[User]                     │
│  │  FK: courseId     │────►[Course]  │  FK: lessonId        │────►[Lesson]                   │
│  └───────────────────┘               └─────────────────────┘                                │
│                                                                                              │
│  ┌───────────────────┐                                                                      │
│  │  OralAssessment   │                                                                      │
│  │                   │                                                                      │
│  │  PK: _id          │                                                                      │
│  │  FK: lessonId     │────►[Lesson]                                                          │
│  │  FK: courseId     │────►[Course]                                                          │
│  │  FK: createdBy    │────►[User]                                                            │
│  │  UK: (lessonId +  │                                                                      │
│  │    triggerTimestamp)                                                                      │
│  └───────────────────┘                                                                      │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                REMEDIATION DOMAIN                                            │
│                                                                                              │
│  ┌───────────────────┐       1        ┌───────────────────────┐                              │
│  │ WeaknessProfile   │◄──────────────│  RemediationSession   │                              │
│  │                   │  belongs to   │                       │                              │
│  │  PK: _id          │               │  PK: _id              │                              │
│  │  FK: studentId    │────►[User]    │  FK: studentId         │────►[User]                   │
│  │  FK: courseId     │────►[Course]  │  FK: weaknessProfileId │────►[WeaknessProfile]        │
│  │  UK: (studentId + │               │  FK: lessonId          │────►[Lesson]                 │
│  │      courseId)    │               └───────────────────────┘                              │
│  │  Contains:        │                                                                      │
│  │  items[] (embedded│               ┌───────────────────┐                                  │
│  │  weaknesses)      │               │    ConceptGap      │                                  │
│  └───────────────────┘               │                   │                                  │
│                                      │  PK: _id          │                                  │
│                                      │  FK: userId       │────►[User]                       │
│                                      │  FK: lessonId     │────►[Lesson]                     │
│                                      │  FK: courseId     │────►[Course]                     │
│                                      └───────────────────┘                                  │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                ENGAGEMENT DOMAIN                                             │
│                                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                                   │
│  │    Watch     │    │ Testimonial  │    │  Assessment  │                                   │
│  │              │    │              │    │   (Legacy)   │                                   │
│  │  PK: _id     │    │  PK: _id     │    │  PK: _id     │                                   │
│  │  FK: user    │──► │  FK: user    │──► └──────────────┘                                   │
│  │  FK: lesson  │──► │  FK: courseId │──►                                                    │
│  │  FK: module  │──► └──────────────┘                                                       │
│  └──────────────┘                                                                           │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Domain-Specific ER Diagrams

#### 2.2.1 Course Hierarchy

```
                         ┌──────────┐
                         │ Category │
                         │          │
                         │ PK: _id  │
                         └────┬─────┘
                              │ 1
                              │
                              ▼ *
┌──────────┐  1    *   ┌──────────┐  1    *   ┌──────────┐  1    *   ┌──────────┐
│   User   │──────────►│  Course  │──────────►│  Module  │──────────►│  Lesson  │
│(instrctr)│ instructs │          │ contains  │          │ contains  │          │
└──────────┘           │ modules[]│           │lessonIds[]           └──────────┘
                       └──────────┘           └──────────┘
```

#### 2.2.2 Quiz and Adaptive Testing

```
┌──────────┐  1    *   ┌──────────┐
│   Quiz   │──────────►│ Question │
│          │ contains  │          │
│courseId   │           │ quizId   │
│lessonId   │           │ irt{a,b,c}
│adaptiveConfig         │ conceptTags
│batConfig  │           │ bloomLevel│
└─────┬────┘           └──────────┘
      │ 1
      │
      ▼ *
┌──────────────┐
│   Attempt    │
│              │
│ quizId       │
│ studentId    │
│ answers[]    │  ◄── Embedded answer sub-documents
│ adaptive{    │       with selectionMetrics
│  currentTheta│
│  currentSE   │
│  thetaHistory│
│ }            │
│ bat{         │
│  blocks[]    │
│  thetaHistory│
│ }            │
└──────────────┘
```

#### 2.2.3 Content Pipeline

```
                              ┌─────────────┐
                              │ PipelineJob  │
                              │ (parent)     │
                              └──────┬───────┘
                                     │
               ┌─────────┬──────────┼──────────┬─────────────┐
               ▼          ▼          ▼          ▼             ▼
        ┌───────────┐┌──────────┐┌─────────┐┌──────────┐┌─────────────┐
        │ Lecture   ││Alignment ││Indexing ││Generation││OralGeneration│
        │ Document  ││  Job     ││  Job    ││  Job     ││    Job      │
        └─────┬─────┘└──────────┘└─────────┘└──────────┘└─────────────┘
              │
              ▼
        ┌───────────┐
        │  Video    │
        │Transcript │
        └───────────┘
```

#### 2.2.4 AI Tutoring

```
┌──────┐    ┌──────────────────┐  1    *   ┌─────────────────────┐
│ User │───►│ TutorInteraction │──────────►│  ReciteBackAttempt  │
└──────┘    │                  │ has many  │                     │
            │ question         │           │ originalExplanation │
            │ response         │           │ recitation          │
            │ isGrounded       │           │ similarityScore     │
            │ retrievedChunks[]│           │ passed              │
            │ timestampLinks[] │           └─────────────────────┘
            └──────────────────┘

┌──────┐    ┌──────────────────┐  1    *   ┌─────────────────────┐
│ User │───►│  OralAssessment  │──────────►│  StudentResponse    │
└──────┘    │                  │ has many  │                     │
            │ triggerTimestamp  │           │ transcription       │
            │ questionText     │           │ similarityScore     │
            │ referenceAnswer  │           │ conceptsCovered[]   │
            │ keyConcepts[]    │           │ conceptsMissing[]   │
            │ passingThreshold │           │ passed              │
            └──────────────────┘           └─────────────────────┘
```

#### 2.2.5 Remediation

```
┌──────┐    ┌──────────────────┐  1    *   ┌─────────────────────┐
│ User │───►│ WeaknessProfile  │──────────►│ RemediationSession  │
└──────┘    │                  │ triggers  │                     │
            │ items[]{         │           │ conceptTag          │
            │  conceptTag      │           │ videoId             │
            │  priorityScore   │           │ startTimestamp      │
            │  failureCount    │           │ watchDuration       │
            │  videoSegment{}  │           │ completedSegment    │
            │  status          │           └─────────────────────┘
            │ }                │
            │ stats{}          │           ┌─────────────────────┐
            └──────────────────┘           │    ConceptGap       │
                                           │                     │
                                           │ concept             │
                                           │ source              │
                                           │ failureCount        │
                                           │ flaggedForReview    │
                                           └─────────────────────┘
```

---

## 3. Relational Schema

### 3.1 User

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `firstName` | String | Yes | — | Max 50 chars, trimmed |
| `lastName` | String | Yes | — | Max 50 chars, trimmed |
| `email` | String | Yes | — | Unique, indexed, lowercase, regex-validated |
| `password` | String | Yes | — | bcrypt hash, `select: false` (excluded by default) |
| `role` | String | Yes | `'student'` | Enum: `admin`, `instructor`, `student` |
| `phone` | String | No | — | Phone number |
| `bio` | String | No | `""` | User biography |
| `socialMedia` | Object | No | — | Social media links (flexible) |
| `profilePicture` | String | No | `"/assets/images/profile.jpg"` | Avatar URL |
| `designation` | String | No | `""` | Job title / designation |
| `status` | String | No | `'active'` | Enum: `active`, `inactive`, `suspended` |
| `lastLogin` | Date | No | — | Last login timestamp |
| `createdAt` | Date | No | `Date.now` | Account creation date |
| `updatedAt` | Date | No | `Date.now` | Last update date |

### 3.2 Course

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `title` | String | Yes | — | Course title |
| `subtitle` | String | No | `"subtitle"` | Course subtitle |
| `description` | String | Yes | — | Course description |
| `thumbnail` | String | No | — | Thumbnail image URL |
| `modules` | [ObjectId] | No | `[]` | FK → Module (array of refs) |
| `price` | Number | Yes | `0` | Course price |
| `active` | Boolean | Yes | `false` | Published status |
| `category` | ObjectId | No | — | FK → Category |
| `instructor` | ObjectId | No | — | FK → User (instructor) |
| `testimonials` | [ObjectId] | No | `[]` | FK → Testimonial (array of refs) |
| `learning` | [String] | No | `[]` | Learning outcomes list |
| `createdOn` | Date | Yes | `Date.now` | Creation date |
| `modifiedOn` | Date | Yes | `Date.now` | Auto-updated on save |
| `deletedAt` | Date | No | `null` | Soft delete timestamp |
| `deletedBy` | ObjectId | No | `null` | FK → User (who deleted) |

### 3.3 Module

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `title` | String | Yes | — | Module title |
| `description` | String | No | — | Module description |
| `active` | Boolean | Yes | `false` | Active status |
| `slug` | String | Yes | — | URL slug |
| `course` | ObjectId | Yes | — | FK → Course (parent course) |
| `lessonIds` | [ObjectId] | No | `[]` | FK → Lesson (ordered array) |
| `order` | Number | Yes* | — | Display order |

### 3.4 Lesson

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `title` | String | Yes | — | Lesson title |
| `description` | String | No | — | Lesson description |
| `duration` | Number | Yes | `0` | Duration in seconds |
| `video_url` | String | No | — | External video URL |
| `videoProvider` | String | No | `'external'` | Enum: `local`, `external` |
| `videoFilename` | String | No | — | Local video filename |
| `videoUrl` | String | No | — | Video URL (local path) |
| `videoMimeType` | String | No | — | Video MIME type |
| `videoSize` | Number | No | — | Video file size in bytes |
| `active` | Boolean | Yes | `false` | Active status |
| `slug` | String | Yes | — | URL slug |
| `access` | String | Yes | `"private"` | Access level |
| `order` | Number | Yes | — | Display order |
| `lectureDocumentId` | ObjectId | No | — | FK → LectureDocument |
| `courseId` | ObjectId | No | — | FK → Course |

### 3.5 Category

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `title` | String | Yes | — | Category name |
| `description` | String | No | — | Category description |
| `thumbnail` | String | Yes | — | Thumbnail image URL |

### 3.6 Enrollment

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `enrollment_date` | Date | Yes | `Date.now` | Enrollment timestamp |
| `status` | String | Yes | `'not-started'` | Enum: `not-started`, `in-progress`, `completed` |
| `completion_date` | Date | No | — | Course completion date |
| `method` | String | Yes | `'stripe'` | Enum: `stripe`, `free`, `manual`, `mockpay` |
| `course` | ObjectId | Yes | — | FK → Course (indexed) |
| `student` | ObjectId | Yes | — | FK → User (indexed) |
| `payment` | ObjectId | No | — | FK → Payment |

### 3.7 Payment

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `user` | ObjectId | Yes | — | FK → User (indexed) |
| `course` | ObjectId | Yes | — | FK → Course (indexed) |
| `sessionId` | String | No | — | Stripe session ID (sparse index) |
| `paymentIntentId` | String | No | — | Stripe payment intent ID (indexed) |
| `customerId` | String | No | — | Stripe customer ID (indexed) |
| `referenceId` | String | No | — | MockPay reference (unique, sparse) |
| `amount` | Number | Yes | — | Payment amount |
| `currency` | String | Yes | `"USD"` | Currency code |
| `status` | String | Yes | `'pending'` | Enum: `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded`, `canceled` |
| `provider` | String | Yes | `'stripe'` | Enum: `stripe`, `mockpay` |
| `metadata` | Mixed | No | `{}` | Flexible metadata |
| `refundedAmount` | Number | No | `0` | Amount refunded |
| `refundReason` | String | No | — | Reason for refund |
| `paidAt` | Date | No | — | Payment confirmation time |
| `refundedAt` | Date | No | — | Refund processing time |
| `createdAt` | Date | No | `Date.now` | Record creation |
| `updatedAt` | Date | No | `Date.now` | Auto-updated on save |

### 3.8 Quiz

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `lessonId` | ObjectId | No | `null` | FK → Lesson |
| `title` | String | Yes | — | Quiz title (trimmed) |
| `description` | String | No | `""` | Quiz description |
| `published` | Boolean | No | `false` | Published status (indexed) |
| `required` | Boolean | No | `false` | Required for course completion |
| `passPercent` | Number | No | `70` | Passing percentage (0–100) |
| `timeLimitSec` | Number | No | `null` | Time limit in seconds (min: 1) |
| `maxAttempts` | Number | No | `null` | Max attempts allowed (min: 1) |
| `shuffleQuestions` | Boolean | No | `false` | Randomize question order |
| `shuffleOptions` | Boolean | No | `false` | Randomize option order |
| `showAnswersPolicy` | String | No | `"after_submit"` | Enum: `never`, `after_submit`, `after_pass` |
| `adaptiveConfig` | Object | No | — | Adaptive (IRT) quiz settings (see below) |
| `batConfig` | Object | No | — | Block Adaptive Testing settings (see below) |
| `createdBy` | ObjectId | Yes | — | FK → User |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

**`adaptiveConfig` sub-document:**

| Field | Type | Default | Constraint |
|-------|------|---------|------------|
| `enabled` | Boolean | `false` | — |
| `precisionThreshold` | Number | `0.30` | Min: 0.1, Max: 1.0 |
| `minQuestions` | Number | `5` | Min: 1 |
| `maxQuestions` | Number | `30` | Min: 5 |
| `contentBalancing.enabled` | Boolean | `false` | — |
| `contentBalancing.moduleWeights` | [{moduleId, weight}] | `[]` | weight: 0–1 |
| `initialTheta` | Number | `0.0` | — |

**`batConfig` sub-document:**

| Field | Type | Default | Constraint |
|-------|------|---------|------------|
| `enabled` | Boolean | `false` | — |
| `blockSize` | Number | `2` | Min: 2, Max: 5 |
| `totalBlocks` | Number | `5` | Min: 3, Max: 10 |
| `initialTheta` | Number | `0.0` | — |

### 3.9 Question

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `quizId` | ObjectId | Yes | — | FK → Quiz (indexed) |
| `type` | String | Yes | — | Enum: `single`, `multi`, `true_false`, `oral` |
| `text` | String | Yes | — | Question text (trimmed) |
| `referenceAnswer` | Mixed | No | `""` | Reference answer for oral |
| `cognitiveLevel` | String | No | `""` | Enum: `application`, `analysis`, `synthesis`, `evaluation`, `""` |
| `oralGenerationJobId` | ObjectId | No | `null` | FK → OralGenerationJob (indexed) |
| `options` | [{id, text}] | Conditional | — | Required if type ≠ `oral`; min 2 options |
| `correctOptionIds` | [String] | Conditional | — | Required if type ≠ `oral`; ≥1 correct |
| `explanation` | String | No | `""` | Answer explanation |
| `points` | Number | No | `1` | Points value (min: 0) |
| `order` | Number | Yes | `0` | Display order |
| `sourceTimestamp` | Object | No | — | Lesson + time reference |
| `generatedBy` | String | No | `'manual'` | Enum: `manual`, `gemini` |
| `sourceChunkId` | String | No | `null` | ChromaDB chunk reference |
| `difficultyReasoning` | String | No | `""` | AI reasoning for difficulty |
| `bloomLevel` | String | No | `""` | Enum: `remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`, `""` |
| `isDraft` | Boolean | No | `false` | Draft status (indexed) |
| `generationJobId` | ObjectId | No | `null` | FK → GenerationJob (indexed) |
| `duplicateOf` | ObjectId | No | `null` | FK → Question (self-ref) |
| `irt` | Object | No | `{a:1, b:0, c:0}` | IRT parameters (see below) |
| `conceptTags` | [String] | No | `[]` | Concept labels (max 100 chars each) |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

**`irt` sub-document (3PL Item Response Theory):**

| Field | Type | Default | Constraint | Description |
|-------|------|---------|------------|-------------|
| `a` | Number | `1.0` | Min: 0.01 | Discrimination parameter |
| `b` | Number | `0.0` | — | Difficulty parameter |
| `c` | Number | `0.0` | Min: 0, Max: 1 | Guessing parameter |

### 3.10 Attempt

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `quizId` | ObjectId | Yes | — | FK → Quiz (indexed) |
| `studentId` | ObjectId | Yes | — | FK → User (indexed) |
| `status` | String | No | `"in_progress"` | Enum: `in_progress`, `submitted`, `expired` |
| `startedAt` | Date | Yes | `Date.now` | Attempt start time |
| `expiresAt` | Date | No | `null` | Expiration time |
| `submittedAt` | Date | No | `null` | Submission time |
| `answers` | [answerSchema] | No | `[]` | Embedded answers (see below) |
| `score` | Number | No | `0` | Total raw score |
| `scorePercent` | Number | No | `0` | Percentage score |
| `passed` | Boolean | No | `false` | Pass/fail result |
| `adaptive` | Object | No | — | Adaptive IRT state (see below) |
| `bat` | Object | No | — | BAT state (see below) |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

**Embedded `answers[]` sub-document:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `_id` | ObjectId | Auto | Sub-document ID (for polling) |
| `questionId` | ObjectId | — | FK → Question |
| `selectedOptionIds` | [String] | `[]` | Selected option IDs |
| `audioUrl` | String | `null` | Oral answer audio URL |
| `skippedDueToMic` | Boolean | `false` | Mic permission denied |
| `transcribedText` | String | `""` | Transcribed oral answer |
| `score` | Number | `0` | Answer score |
| `gradingStatus` | String | `null` | Enum: `pending`, `evaluating`, `completed`, `failed` |
| `selectionMetrics` | Object | — | IRT selection metrics |

**`adaptive` sub-document:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | Boolean | `false` | Whether adaptive mode is active |
| `currentTheta` | Number | `0.0` | Current ability estimate |
| `currentSE` | Number | `null` | Current standard error |
| `thetaHistory` | [{questionIndex, questionId, theta, se, timestamp}] | `[]` | Ability estimation history |
| `terminationReason` | String | `null` | Enum: `precision_achieved`, `max_reached`, `pool_exhausted`, `user_submitted` |
| `questionOrder` | [ObjectId] | `[]` | Ordered question IDs presented |
| `activeDeviceId` | String | `null` | Concurrent session protection |

**`bat` sub-document:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | Boolean | `false` | Whether BAT mode is active |
| `currentTheta` | Number | `0.0` | Current ability estimate |
| `currentSE` | Number | `1.0` | Current standard error |
| `currentBlockIndex` | Number | `0` | Active block index |
| `blocks` | [{index, difficultyBand, questionIds, answers, submitted, thetaAfterBlock, seAfterBlock}] | `[]` | Block data |
| `thetaHistory` | [{blockIndex, theta, se, timestamp}] | `[]` | Block-level theta history |
| `terminationReason` | String | `null` | Enum: `blocks_completed`, `user_abandoned` |
| `missedConceptTags` | [String] | `[]` | Concepts answered incorrectly |
| `activeSessionId` | String | `null` | Concurrent session protection |

### 3.11 StudentResponse

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `userId` | ObjectId | Yes | — | FK → User (indexed) |
| `assessmentId` | ObjectId | Yes | — | FK → OralAssessment (indexed) |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `transcription` | String | Yes | — | Transcribed response |
| `similarityScore` | Number | Yes | — | Score 0–1 |
| `conceptsCovered` | [String] | No | `[]` | Covered concepts |
| `conceptsMissing` | [String] | No | `[]` | Missing concepts |
| `passed` | Boolean | Yes | — | Pass/fail |
| `inputMethod` | String | No | `'voice'` | Enum: `voice`, `text` |
| `attemptNumber` | Number | No | `1` | Attempt count |
| `createdAt` | Date | No | `Date.now` | Response timestamp |

### 3.12 Watch

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `state` | String | Yes | `"started"` | Watch state |
| `created_at` | Date | Yes | `Date.now` | Creation time |
| `modified_at` | Date | Yes | `Date.now` | Auto-updated on save |
| `lesson` | ObjectId | No | — | FK → Lesson |
| `module` | ObjectId | No | — | FK → Module |
| `user` | ObjectId | No | — | FK → User |
| `lastTime` | Number | Yes | `0` | Last watched time (seconds) |

### 3.13 Testimonial

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `content` | String | Yes | — | Review text |
| `rating` | Number | Yes | — | Rating value |
| `courseId` | ObjectId | No | — | FK → Course |
| `user` | ObjectId | No | — | FK → User |

### 3.14 Assessment (Legacy)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `assessments` | Array | Yes | — | Assessment data array |
| `otherMarks` | Number | Yes | — | Additional marks |

### 3.15 Report

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `totalCompletedLessons` | Array | Yes | `[]` | Completed lesson IDs |
| `totalCompletedModules` | Array | Yes | `[]` | Completed module IDs |
| `course` | ObjectId | No | — | FK → Course |
| `student` | ObjectId | No | — | FK → User |
| `quizAssessment` | ObjectId | No | — | FK → Assessment |
| `passedQuizIds` | [ObjectId] | No | `[]` | FK → Quiz (passed quizzes) |
| `latestQuizAttemptByQuiz` | Map<String,String> | No | `{}` | Quiz→Attempt mapping |
| `completion_date` | Date | No | — | Completion date |

### 3.16 LectureDocument

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (unique) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `originalFilename` | String | Yes | — | Max 255 chars |
| `fileSize` | Number | Yes | — | Max 52,428,800 (50 MB) |
| `mimeType` | String | Yes | — | File MIME type |
| `status` | String | No | `'uploading'` | Enum: `uploading`, `processing`, `ready`, `failed` |
| `errorMessage` | String | No | — | Error details |
| `extractedText` | Object | No | — | Extracted content (embedded) |
| `videoTranscriptId` | ObjectId | No | — | FK → VideoTranscript |
| `uploadedBy` | ObjectId | Yes | — | FK → User |
| `embeddingStatus` | String | No | `null` | Enum: `pending`, `processing`, `indexed`, `failed` |
| `embeddingJobId` | ObjectId | No | — | FK → IndexingJob |
| `chunksIndexed` | Number | No | `0` | Indexed chunk count |
| `lastIndexedAt` | Date | No | — | Last indexing time |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

### 3.17 VideoTranscript

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (unique) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `language` | String | Yes | `'en'` | Language code |
| `duration` | Number | Yes | — | Video duration in seconds |
| `segments` | [{start, end, text}] | No | `[]` | Transcript segments |
| `words` | [{start, end, word}] | No | `[]` | Word-level timing |
| `alignments` | [{blockIndex, startSeconds, endSeconds, confidence, status}] | No | `[]` | Text-video alignments |
| `alignmentStatus` | String | No | `'pending'` | Enum: `pending`, `processing`, `completed`, `failed` |
| `errorMessage` | String | No | — | Error details |
| `processingDurationMs` | Number | No | — | Processing time |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

### 3.18 PipelineJob

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `triggeredBy` | ObjectId | Yes | — | FK → User |
| `status` | String | No | `'pending'` | Enum: `pending`, `extracting`, `aligning`, `indexing`, `generating`, `completed`, `failed`, `cancelled` |
| `extractionJobId` | ObjectId | No | — | FK → LectureDocument |
| `alignmentJobId` | ObjectId | No | — | FK → AlignmentJob |
| `indexingJobId` | ObjectId | No | — | FK → IndexingJob |
| `mcqGenerationJobId` | ObjectId | No | — | FK → GenerationJob |
| `oralGenerationJobId` | ObjectId | No | — | FK → OralGenerationJob |
| `stages` | Object | No | — | Stage status sub-documents |
| `summary` | Object | No | — | Processing summary stats |
| `notificationSent` | Boolean | No | `false` | Completion notification flag |
| `startedAt` | Date | No | — | Pipeline start time |
| `completedAt` | Date | No | — | Pipeline completion time |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

### 3.19 AlignmentJob

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `lectureDocumentId` | ObjectId | Yes | — | FK → LectureDocument |
| `videoTranscriptId` | ObjectId | No | — | FK → VideoTranscript |
| `status` | String | No | `'queued'` | Enum: `queued`, `processing`, `completed`, `failed` |
| `phase` | String | No | `'audio-extraction'` | Enum: `audio-extraction`, `transcription`, `alignment`, `saving` |
| `progress` | Number | No | `0` | Progress 0–100 |
| `errorMessage` | String | No | — | Error details |
| `retryCount` | Number | No | `0` | Max: 1 |
| `scheduledFor` | Date | Yes | `Date.now` | Queue scheduling time |
| `startedAt` | Date | No | — | Job start time |
| `completedAt` | Date | No | — | Job completion time |
| `failedAt` | Date | No | — | Job failure time |
| `pipelineJobId` | ObjectId | No | — | FK → PipelineJob |
| `triggeredBy` | ObjectId | Yes | — | FK → User |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

### 3.20 IndexingJob

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `lectureDocumentId` | ObjectId | Yes | — | FK → LectureDocument (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `lessonId` | ObjectId | Yes | — | FK → Lesson |
| `pipelineJobId` | ObjectId | No | — | FK → PipelineJob |
| `status` | String | No | `'pending'` | Enum: `pending`, `processing`, `completed`, `failed`, `cancelled` |
| `chunksTotal` | Number | No | `0` | Total chunks to process |
| `chunksProcessed` | Number | No | `0` | Chunks processed |
| `errorMessage` | String | No | — | Error details |
| `retryCount` | Number | No | `0` | Retry attempts |
| `startedAt` | Date | No | — | Job start time |
| `completedAt` | Date | No | — | Job completion time |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

### 3.21 GenerationJob

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `quizId` | ObjectId | Yes | — | FK → Quiz |
| `lectureDocumentId` | ObjectId | Yes | — | FK → LectureDocument |
| `triggeredBy` | ObjectId | Yes | — | FK → User (indexed) |
| `pipelineJobId` | ObjectId | No | — | FK → PipelineJob |
| `status` | String | No | `'pending'` | Enum: `pending`, `processing`, `completed`, `failed`, `cancelled` |
| `chunksTotal` | Number | No | `0` | Total chunks |
| `chunksProcessed` | Number | No | `0` | Processed chunks |
| `questionsGenerated` | Number | No | `0` | Questions created |
| `questionsFlagged` | Number | No | `0` | Potential duplicates |
| `chunkErrors` | [{chunkId, error, timestamp}] | No | `[]` | Per-chunk errors |
| `errorMessage` | String | No | — | Global error message |
| `retryCount` | Number | No | `0` | Retry attempts |
| `startedAt` | Date | No | — | Job start time |
| `completedAt` | Date | No | — | Job completion time |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

### 3.22 OralGenerationJob

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `quizId` | ObjectId | Yes | — | FK → Quiz |
| `lectureDocumentId` | ObjectId | Yes | — | FK → LectureDocument |
| `pipelineJobId` | ObjectId | No | — | FK → PipelineJob |
| `triggeredBy` | ObjectId | Yes | — | FK → User |
| `status` | String | No | `'pending'` | Enum: `pending`, `processing`, `completed`, `failed`, `cancelled` |
| `chunksTotal` | Number | No | `0` | Total chunks |
| `chunksProcessed` | Number | No | `0` | Processed chunks |
| `chunksSkipped` | Number | No | `0` | Skipped chunks |
| `questionsGenerated` | Number | No | `0` | Questions created |
| `questionsFlagged` | Number | No | `0` | Potential duplicates |
| `chunkErrors` | [{chunkId, error, timestamp}] | No | `[]` | Per-chunk errors |
| `errorMessage` | String | No | — | Global error message |
| `retryCount` | Number | No | `0` | Retry attempts |
| `startedAt` | Date | No | — | Job start time |
| `completedAt` | Date | No | — | Job completion time |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

### 3.23 TutorInteraction

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `userId` | ObjectId | Yes | — | FK → User (indexed) |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `question` | String | Yes | — | Student question (max 1000 chars) |
| `questionInputMethod` | String | Yes | — | Enum: `voice`, `text` |
| `response` | String | Yes | — | AI response (max 10000 chars) |
| `isGrounded` | Boolean | Yes | `false` | Grounded in lecture content |
| `retrievedChunks` | [{chunkId, content, similarity}] | No | `[]` | RAG context chunks |
| `timestampLinks` | [{seconds, label}] | No | `[]` | Video timestamp references |
| `satisfactionRating` | Number | No | — | 1–5 rating |
| `reciteBackRequired` | Boolean | No | `false` | Requires recite-back |
| `createdAt` | Date | No | `Date.now` | Interaction time (indexed) |

### 3.24 OralAssessment

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `triggerTimestamp` | Number | Yes | — | Video timestamp (seconds) |
| `questionText` | String | Yes | — | Assessment question |
| `referenceAnswer` | String | Yes | — | Expected answer |
| `keyConcepts` | [String] | No | `[]` | Key concepts to check |
| `passingThreshold` | Number | No | `0.6` | Score threshold to pass |
| `status` | String | No | `'approved'` | Enum: `pending`, `approved`, `rejected` |
| `createdBy` | ObjectId | Yes | — | FK → User |
| `createdAt` | Date | No | `Date.now` | Creation time |

### 3.25 ReciteBackAttempt

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `interactionId` | ObjectId | Yes | — | FK → TutorInteraction (indexed) |
| `userId` | ObjectId | Yes | — | FK → User (indexed) |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `originalExplanation` | String | Yes | — | Original AI explanation |
| `recitation` | String | Yes | — | Student's recitation |
| `similarityScore` | Number | Yes | — | Score 0–1 |
| `passed` | Boolean | Yes | — | Pass/fail result |
| `attemptNumber` | Number | Yes | — | Attempt number (min: 1) |
| `inputMethod` | String | Yes | — | Enum: `voice`, `text` |
| `createdAt` | Date | No | `Date.now` | Attempt time |

### 3.26 WeaknessProfile

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `studentId` | ObjectId | Yes | — | FK → User (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `items` | [weaknessItemSchema] | No | `[]` | Embedded weakness items |
| `lastAggregatedAt` | Date | No | `null` | Last aggregation time |
| `stats.totalActive` | Number | No | `0` | Active weakness count |
| `stats.totalResolved` | Number | No | `0` | Resolved weakness count |
| `stats.averagePriority` | Number | No | `0` | Average priority score |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

**Embedded `items[]` (weaknessItemSchema):**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `_id` | ObjectId | Auto | Auto |
| `conceptTag` | String | Yes | — (max 200) |
| `normalizedTag` | String | Yes | — (indexed) |
| `priorityScore` | Number | Yes | `0` (indexed) |
| `failureCount` | Number | Yes | `1` (min: 1) |
| `sources` | [{type, sourceId, failedAt}] | No | `[]` |
| `videoSegment` | {lessonId, videoId, startTimestamp, endTimestamp, resolved} | No | — |
| `status` | String | No | `'active'` (indexed); Enum: `active`, `resolved` |
| `viewedAt` | Date | No | `null` |
| `resolvedAt` | Date | No | `null` |
| `resolvedBy` | {assessmentType, assessmentId} | No | — |
| `lastFailedAt` | Date | Yes | — (indexed) |
| `createdAt` | Date | No | `Date.now` |

### 3.27 ConceptGap

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `userId` | ObjectId | Yes | — | FK → User (indexed) |
| `lessonId` | ObjectId | Yes | — | FK → Lesson (indexed) |
| `courseId` | ObjectId | Yes | — | FK → Course (indexed) |
| `concept` | String | Yes | — | Concept text (max 500) |
| `source` | String | Yes | — | Enum: `assessment`, `recite_back` |
| `sourceId` | ObjectId | Yes | — | Source assessment/attempt ID |
| `failureCount` | Number | Yes | `1` | Failure count (min: 1) |
| `flaggedForReview` | Boolean | No | `true` | Needs review |
| `resolvedAt` | Date | No | — | Resolution time |
| `createdAt` | Date | No | `Date.now` | Gap detected time |
| `updatedAt` | Date | No | `Date.now` | Last update (timestamps) |

### 3.28 RemediationSession

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Auto-generated | Primary Key |
| `studentId` | ObjectId | Yes | — | FK → User (indexed) |
| `weaknessProfileId` | ObjectId | Yes | — | FK → WeaknessProfile |
| `weaknessItemId` | ObjectId | Yes | — | WeaknessProfile.items._id |
| `conceptTag` | String | Yes | — | Concept being remediated |
| `lessonId` | ObjectId | Yes | — | FK → Lesson |
| `videoId` | String | Yes | — | Video identifier |
| `startTimestamp` | Number | Yes | — | Video start point (seconds) |
| `endTimestamp` | Number | No | — | Video end point (seconds) |
| `watchDuration` | Number | No | `0` | Actual watch time (seconds) |
| `completedSegment` | Boolean | No | `false` | Watched required segment |
| `startedAt` | Date | No | `Date.now` | Session start |
| `endedAt` | Date | No | — | Session end |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

---

## 4. Constraints and Keys

### 4.1 Primary Keys

Every collection uses MongoDB's auto-generated `_id` field (ObjectId, 12-byte BSON type) as the primary key.

| Collection | Primary Key | Type |
|------------|-------------|------|
| User | `_id` | ObjectId |
| Course | `_id` | ObjectId |
| Module | `_id` | ObjectId |
| Lesson | `_id` | ObjectId |
| Category | `_id` | ObjectId |
| Enrollment | `_id` | ObjectId |
| Payment | `_id` | ObjectId |
| Quiz | `_id` | ObjectId |
| Question | `_id` | ObjectId |
| Attempt | `_id` | ObjectId |
| StudentResponse | `_id` | ObjectId |
| Watch | `_id` | ObjectId |
| Testimonial | `_id` | ObjectId |
| Assessment | `_id` | ObjectId |
| Report | `_id` | ObjectId |
| LectureDocument | `_id` | ObjectId |
| VideoTranscript | `_id` | ObjectId |
| PipelineJob | `_id` | ObjectId |
| AlignmentJob | `_id` | ObjectId |
| IndexingJob | `_id` | ObjectId |
| GenerationJob | `_id` | ObjectId |
| OralGenerationJob | `_id` | ObjectId |
| TutorInteraction | `_id` | ObjectId |
| OralAssessment | `_id` | ObjectId |
| ReciteBackAttempt | `_id` | ObjectId |
| WeaknessProfile | `_id` | ObjectId |
| ConceptGap | `_id` | ObjectId |
| RemediationSession | `_id` | ObjectId |

### 4.2 Foreign Keys

MongoDB does not enforce referential integrity at the database level, but Mongoose `ref` declarations define logical foreign key relationships:

| Collection | Field | References | Ref Collection | Required |
|------------|-------|------------|----------------|----------|
| **Course** | `category` | Category._id | Category | No |
| **Course** | `instructor` | User._id | User | No |
| **Course** | `modules[]` | Module._id | Module | No |
| **Course** | `testimonials[]` | Testimonial._id | Testimonial | No |
| **Course** | `deletedBy` | User._id | User | No |
| **Module** | `course` | Course._id | Course | Yes |
| **Module** | `lessonIds[]` | Lesson._id | Lesson | No |
| **Lesson** | `lectureDocumentId` | LectureDocument._id | LectureDocument | No |
| **Lesson** | `courseId` | Course._id | Course | No |
| **Enrollment** | `course` | Course._id | Course | Yes |
| **Enrollment** | `student` | User._id | User | Yes |
| **Enrollment** | `payment` | Payment._id | Payment | No |
| **Payment** | `user` | User._id | User | Yes |
| **Payment** | `course` | Course._id | Course | Yes |
| **Quiz** | `courseId` | Course._id | Course | Yes |
| **Quiz** | `lessonId` | Lesson._id | Lesson | No |
| **Quiz** | `createdBy` | User._id | User | Yes |
| **Question** | `quizId` | Quiz._id | Quiz | Yes |
| **Question** | `generationJobId` | GenerationJob._id | GenerationJob | No |
| **Question** | `oralGenerationJobId` | OralGenerationJob._id | OralGenerationJob | No |
| **Question** | `duplicateOf` | Question._id | Question (self) | No |
| **Question** | `sourceTimestamp.lessonId` | Lesson._id | Lesson | No |
| **Attempt** | `quizId` | Quiz._id | Quiz | Yes |
| **Attempt** | `studentId` | User._id | User | Yes |
| **Attempt** | `answers[].questionId` | Question._id | Question | Yes |
| **Attempt** | `adaptive.questionOrder[]` | Question._id | Question | No |
| **Attempt** | `adaptive.thetaHistory[].questionId` | Question._id | Question | No |
| **Attempt** | `bat.blocks[].questionIds[]` | Question._id | Question | No |
| **Attempt** | `bat.blocks[].answers[].questionId` | Question._id | Question | No |
| **StudentResponse** | `userId` | User._id | User | Yes |
| **StudentResponse** | `assessmentId` | OralAssessment._id | OralAssessment | Yes |
| **StudentResponse** | `lessonId` | Lesson._id | Lesson | Yes |
| **Watch** | `lesson` | Lesson._id | Lesson | No |
| **Watch** | `module` | Module._id | Module | No |
| **Watch** | `user` | User._id | User | No |
| **Testimonial** | `courseId` | Course._id | Course | No |
| **Testimonial** | `user` | User._id | User | No |
| **Report** | `course` | Course._id | Course | No |
| **Report** | `student` | User._id | User | No |
| **Report** | `quizAssessment` | Assessment._id | Assessment | No |
| **Report** | `passedQuizIds[]` | Quiz._id | Quiz | No |
| **LectureDocument** | `lessonId` | Lesson._id | Lesson | Yes |
| **LectureDocument** | `courseId` | Course._id | Course | Yes |
| **LectureDocument** | `uploadedBy` | User._id | User | Yes |
| **LectureDocument** | `videoTranscriptId` | VideoTranscript._id | VideoTranscript | No |
| **LectureDocument** | `embeddingJobId` | IndexingJob._id | IndexingJob | No |
| **VideoTranscript** | `lessonId` | Lesson._id | Lesson | Yes |
| **VideoTranscript** | `courseId` | Course._id | Course | Yes |
| **PipelineJob** | `lessonId` | Lesson._id | Lesson | Yes |
| **PipelineJob** | `courseId` | Course._id | Course | Yes |
| **PipelineJob** | `triggeredBy` | User._id | User | Yes |
| **PipelineJob** | `extractionJobId` | LectureDocument._id | LectureDocument | No |
| **PipelineJob** | `alignmentJobId` | AlignmentJob._id | AlignmentJob | No |
| **PipelineJob** | `indexingJobId` | IndexingJob._id | IndexingJob | No |
| **PipelineJob** | `mcqGenerationJobId` | GenerationJob._id | GenerationJob | No |
| **PipelineJob** | `oralGenerationJobId` | OralGenerationJob._id | OralGenerationJob | No |
| **AlignmentJob** | `lessonId` | Lesson._id | Lesson | Yes |
| **AlignmentJob** | `courseId` | Course._id | Course | Yes |
| **AlignmentJob** | `lectureDocumentId` | LectureDocument._id | LectureDocument | Yes |
| **AlignmentJob** | `videoTranscriptId` | VideoTranscript._id | VideoTranscript | No |
| **AlignmentJob** | `pipelineJobId` | PipelineJob._id | PipelineJob | No |
| **AlignmentJob** | `triggeredBy` | User._id | User | Yes |
| **IndexingJob** | `lectureDocumentId` | LectureDocument._id | LectureDocument | Yes |
| **IndexingJob** | `courseId` | Course._id | Course | Yes |
| **IndexingJob** | `lessonId` | Lesson._id | Lesson | Yes |
| **IndexingJob** | `pipelineJobId` | PipelineJob._id | PipelineJob | No |
| **GenerationJob** | `lessonId` | Lesson._id | Lesson | Yes |
| **GenerationJob** | `courseId` | Course._id | Course | Yes |
| **GenerationJob** | `quizId` | Quiz._id | Quiz | Yes |
| **GenerationJob** | `lectureDocumentId` | LectureDocument._id | LectureDocument | Yes |
| **GenerationJob** | `triggeredBy` | User._id | User | Yes |
| **GenerationJob** | `pipelineJobId` | PipelineJob._id | PipelineJob | No |
| **OralGenerationJob** | `lessonId` | Lesson._id | Lesson | Yes |
| **OralGenerationJob** | `courseId` | Course._id | Course | Yes |
| **OralGenerationJob** | `quizId` | Quiz._id | Quiz | Yes |
| **OralGenerationJob** | `lectureDocumentId` | LectureDocument._id | LectureDocument | Yes |
| **OralGenerationJob** | `pipelineJobId` | PipelineJob._id | PipelineJob | No |
| **OralGenerationJob** | `triggeredBy` | User._id | User | Yes |
| **TutorInteraction** | `userId` | User._id | User | Yes |
| **TutorInteraction** | `lessonId` | Lesson._id | Lesson | Yes |
| **TutorInteraction** | `courseId` | Course._id | Course | Yes |
| **OralAssessment** | `lessonId` | Lesson._id | Lesson | Yes |
| **OralAssessment** | `courseId` | Course._id | Course | Yes |
| **OralAssessment** | `createdBy` | User._id | User | Yes |
| **ReciteBackAttempt** | `interactionId` | TutorInteraction._id | TutorInteraction | Yes |
| **ReciteBackAttempt** | `userId` | User._id | User | Yes |
| **ReciteBackAttempt** | `lessonId` | Lesson._id | Lesson | Yes |
| **WeaknessProfile** | `studentId` | User._id | User | Yes |
| **WeaknessProfile** | `courseId` | Course._id | Course | Yes |
| **ConceptGap** | `userId` | User._id | User | Yes |
| **ConceptGap** | `lessonId` | Lesson._id | Lesson | Yes |
| **ConceptGap** | `courseId` | Course._id | Course | Yes |
| **RemediationSession** | `studentId` | User._id | User | Yes |
| **RemediationSession** | `weaknessProfileId` | WeaknessProfile._id | WeaknessProfile | Yes |
| **RemediationSession** | `lessonId` | Lesson._id | Lesson | Yes |

### 4.3 Unique Keys

| Collection | Unique Field(s) | Type | Sparse |
|------------|-----------------|------|--------|
| **User** | `email` | Single field | No |
| **Enrollment** | `(student, course)` | Compound | No |
| **Report** | `(course, student)` | Compound | No |
| **LectureDocument** | `lessonId` | Single field | No |
| **VideoTranscript** | `lessonId` | Single field | No |
| **OralAssessment** | `(lessonId, triggerTimestamp)` | Compound | No |
| **WeaknessProfile** | `(studentId, courseId)` | Compound | No |
| **Payment** | `referenceId` | Single field | Yes (sparse) |
| **Attempt** | `(quizId, studentId)` | Compound | Partial (`status: "in_progress"`) |

### 4.4 Check Constraints

Mongoose enforces these via schema validators (equivalent to SQL CHECK constraints):

| Collection | Field | Constraint | Rule |
|------------|-------|------------|------|
| **User** | `firstName` | maxlength | ≤ 50 characters |
| **User** | `lastName` | maxlength | ≤ 50 characters |
| **User** | `email` | match (regex) | `/^\S+@\S+\.\S+$/` |
| **User** | `role` | enum | `admin`, `instructor`, `student` |
| **User** | `status` | enum | `active`, `inactive`, `suspended` |
| **Enrollment** | `status` | enum | `not-started`, `in-progress`, `completed` |
| **Enrollment** | `method` | enum | `stripe`, `free`, `manual`, `mockpay` |
| **Payment** | `status` | enum | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded`, `canceled` |
| **Payment** | `provider` | enum | `stripe`, `mockpay` |
| **Quiz** | `passPercent` | min/max | 0 ≤ value ≤ 100 |
| **Quiz** | `timeLimitSec` | min | ≥ 1 |
| **Quiz** | `maxAttempts` | min | ≥ 1 |
| **Quiz** | `showAnswersPolicy` | enum | `never`, `after_submit`, `after_pass` |
| **Quiz** | `adaptiveConfig.precisionThreshold` | min/max | 0.1 ≤ value ≤ 1.0 |
| **Quiz** | `adaptiveConfig.minQuestions` | min | ≥ 1 |
| **Quiz** | `adaptiveConfig.maxQuestions` | min | ≥ 5 |
| **Quiz** | `batConfig.blockSize` | min/max | 2 ≤ value ≤ 5 |
| **Quiz** | `batConfig.totalBlocks` | min/max | 3 ≤ value ≤ 10 |
| **Question** | `type` | enum | `single`, `multi`, `true_false`, `oral` |
| **Question** | `options` | custom validator | ≥ 2 options (if type ≠ `oral`) |
| **Question** | `correctOptionIds` | custom validator | ≥ 1 correct (if type ≠ `oral`) |
| **Question** | `points` | min | ≥ 0 |
| **Question** | `irt.a` | min | ≥ 0.01 |
| **Question** | `irt.c` | min/max | 0 ≤ value ≤ 1 |
| **Question** | `generatedBy` | enum | `manual`, `gemini` |
| **Question** | `bloomLevel` | enum | `remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`, `""` |
| **Question** | `cognitiveLevel` | enum | `application`, `analysis`, `synthesis`, `evaluation`, `""` |
| **Question** | `conceptTags[]` | custom validator | Non-empty strings ≤ 100 chars |
| **Attempt** | `status` | enum | `in_progress`, `submitted`, `expired` |
| **Attempt** | `adaptive.terminationReason` | enum | `precision_achieved`, `max_reached`, `pool_exhausted`, `user_submitted` |
| **Attempt** | `bat.blocks[].difficultyBand` | enum | `easy`, `medium`, `hard` |
| **Attempt** | `bat.terminationReason` | enum | `blocks_completed`, `user_abandoned` |
| **Attempt** | `answers[].gradingStatus` | enum | `pending`, `evaluating`, `completed`, `failed` |
| **StudentResponse** | `similarityScore` | min/max | 0 ≤ value ≤ 1 |
| **StudentResponse** | `inputMethod` | enum | `voice`, `text` |
| **LectureDocument** | `fileSize` | max | ≤ 52,428,800 (50 MB) |
| **LectureDocument** | `originalFilename` | maxlength | ≤ 255 characters |
| **LectureDocument** | `status` | enum | `uploading`, `processing`, `ready`, `failed` |
| **LectureDocument** | `embeddingStatus` | enum | `pending`, `processing`, `indexed`, `failed` |
| **VideoTranscript** | `alignmentStatus` | enum | `pending`, `processing`, `completed`, `failed` |
| **VideoTranscript** | `alignments[].confidence` | min/max | 0 ≤ value ≤ 100 |
| **VideoTranscript** | `alignments[].status` | enum | `aligned`, `not-spoken`, `unable-to-align` |
| **PipelineJob** | `status` | enum | `pending`, `extracting`, `aligning`, `indexing`, `generating`, `completed`, `failed`, `cancelled` |
| **PipelineJob** | `stages.*.status` | enum | `pending`, `processing`, `completed`, `failed`, `skipped` |
| **AlignmentJob** | `status` | enum | `queued`, `processing`, `completed`, `failed` |
| **AlignmentJob** | `phase` | enum | `audio-extraction`, `transcription`, `alignment`, `saving` |
| **AlignmentJob** | `progress` | min/max | 0 ≤ value ≤ 100 |
| **AlignmentJob** | `retryCount` | max | ≤ 1 |
| **IndexingJob** | `status` | enum | `pending`, `processing`, `completed`, `failed`, `cancelled` |
| **GenerationJob** | `status` | enum | `pending`, `processing`, `completed`, `failed`, `cancelled` |
| **OralGenerationJob** | `status` | enum | `pending`, `processing`, `completed`, `failed`, `cancelled` |
| **OralAssessment** | `status` | enum | `pending`, `approved`, `rejected` |
| **ReciteBackAttempt** | `similarityScore` | min/max | 0 ≤ value ≤ 1 |
| **ReciteBackAttempt** | `attemptNumber` | min | ≥ 1 |
| **ReciteBackAttempt** | `inputMethod` | enum | `voice`, `text` |
| **TutorInteraction** | `question` | maxlength | ≤ 1000 characters |
| **TutorInteraction** | `response` | maxlength | ≤ 10000 characters |
| **TutorInteraction** | `questionInputMethod` | enum | `voice`, `text` |
| **TutorInteraction** | `satisfactionRating` | min/max | 1 ≤ value ≤ 5 |
| **WeaknessProfile** | `items[].conceptTag` | maxlength | ≤ 200 characters |
| **WeaknessProfile** | `items[].failureCount` | min | ≥ 1 |
| **WeaknessProfile** | `items[].status` | enum | `active`, `resolved` |
| **WeaknessProfile** | `items[].sources[].type` | enum | `bat`, `oral` |
| **ConceptGap** | `concept` | maxlength | ≤ 500 characters |
| **ConceptGap** | `source` | enum | `assessment`, `recite_back` |
| **ConceptGap** | `failureCount` | min | ≥ 1 |
| **Lesson** | `videoProvider` | enum | `local`, `external` |

### 4.5 Indexes

#### Single-Field Indexes

| Collection | Field | Type | Sparse |
|------------|-------|------|--------|
| User | `email` | Unique | No |
| Enrollment | `course` | Regular | No |
| Enrollment | `student` | Regular | No |
| Payment | `user` | Regular | No |
| Payment | `course` | Regular | No |
| Payment | `sessionId` | Regular | Yes |
| Payment | `paymentIntentId` | Regular | No |
| Payment | `customerId` | Regular | No |
| Payment | `referenceId` | Unique | Yes |
| Payment | `status` | Regular | No |
| Payment | `provider` | Regular | No |
| Quiz | `courseId` | Regular | No |
| Quiz | `published` | Regular | No |
| Question | `quizId` | Regular | No |
| Question | `isDraft` | Regular | No |
| Question | `generationJobId` | Regular | No |
| Question | `oralGenerationJobId` | Regular | No |
| Attempt | `quizId` | Regular | No |
| Attempt | `studentId` | Regular | No |
| Attempt | `status` | Regular | No |
| StudentResponse | `userId` | Regular | No |
| StudentResponse | `assessmentId` | Regular | No |
| StudentResponse | `lessonId` | Regular | No |
| StudentResponse | `createdAt` | Regular | No |
| LectureDocument | `lessonId` | Unique | No |
| LectureDocument | `courseId` | Regular | No |
| LectureDocument | `status` | Regular | No |
| VideoTranscript | `lessonId` | Unique | No |
| VideoTranscript | `courseId` | Regular | No |
| VideoTranscript | `alignmentStatus` | Regular | No |
| PipelineJob | `lessonId` | Regular | No |
| PipelineJob | `courseId` | Regular | No |
| PipelineJob | `status` | Regular | No |
| AlignmentJob | `lessonId` | Regular | No |
| AlignmentJob | `courseId` | Regular | No |
| AlignmentJob | `status` | Regular | No |
| AlignmentJob | `scheduledFor` | Regular | No |
| IndexingJob | `lectureDocumentId` | Regular | No |
| IndexingJob | `courseId` | Regular | No |
| IndexingJob | `status` | Regular | No |
| GenerationJob | `lessonId` | Regular | No |
| GenerationJob | `courseId` | Regular | No |
| GenerationJob | `triggeredBy` | Regular | No |
| GenerationJob | `status` | Regular | No |
| OralGenerationJob | `lessonId` | Regular | No |
| OralGenerationJob | `courseId` | Regular | No |
| OralGenerationJob | `status` | Regular | No |
| TutorInteraction | `userId` | Regular | No |
| TutorInteraction | `lessonId` | Regular | No |
| TutorInteraction | `courseId` | Regular | No |
| TutorInteraction | `createdAt` | Regular | No |
| OralAssessment | `lessonId` | Regular | No |
| OralAssessment | `courseId` | Regular | No |
| ReciteBackAttempt | `interactionId` | Regular | No |
| ReciteBackAttempt | `userId` | Regular | No |
| ReciteBackAttempt | `lessonId` | Regular | No |
| WeaknessProfile | `studentId` | Regular | No |
| WeaknessProfile | `courseId` | Regular | No |
| ConceptGap | `userId` | Regular | No |
| ConceptGap | `lessonId` | Regular | No |
| ConceptGap | `courseId` | Regular | No |
| ConceptGap | `concept` | Text | No |
| RemediationSession | `studentId` | Regular | No |
| Course | `deletedAt` | Regular | No |

#### Compound Indexes

| Collection | Fields | Type | Notes |
|------------|--------|------|-------|
| Enrollment | `{student, course}` | Unique | One enrollment per student per course |
| Enrollment | `{course, enrollment_date: -1}` | Regular | Course enrollment listing |
| Enrollment | `{student, enrollment_date: -1}` | Regular | Student enrollment history |
| Payment | `{user, course}` | Regular | User-course payment lookup |
| Payment | `{status, createdAt: -1}` | Regular | Status-based queries |
| Payment | `{provider, referenceId}` | Regular (sparse) | Provider-specific lookup |
| Payment | `{provider, sessionId}` | Regular (sparse) | Provider-specific lookup |
| Quiz | `{courseId, published}` | Regular | Published quizzes in course |
| Quiz | `{courseId, lessonId}` | Regular | Quizzes for a lesson |
| Quiz | `{lessonId}` | Regular | Lesson quiz lookup |
| Quiz | `{createdBy}` | Regular | Instructor's quizzes |
| Question | `{quizId, order}` | Regular | Ordered questions |
| Question | `{conceptTags}` | Regular | Tag-based lookups |
| Attempt | `{quizId, studentId, submittedAt: -1}` | Regular | Student attempt history |
| Attempt | `{studentId, submittedAt: -1}` | Regular | Student's all attempts |
| Attempt | `{quizId, studentId, "adaptive.activeDeviceId"}` | Regular (sparse) | Concurrent session |
| Attempt | `{quizId, studentId, "bat.activeSessionId"}` | Regular (sparse) | Concurrent session |
| Attempt | `{quizId, studentId}` | Partial unique | `status: "in_progress"` only |
| StudentResponse | `{userId, lessonId}` | Regular | Student analytics |
| Watch | `{user, module, state}` | Regular | Module watch status |
| Watch | `{user, lesson}` | Regular | Lesson watch check |
| Watch | `{module, state}` | Regular | Module completion query |
| Report | `{course, student}` | Unique | One report per enrollment |
| AlignmentJob | `{status, scheduledFor}` | Regular | Queue processing |
| IndexingJob | `{status, createdAt}` | Regular | Queue polling |
| GenerationJob | `{status, createdAt}` | Regular | Queue polling |
| GenerationJob | `{courseId, status}` | Regular | Course generation status |
| OralGenerationJob | `{status, createdAt}` | Regular | Queue polling |
| OralGenerationJob | `{pipelineJobId}` | Regular | Pipeline lookup |
| PipelineJob | `{status, createdAt}` | Regular | Active pipeline queries |
| PipelineJob | `{lessonId, status}` | Regular | Lesson pipeline status |
| PipelineJob | `{courseId, createdAt: -1}` | Regular | Course pipeline history |
| OralAssessment | `{lessonId, triggerTimestamp}` | Unique | One assessment per timestamp |
| TutorInteraction | `{userId, lessonId, createdAt: -1}` | Regular | User activity feed |
| TutorInteraction | `{lessonId, createdAt: -1}` | Regular | Lesson activity |
| ReciteBackAttempt | `{interactionId, attemptNumber}` | Regular | Attempt sequence |
| ReciteBackAttempt | `{userId, lessonId}` | Regular | User history |
| WeaknessProfile | `{studentId, courseId}` | Unique | One profile per enrollment |
| WeaknessProfile | `{courseId, "items.status"}` | Regular | Course weakness overview |
| WeaknessProfile | `{"items.normalizedTag", courseId}` | Regular | Tag-based lookup |
| ConceptGap | `{userId, lessonId}` | Regular | User's lesson gaps |
| ConceptGap | `{userId, courseId, flaggedForReview}` | Regular | Unresolved gaps |
| RemediationSession | `{studentId, conceptTag}` | Regular | Student's remediation |
| RemediationSession | `{weaknessProfileId, weaknessItemId}` | Regular | Profile item sessions |

---

## 5. Entity Descriptions

| Entity | Description | Cardinality Notes |
|--------|-------------|-------------------|
| **User** | Represents all system actors: students, instructors, and admins. Central entity referenced by most other collections. | One user can have many enrollments, courses (as instructor), attempts, interactions, etc. |
| **Course** | A complete course with metadata, pricing, and content hierarchy. Soft-deletable. | One course has many modules, each module has many lessons. |
| **Module** | A logical grouping of lessons within a course. Ordered. | Belongs to exactly one course. Contains ordered lesson references. |
| **Lesson** | A single learning unit with video and optional lecture document. | Belongs to a module (via Module.lessonIds). May have one LectureDocument and one VideoTranscript. |
| **Category** | Course classification for catalog browsing. | One category can have many courses. |
| **Enrollment** | Links a student to a course with progress tracking. | One per student per course (unique constraint). |
| **Payment** | Records a financial transaction for course enrollment. | One payment linked to one enrollment. |
| **Quiz** | A quiz/exam attached to a course or lesson with multiple modes (fixed, adaptive, BAT). | One quiz has many questions and many attempts. |
| **Question** | A quiz question with IRT parameters for adaptive testing. Supports MCQ and oral types. | Belongs to exactly one quiz. |
| **Attempt** | A student's quiz attempt with embedded answers and adaptive/BAT state. | Belongs to one quiz and one student. At most one in-progress per (quiz, student). |
| **StudentResponse** | A student's response to an oral assessment question with evaluation results. | Belongs to one user, one assessment, one lesson. |
| **Watch** | Tracks a student's video watching progress for a lesson. | One per user per lesson. |
| **Testimonial** | A student's review/rating for a course. | Belongs to one user and one course. |
| **Assessment** | Legacy assessment data (minimal schema). | Standalone entity. |
| **Report** | Student progress report for a course, tracking completed lessons, modules, and quizzes. | One per student per course (unique constraint). |
| **LectureDocument** | An uploaded DOCX file with extracted text and embedding status. | One per lesson (unique constraint). |
| **VideoTranscript** | Transcribed video audio with word-level timing and text-video alignments. | One per lesson (unique constraint). |
| **PipelineJob** | Orchestrates the multi-stage content processing pipeline. | References child jobs (alignment, indexing, generation). |
| **AlignmentJob** | Tracks text-to-video alignment processing. | Belongs to one lesson and optionally one pipeline. |
| **IndexingJob** | Tracks semantic embedding/indexing into ChromaDB. | Belongs to one lecture document and optionally one pipeline. |
| **GenerationJob** | Tracks MCQ auto-generation from lecture content. | Belongs to one lesson, quiz, and lecture document. |
| **OralGenerationJob** | Tracks oral question auto-generation from lecture content. | Same structure as GenerationJob but for oral questions. |
| **TutorInteraction** | Records a RAG tutor Q&A exchange between student and AI. | Belongs to one user, lesson, and course. May have recite-back attempts. |
| **OralAssessment** | An oral checkpoint question triggered at a specific video timestamp. | One per (lesson, timestamp) — unique constraint. |
| **ReciteBackAttempt** | A student's attempt to recite back a tutor explanation. | Belongs to one TutorInteraction. |
| **WeaknessProfile** | Aggregated weakness analysis for a student in a course. Contains embedded weakness items. | One per (student, course) — unique constraint. |
| **ConceptGap** | A specific concept gap identified from assessment or recite-back failures. | Belongs to one user, lesson, and course. |
| **RemediationSession** | Tracks a student watching a recommended video segment to address a weakness. | Belongs to one student and one weakness profile. |

---

## 6. Relationship Descriptions

### One-to-Many Relationships

| Parent | Child | Relationship | Cardinality |
|--------|-------|-------------|-------------|
| Category → Course | `Course.category` | A category contains many courses | 1:N |
| User → Course | `Course.instructor` | An instructor creates many courses | 1:N |
| Course → Module | `Module.course` + `Course.modules[]` | A course contains ordered modules | 1:N |
| Module → Lesson | `Module.lessonIds[]` | A module contains ordered lessons | 1:N |
| Course → Quiz | `Quiz.courseId` | A course has many quizzes | 1:N |
| Lesson → Quiz | `Quiz.lessonId` | A lesson may have quizzes | 1:N |
| Quiz → Question | `Question.quizId` | A quiz has many questions | 1:N |
| Quiz → Attempt | `Attempt.quizId` | A quiz has many attempts | 1:N |
| User → Attempt | `Attempt.studentId` | A student has many attempts | 1:N |
| User → Enrollment | `Enrollment.student` | A student has many enrollments | 1:N |
| Course → Enrollment | `Enrollment.course` | A course has many enrollments | 1:N |
| User → Payment | `Payment.user` | A user has many payments | 1:N |
| Course → Payment | `Payment.course` | A course has many payments | 1:N |
| User → Watch | `Watch.user` | A user has many watch records | 1:N |
| User → TutorInteraction | `TutorInteraction.userId` | A user has many tutor interactions | 1:N |
| TutorInteraction → ReciteBackAttempt | `ReciteBackAttempt.interactionId` | An interaction has many recite-back attempts | 1:N |
| OralAssessment → StudentResponse | `StudentResponse.assessmentId` | An assessment has many responses | 1:N |
| Lesson → LectureDocument | `LectureDocument.lessonId` | A lesson has one lecture document | 1:1 |
| Lesson → VideoTranscript | `VideoTranscript.lessonId` | A lesson has one video transcript | 1:1 |
| User → WeaknessProfile | `WeaknessProfile.studentId` | A student has weakness profiles (per course) | 1:N |
| WeaknessProfile → RemediationSession | `RemediationSession.weaknessProfileId` | A profile has many remediation sessions | 1:N |
| User → ConceptGap | `ConceptGap.userId` | A user has many concept gaps | 1:N |

### One-to-One Relationships

| Entity A | Entity B | Linked By | Constraint |
|----------|----------|-----------|------------|
| Lesson | LectureDocument | `LectureDocument.lessonId` | Unique on `lessonId` |
| Lesson | VideoTranscript | `VideoTranscript.lessonId` | Unique on `lessonId` |
| Enrollment | Payment | `Enrollment.payment` | Optional FK |
| Student+Course | WeaknessProfile | `WeaknessProfile.(studentId, courseId)` | Compound unique |
| Student+Course | Report | `Report.(course, student)` | Compound unique |

### Many-to-Many Relationships (via embedded arrays)

| Entity A | Entity B | Join Mechanism |
|----------|----------|----------------|
| Course | Module | `Course.modules[]` (embedded ObjectId array) |
| Module | Lesson | `Module.lessonIds[]` (embedded ObjectId array) |
| Course | Testimonial | `Course.testimonials[]` (embedded ObjectId array) |
| Report | Quiz | `Report.passedQuizIds[]` (embedded ObjectId array) |
| Attempt | Question | `Attempt.adaptive.questionOrder[]` and `Attempt.answers[].questionId` |

### Self-Referential Relationships

| Entity | Field | Description |
|--------|-------|-------------|
| Question | `duplicateOf` | References another Question that this one is a potential duplicate of |

### Pipeline Job Hierarchy (Parent-Child)

```
PipelineJob (parent orchestrator)
├── extractionJobId    → LectureDocument
├── alignmentJobId     → AlignmentJob
├── indexingJobId      → IndexingJob
├── mcqGenerationJobId → GenerationJob
└── oralGenerationJobId→ OralGenerationJob
```

Each child job references back to the parent via its `pipelineJobId` field, enabling bidirectional traversal.

---

> **Note:** MongoDB does not enforce foreign key constraints at the database level. Referential integrity is maintained at the application layer through Mongoose `ref` declarations (enabling `.populate()`) and validation logic in the service layer. The unique and compound indexes listed above are enforced by MongoDB.
