# Data Access Layer — Queries & ORM (Mongoose)

How **LMS-main** connects to MongoDB, defines schemas (ORM), and isolates database access in **`queries/`** so actions and API routes stay thin.

**Related:** [DATABASE_DESIGN.md](./DATABASE_DESIGN.md), [MODULE_IMPLEMENTATION.md](./MODULE_IMPLEMENTATION.md), [ARCHITECTURE.md](./ARCHITECTURE.md) §8.

---

## Table of contents

1. [Overview](#1-overview)
2. [Layer placement](#2-layer-placement)
3. [Connection (`service/mongo.js`)](#3-connection-servicemongojs)
4. [ORM — Mongoose models (`model/`)](#4-orm--mongoose-models-model)
5. [Query modules (`queries/`)](#5-query-modules-queries)
6. [Serialization for the client](#6-serialization-for-the-client)
7. [Vector data (ChromaDB)](#7-vector-data-chromadb)
8. [Rules: queries vs direct model access](#8-rules-queries-vs-direct-model-access)
9. [Implement a new entity (step-by-step)](#9-implement-a-new-entity-step-by-step)
10. [Query patterns cookbook](#10-query-patterns-cookbook)
11. [Testing](#11-testing)
12. [Environment](#12-environment)

---

## 1. Overview

| Piece | Technology | Location |
|-------|------------|----------|
| **Primary database** | MongoDB | `MONGODB_CONNECTION_STRING` |
| **ORM** | Mongoose 8 | `model/*.js` |
| **Connection singleton** | Cached `mongoose.connect` | `service/mongo.js` → `dbConnect()` |
| **Data access API** | Async functions per domain | `queries/*.js` (14 modules) |
| **Vector store** | ChromaDB (optional) | `service/chroma.js` (not Mongoose) |

**Dependency rule:** `app/actions` and `app/api` should call **`queries/`** (or `service/` for queues/Chroma). **`lib/`** should not import Mongoose models directly (authorization in `lib/authorization.js` is a deliberate exception for lightweight ownership checks).

---

## 2. Layer placement

```text
┌─────────────────────────────────────────┐
│  app/actions/*.js   app/api/**/route.js │  Application
└──────────────────┬──────────────────────┘
                   │ await dbConnect() often here too
                   ▼
┌─────────────────────────────────────────┐
│  queries/*.js                           │  Data Access Layer
│  - find / create / populate / aggregate│
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│ model/*.js      │  │ service/chroma  │
│ (Mongoose)      │  │ (vectors)       │
└────────┬────────┘  └─────────────────┘
         ▼
    MongoDB
```

---

## 3. Connection (`service/mongo.js`)

Every server path that touches MongoDB should ensure a connection via **`dbConnect()`**.

### Responsibilities

- Load config from `lib/db/config.js` (Zod-validated `MONGODB_CONNECTION_STRING`, pool size, timeouts).
- Reuse connection via `global.mongoose` cache (important for Next.js serverless / hot reload).
- `bufferCommands: false` — fail fast if not connected.
- `getHealthStatus()` — ping for `/api/health`.

### Usage pattern

```javascript
import { dbConnect } from "@/service/mongo";

export async function myQuery() {
  await dbConnect();
  // ... Model.find / create / etc.
}
```

### Core connection logic (excerpt)

```43:47:service/mongo.js
export async function dbConnect() {
  // Check if already connected (readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
```

**Always call `await dbConnect()`** at the start of query functions (some legacy `create()` helpers omit it—prefer adding it for consistency).

---

## 4. ORM — Mongoose models (`model/`)

### File naming

- `*-model.js` or `*.model.js` (e.g. `course-model.js`, `lesson.model.js`).
- One exported model per file, usually matching collection name.

### Schema definition

```1:59:model/course-model.js
import mongoose,{Schema} from "mongoose";

const courseSchema = new Schema({
    title:{
        required: true,
        type: String
    },
    // ...
    modules:[{  type: Schema.ObjectId, ref: "Module" }],
    instructor:{  type: Schema.ObjectId, ref: "User" },
    deletedAt:{
        type: Date,
        default: null
    },
});
```

### Model registration (hot-reload safe)

Prevents **OverwriteModelError** when Next.js reloads modules:

```67:69:model/course-model.js
courseSchema.index({ deletedAt: 1 });

export const Course = mongoose.models.Course ?? mongoose.model("Course",courseSchema);
```

### Common schema techniques in this repo

| Technique | Example use |
|-----------|-------------|
| `ref` + `populate()` | Course → User (instructor), Module[] |
| `index: true` | `userId`, `lessonId` on tutor interactions |
| `select: false` | User `password` (use `.select('+password')` when needed) |
| `pre('save')` | Update `modifiedOn` on course save |
| Soft delete | `deletedAt` on courses |
| Subdocuments | Attempt `answers[]` in `attemptv2-model.js` |
| `enum` | `role`, `status`, question types |

### Model inventory (by domain)

| Domain | Models |
|--------|--------|
| Platform | `user-model`, `category-model`, `course-model`, `module.model`, `lesson.model`, `enrollment-model`, `payment-model` |
| Progress | `watch-model`, `report-model`, `testimonial-model` |
| Quiz v2 | `quizv2-model`, `questionv2-model`, `attemptv2-model`, `student-response.model` |
| AI / content | `lecture-document.model`, `video-transcript.model`, `pipeline-job.model`, `alignment-job.model`, `generation-job.model`, `indexing-job.model`, `oral-generation-job.model` |
| Tutoring | `tutor-interaction.model`, `recite-back-attempt.model`, `oral-assessment.model`, `concept-gap.model` |
| Remediation | `weakness-profile.model`, `remediation-session.model` |

Full field-level detail: [DATABASE_DESIGN.md](./DATABASE_DESIGN.md).

---

## 5. Query modules (`queries/`)

### Module map

| File | Responsibility |
|------|----------------|
| `users.js` | User by email/id, password validation |
| `courses.js` | Catalog, details, create, category filters, serialization |
| `modules.js` | Module CRUD, ordering |
| `lessons.js` | Lesson by id/slug, create |
| `enrollments.js` | Enroll, list, `hasEnrollmentForCourse` |
| `quizv2.js` | Quizzes, questions, attempts, student status map |
| `categories.js` | Category tree |
| `testimonials.js` | Reviews for courses |
| `payments.js` / `payments-admin.js` | Payment records |
| `reports.js` | Watch/completion reports |
| `alignment.js` | Transcript/alignment reads |
| `admin.js` | Dashboard stats, user/course admin lists |
| `admin-setup.js` | First admin existence check |

### Conventions

1. **Export named async functions** — one concern per function (`getCourseDetails`, `enrollForCourse`).
2. **Start with `await dbConnect()`** (recommended everywhere).
3. **Use `.lean()`** for read-only data passed to React Server Components (plain objects, faster).
4. **Use `.select()`** — fetch only needed fields (performance + security, e.g. hide password).
5. **Return client-safe shapes** via `replaceMongoIdInObject` / `replaceMongoIdInArray` or domain serializers (`serializeCourseList`).
6. **Validate ObjectIds** before `findById` when id comes from URL/params.
7. **Idempotent writes** where applicable (enrollment duplicate key `11000`).

### Example: optimized existence check

Prefer `Model.exists()` over `findOne` when you only need a boolean:

```83:104:queries/enrollments.js
export async function hasEnrollmentForCourse(courseId, studentId){
    await dbConnect();
    try {
        const courseObjectId = mongoose.Types.ObjectId.isValid(courseId)
            ? (courseId instanceof mongoose.Types.ObjectId ? courseId : new mongoose.Types.ObjectId(courseId))
            : courseId;
        const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
            ? (studentId instanceof mongoose.Types.ObjectId ? studentId : new mongoose.Types.ObjectId(studentId))
            : studentId;

        const enrollmentExists = await Enrollment.exists({
            course: courseObjectId,
            student: studentObjectId
        });

        return !!enrollmentExists;
    } catch (error) {
        throw new Error(`Failed to check enrollment: ${error.message}`);
    }
}
```

### Example: read with populate + serialize

```14:29:queries/courses.js
export async function getCourseList() {
    await dbConnect();
    const courses = await Course.find({active:true, deletedAt: null}).select(["title","subtitle","thumbnail","modules","price","category","instructor"]).populate({
        path: "category",
        model: Category
    }).populate({
        path: "instructor",
        model: User
    }).populate({
        path: "modules",
        model: Module
    }).lean();
    return serializeCourseList(courses);
}
```

### Example: composite read (quiz + questions)

```59:76:queries/quizv2.js
export async function getQuizWithQuestions(quizId) {
    await dbConnect();
    try {
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) return null;
        
        const questions = await Question.find({ quizId: new mongoose.Types.ObjectId(quizId) })
            .sort({ order: 1 })
            .lean();
        
        const quizObj = replaceMongoIdInObject(quiz);
        quizObj.questions = replaceMongoIdInArray(questions || []);
        
        return quizObj;
    } catch (error) {
        console.error("[GET_QUIZ_WITH_QUESTIONS] Error:", error);
        return null;
    }
}
```

### Example: aggregation (admin revenue)

`queries/admin.js` uses `Payment.aggregate([...])` for sums — keep complex pipelines in queries, not in UI.

### Who imports queries?

Used from **50+** pages, actions, and API routes, e.g.:

- `getLoggedInUser` → `queries/users.js`
- `app/api/lesson-watch/route.js` → `lessons`, `enrollments`, `courses`
- `app/actions/enrollment.js` → `enrollments`, `courses`
- `lib/certificate-helpers.js` → `courses`, reports via models/queries

---

## 6. Serialization for the client

Mongoose documents and `ObjectId` values **cannot** be passed directly to Client Components. The DAL normalizes outputs.

### `lib/convertData.js`

- Maps `_id` → `id`.
- `sanitizeForClient()` strips non-JSON-safe values (via `lib/utils/serialize`).

```15:27:lib/convertData.js
export const replaceMongoIdInArray = (array) => {
  if (!array || !Array.isArray(array)) return [];
  return array.filter((item) => item != null).map((item) => withId(sanitizeForClient(item)));
}

export const replaceMongoIdInObject = (obj) => {
  if (obj == null) return null;
  return withId(sanitizeForClient(obj));
}
```

### Domain serializers

- `lib/schemas/course-schema.js` — `serializeCourse`, `serializeCourseList` for catalog cards.
- Use when you need stable public shapes, not raw DB documents.

### Write returns

Some creates use `JSON.parse(JSON.stringify(doc))` to detach from Mongoose document:

```241:248:queries/courses.js
export async function create(courseData) {
    try {
        const course = await Course.create(courseData);
        return JSON.parse(JSON.stringify(course));
    } catch (error) {
        throw new Error(error);
    }
}
```

Prefer **`replaceMongoIdInObject`** after `.lean()` for consistency.

---

## 7. Vector data (ChromaDB)

Embeddings are **not** stored in MongoDB. Access goes through **`service/chroma.js`** and **`service/semantic-search.js`**.

| Store | Access layer | ORM |
|-------|--------------|-----|
| MongoDB | `queries/` + `model/` | Mongoose |
| ChromaDB | `service/chroma.js` (`queryEmbeddings`, `addEmbeddings`) | Chroma JS client |

MongoDB holds metadata (`LectureDocument.embeddingStatus`, `IndexingJob`); vectors live in Chroma collection `lms_embeddings` (configurable).

See [VECTOR_DATABASE_DESIGN.md](./VECTOR_DATABASE_DESIGN.md).

---

## 8. Rules: queries vs direct model access

| Do | Don't |
|----|--------|
| Put reusable reads/writes in `queries/` | Scatter identical `find` in many actions |
| Call `dbConnect()` before DB ops | Assume connection without check |
| Use `queries` from actions/API | Import `model` in Client Components |
| Keep auth/business rules in actions/`lib/authorization` | Encode role checks inside generic queries* |
| Use `.lean()` for RSC props | Return full Mongoose documents to UI |

\*Some queries accept options like `forStudent: true` to filter `published: true` — that's presentation-related filtering, still OK in DAL.

### Hybrid pattern in actions (allowed)

Actions may call **queries** for reads and touch **models** for one-off updates when ownership is already verified:

```32:54:app/actions/course.js
export async function updateCourse(courseId, dataToUpdate) {
    await dbConnect();
    // ... auth on Course.findById ...
    await Course.findByIdAndUpdate(courseId, { $set: allowed }, { runValidators: true });
}
```

**Guideline:** If the same update is needed in two places, move it to `queries/courses.js` as `updateCourseById`.

### Background jobs

`service/*-queue.js` and `pipeline-orchestrator.js` often import **models** directly (long-running server work). That is acceptable; still use `dbConnect()` at job start.

---

## 9. Implement a new entity (step-by-step)

Example: add a **`Bookmark`** feature (student bookmarks a lesson).

### Step 1 — Mongoose model

```javascript
// model/bookmark.model.js
import mongoose, { Schema } from "mongoose";

const bookmarkSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  createdAt: { type: Date, default: Date.now },
});

bookmarkSchema.index({ student: 1, lesson: 1 }, { unique: true });

export const Bookmark =
  mongoose.models.Bookmark ?? mongoose.model("Bookmark", bookmarkSchema);
```

### Step 2 — Query module

```javascript
// queries/bookmarks.js
import mongoose from "mongoose";
import { dbConnect } from "@/service/mongo";
import { Bookmark } from "@/model/bookmark.model";
import { replaceMongoIdInArray, replaceMongoIdInObject } from "@/lib/convertData";

export async function listBookmarksForStudent(studentId, courseId) {
  await dbConnect();
  const rows = await Bookmark.find({
    student: new mongoose.Types.ObjectId(studentId),
    course: new mongoose.Types.ObjectId(courseId),
  })
    .sort({ createdAt: -1 })
    .lean();
  return replaceMongoIdInArray(rows);
}

export async function addBookmark({ studentId, lessonId, courseId }) {
  await dbConnect();
  try {
    const doc = await Bookmark.create({
      student: studentId,
      lesson: lessonId,
      course: courseId,
    });
    return replaceMongoIdInObject(doc.toObject());
  } catch (err) {
    if (err.code === 11000) {
      return await Bookmark.findOne({ student: studentId, lesson: lessonId }).lean();
    }
    throw err;
  }
}

export async function removeBookmark(studentId, lessonId) {
  await dbConnect();
  await Bookmark.deleteOne({
    student: new mongoose.Types.ObjectId(studentId),
    lesson: new mongoose.Types.ObjectId(lessonId),
  });
}
```

### Step 3 — Validation (application layer)

```javascript
// lib/validations.js
export const bookmarkSchema = z.object({
  lessonId: z.string().min(1),
  courseId: z.string().min(1),
}).strict();
```

### Step 4 — Server Action (uses queries only)

```javascript
// app/actions/bookmarks.js
"use server";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import { addBookmark } from "@/queries/bookmarks";
import { bookmarkSchema } from "@/lib/validations";

export async function createBookmark(data) {
  const user = await getLoggedInUser();
  if (!user) return { ok: false, error: "UNAUTHORIZED" };
  const parsed = bookmarkSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "VALIDATION_ERROR" };
  const enrolled = await hasEnrollmentForCourse(parsed.data.courseId, user.id);
  if (!enrolled) return { ok: false, error: "FORBIDDEN" };
  const bookmark = await addBookmark({
    studentId: user.id,
    lessonId: parsed.data.lessonId,
    courseId: parsed.data.courseId,
  });
  return { ok: true, data: bookmark };
}
```

### Step 5 — Optional API route

Only if a client component needs `fetch` (otherwise Server Action is enough).

### Step 6 — Tests

```javascript
// tests/models/bookmark.test.js or tests/integration/bookmarks.test.js
// Use tests/setup.js + Mongo memory or test DB
```

---

## 10. Query patterns cookbook

### Find one by ID (safe)

```javascript
if (!mongoose.Types.ObjectId.isValid(id)) return null;
await dbConnect();
const doc = await Model.findById(id).lean();
return doc ? replaceMongoIdInObject(doc) : null;
```

### Paginated list

```javascript
const page = Math.max(1, pageNum);
const limit = Math.min(50, pageSize);
const skip = (page - 1) * limit;
const [items, total] = await Promise.all([
  Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  Model.countDocuments(filter),
]);
return { items: replaceMongoIdInArray(items), total, page, limit };
```

### Populate nested refs

```javascript
await Model.findById(id)
  .populate({ path: "instructor", model: User, select: "firstName lastName" })
  .lean();
```

### Atomic update

```javascript
await Model.findByIdAndUpdate(
  id,
  { $set: { status: "completed" } },
  { new: true, runValidators: true }
);
```

### Transaction (when needed)

```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  await Enrollment.create([payload], { session });
  await Payment.findByIdAndUpdate(paymentId, { status: "succeeded" }, { session });
  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction();
  throw e;
} finally {
  session.endSession();
}
```

Use transactions for payment + enrollment; most reads do not need them.

### ObjectId helper

```javascript
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}
```

---

## 11. Testing

| Location | Focus |
|----------|--------|
| `tests/models/` | Schema validation, indexes |
| `tests/integration/` | Queries + API with real/Memory Mongo |
| `tests/setup.js` | Shared DB setup |

Run: `npm test`

Integration tests often require MongoDB running locally or a test URI in env.

---

## 12. Environment

| Variable | Purpose |
|----------|---------|
| `MONGODB_CONNECTION_STRING` | MongoDB URI (required) |
| `CHROMA_HOST` | Vector DB (optional) |
| `CHROMA_COLLECTION` | Collection name (default `lms_embeddings`) |
| `DB_HEALTH_INTERVAL_MS` | Health cache TTL |

Config validation: `lib/db/config.js` (Zod).

---

## Quick reference

```text
Need to…                          → Open
────────────────────────────────────────────────────
Add a collection / fields         → model/*.js
Add a reusable DB operation       → queries/<domain>.js
Connect before query              → await dbConnect()
Expose to UI                      → app/actions or app/api (not queries/)
Shape for React props             → replaceMongoIdInObject / serializers
Vectors / semantic search         → service/chroma.js, semantic-search.js
```

---

*ORM: Mongoose 8. Query modules: 14 files under `queries/`. For ER diagrams and constraints, see [DATABASE_DESIGN.md](./DATABASE_DESIGN.md).*
