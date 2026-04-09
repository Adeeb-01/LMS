"use server";

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import mongoose from "mongoose";
import { WeaknessProfile } from "@/model/weakness-profile.model";
import { RemediationSession } from "@/model/remediation-session.model";
import { runStudentWeaknessAggregation } from "@/lib/remediation/run-aggregation";
import { getLessonDeepLinkSlugs } from "@/lib/remediation/lesson-deeplink";
import {
  getWeaknessProfileSchema,
  triggerProfileAggregationSchema,
  markViewedSchema,
  startRemediationSessionSchema,
  endRemediationSessionSchema,
  aggregateClassWeaknessesSchema,
} from "@/lib/validations/remediation";
import { verifyInstructorOwnsCourse } from "@/lib/authorization";
import { Enrollment } from "@/model/enrollment-model";

/**
 * Loads the current user after ensuring MongoDB is connected.
 * @returns {Promise<{ ok: true, user: object } | { ok: false, error: { code: string, message: string } }>}
 */
export async function getRemediationActor() {
  await dbConnect();
  const user = await getLoggedInUser();
  if (!user) {
    return {
      ok: false,
      error: { code: "NOT_AUTHENTICATED", message: "Unauthorized" },
    };
  }
  return { ok: true, user };
}

/**
 * Ensures the user is enrolled in the course.
 * @param {string} courseId
 * @param {{ id: string }} user
 */
export async function assertStudentEnrolledInCourse(courseId, user) {
  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Invalid course ID" },
    };
  }

  const enrolled = await hasEnrollmentForCourse(courseId, user.id);
  if (!enrolled) {
    return {
      ok: false,
      error: { code: "NOT_ENROLLED", message: "You are not enrolled in this course" },
    };
  }
  return { ok: true };
}

/**
 * Authenticated student + enrollment gate for remediation actions scoped to a course.
 * @param {string} courseId
 */
export async function requireStudentEnrolledForRemediation(courseId) {
  const authResult = await getRemediationActor();
  if (!authResult.ok) return authResult;

  const enrollResult = await assertStudentEnrolledInCourse(courseId, authResult.user);
  if (!enrollResult.ok) return enrollResult;

  return { ok: true, user: authResult.user };
}

/**
 * @param {import("mongoose").Document | object} itemDoc
 */
function mapWeaknessItemToOutput(itemDoc) {
  const i = itemDoc.toObject ? itemDoc.toObject() : itemDoc;
  const vs = i.videoSegment;
  let videoSegment = null;
  if (vs && vs.lessonId) {
    videoSegment = {
      lessonId: vs.lessonId.toString(),
      videoId: vs.videoId || "",
      startTimestamp: typeof vs.startTimestamp === "number" ? vs.startTimestamp : 0,
      endTimestamp: typeof vs.endTimestamp === "number" ? vs.endTimestamp : 0,
    };
  }

  return {
    id: i._id.toString(),
    conceptTag: i.conceptTag,
    priorityScore: i.priorityScore,
    failureCount: i.failureCount,
    sources: (i.sources || []).map((s) => ({
      type: s.type,
      failedAt: new Date(s.failedAt).toISOString(),
    })),
    videoSegment,
    status: i.status,
    viewedAt: i.viewedAt ? new Date(i.viewedAt).toISOString() : null,
    resolvedAt: i.resolvedAt ? new Date(i.resolvedAt).toISOString() : null,
    lastFailedAt: new Date(i.lastFailedAt).toISOString(),
  };
}

/**
 * @param {string} courseId
 * @param {object[]} mappedItems Output of mapWeaknessItemToOutput
 */
async function attachReviewHrefs(courseId, mappedItems) {
  if (!mappedItems.length) return [];

  const uniqueLessonIds = [
    ...new Set(
      mappedItems
        .filter((i) => i.videoSegment?.lessonId)
        .map((i) => String(i.videoSegment.lessonId))
    ),
  ];

  const slugEntries = await Promise.all(
    uniqueLessonIds.map(async (lid) => {
      const slugs = await getLessonDeepLinkSlugs(courseId, lid);
      return [lid, slugs];
    })
  );
  const slugMap = new Map(slugEntries);

  return mappedItems.map((item) => {
    const vs = item.videoSegment;
    if (!vs?.lessonId) {
      return { ...item, reviewHref: null };
    }
    const key = String(vs.lessonId);
    const slugs = slugMap.get(key);
    if (!slugs) {
      return { ...item, reviewHref: null };
    }
    const t = Math.floor(typeof vs.startTimestamp === "number" ? vs.startTimestamp : 0);
    return {
      ...item,
      reviewHref: `/courses/${courseId}/lesson?name=${encodeURIComponent(slugs.lessonSlug)}&module=${encodeURIComponent(slugs.moduleSlug)}&t=${t}`,
    };
  });
}

/**
 * @param {{ courseId: string, status?: string, page?: number, limit?: number }} rawInput
 */
export async function getWeaknessProfile(rawInput) {
  await dbConnect();

  const parsed = getWeaknessProfileSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Invalid input" },
    };
  }

  const { courseId, status, page, limit } = parsed.data;

  const gate = await requireStudentEnrolledForRemediation(courseId);
  if (!gate.ok) {
    return {
      success: false,
      error: {
        code: gate.error.code,
        message: gate.error.message,
      },
    };
  }

  try {
    const studentId = gate.user.id;

    const { profile, aggregated } = await runStudentWeaknessAggregation(studentId, courseId);

    const allItems = (profile.items || []).map(mapWeaknessItemToOutput);
    const filtered =
      status === "all"
        ? allItems
        : allItems.filter((it) => it.status === status);

    filtered.sort((a, b) => {
      const pa = typeof a.priorityScore === "number" ? a.priorityScore : 0;
      const pb = typeof b.priorityScore === "number" ? b.priorityScore : 0;
      if (pb !== pa) return pb - pa;
      return new Date(b.lastFailedAt).getTime() - new Date(a.lastFailedAt).getTime();
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const pageItemsRaw = filtered.slice(start, start + limit);

    const resolvedItemsRaw = allItems
      .filter((it) => it.status === "resolved")
      .sort((a, b) => {
        const da = a.resolvedAt || a.lastFailedAt;
        const db = b.resolvedAt || b.lastFailedAt;
        return db.localeCompare(da);
      })
      .slice(0, 50);

    const combinedForHref = [];
    const seenIds = new Set();
    for (const it of pageItemsRaw) {
      if (!seenIds.has(it.id)) {
        seenIds.add(it.id);
        combinedForHref.push(it);
      }
    }
    for (const it of resolvedItemsRaw) {
      if (!seenIds.has(it.id)) {
        seenIds.add(it.id);
        combinedForHref.push(it);
      }
    }

    const enrichedSubset = await attachReviewHrefs(courseId, combinedForHref);
    const enrichedById = new Map(enrichedSubset.map((e) => [e.id, e]));
    const pageItems = pageItemsRaw.map((i) => enrichedById.get(i.id) ?? i);
    const resolvedItems = resolvedItemsRaw.map((i) => enrichedById.get(i.id) ?? i);

    const hasAssessmentHistory =
      aggregated.batAttemptCount > 0 || aggregated.oralResponseTotal > 0;
    const emptyReason =
      total > 0
        ? null
        : !hasAssessmentHistory
          ? "no_assessment_history"
          : "no_weaknesses";

    return {
      success: true,
      data: {
        profileId: profile._id.toString(),
        courseId,
        items: pageItems,
        resolvedItems,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
        },
        stats: {
          totalActive: profile.stats?.totalActive ?? 0,
          totalResolved: profile.stats?.totalResolved ?? 0,
          averagePriority: profile.stats?.averagePriority ?? 0,
        },
        lastAggregatedAt: profile.lastAggregatedAt
          ? profile.lastAggregatedAt.toISOString()
          : null,
        sourceSummary: {
          batAttemptCount: aggregated.batAttemptCount,
          oralFailedResponseCount: aggregated.oralFailedResponseCount,
          oralResponseTotal: aggregated.oralResponseTotal,
        },
        emptyReason,
      },
    };
  } catch (err) {
    console.error("[getWeaknessProfile]", err);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: err?.message || "Unexpected error",
      },
    };
  }
}

/**
 * Runs weakness aggregation and persists the profile (sync).
 * @param {{ courseId: string, studentId?: string }} rawInput
 */
export async function triggerProfileAggregation(rawInput) {
  await dbConnect();

  const parsed = triggerProfileAggregationSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Invalid input" },
    };
  }

  const { courseId, studentId: targetStudentIdOpt } = parsed.data;

  const authResult = await getRemediationActor();
  if (!authResult.ok) {
    return {
      success: false,
      error: { code: "NOT_AUTHENTICATED", message: "Unauthorized" },
    };
  }

  const user = authResult.user;
  let targetStudentId = user.id;

  if (targetStudentIdOpt) {
    if (user.role !== "admin") {
      return {
        success: false,
        error: { code: "NOT_AUTHORIZED", message: "Forbidden" },
      };
    }
    targetStudentId = targetStudentIdOpt;
  }

  const enrollResult = await assertStudentEnrolledInCourse(courseId, { id: targetStudentId });
  if (!enrollResult.ok) {
    return {
      success: false,
      error: {
        code: enrollResult.error.code,
        message: enrollResult.error.message,
      },
    };
  }

  try {
    const { profile } = await runStudentWeaknessAggregation(targetStudentId, courseId);

    return {
      success: true,
      data: {
        jobId: profile._id.toString(),
        status: "processing",
        estimatedCompletionMs: 0,
      },
    };
  } catch (err) {
    console.error("[triggerProfileAggregation]", err);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: err?.message || "Unexpected error",
      },
    };
  }
}

/**
 * @param {{ weaknessItemId: string }} rawInput
 */
export async function markWeaknessViewed(rawInput) {
  await dbConnect();

  const parsed = markViewedSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Invalid input" },
    };
  }

  const { weaknessItemId } = parsed.data;
  const gate = await getRemediationActor();
  if (!gate.ok) {
    return {
      success: false,
      error: { code: gate.error.code, message: gate.error.message },
    };
  }

  if (!mongoose.Types.ObjectId.isValid(weaknessItemId)) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Invalid weakness item" },
    };
  }

  const sid = new mongoose.Types.ObjectId(gate.user.id);
  const wid = new mongoose.Types.ObjectId(weaknessItemId);
  const viewedAt = new Date();

  try {
    const update = await WeaknessProfile.updateOne(
      { studentId: sid, "items._id": wid },
      { $set: { "items.$.viewedAt": viewedAt } }
    );

    if (update.matchedCount === 0) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Weakness item not found" },
      };
    }

    return {
      success: true,
      data: { viewedAt: viewedAt.toISOString() },
    };
  } catch (err) {
    console.error("[markWeaknessViewed]", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: err?.message || "Unexpected error" },
    };
  }
}

/**
 * @param {{ weaknessItemId: string, lessonId: string, startTimestamp: number }} rawInput
 */
export async function startRemediationSession(rawInput) {
  await dbConnect();

  const parsed = startRemediationSessionSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Invalid input" },
    };
  }

  const { weaknessItemId, lessonId, startTimestamp } = parsed.data;
  const gate = await getRemediationActor();
  if (!gate.ok) {
    return {
      success: false,
      error: { code: gate.error.code, message: gate.error.message },
    };
  }

  if (!mongoose.Types.ObjectId.isValid(weaknessItemId) || !mongoose.Types.ObjectId.isValid(lessonId)) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Invalid id" },
    };
  }

  const sid = new mongoose.Types.ObjectId(gate.user.id);
  const wid = new mongoose.Types.ObjectId(weaknessItemId);

  try {
    const profile = await WeaknessProfile.findOne({
      studentId: sid,
      "items._id": wid,
    }).exec();

    if (!profile) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Weakness item not found" },
      };
    }

    const courseId = profile.courseId.toString();
    const enroll = await requireStudentEnrolledForRemediation(courseId);
    if (!enroll.ok) {
      return {
        success: false,
        error: { code: enroll.error.code, message: enroll.error.message },
      };
    }

    const item = profile.items.id(wid);
    if (!item) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Weakness item not found" },
      };
    }

    const vs = item.videoSegment;
    const videoId =
      vs?.videoId && String(vs.videoId).length > 0 ? String(vs.videoId) : lessonId;

    const session = await RemediationSession.create({
      studentId: sid,
      weaknessProfileId: profile._id,
      weaknessItemId: wid,
      conceptTag: item.conceptTag,
      lessonId: new mongoose.Types.ObjectId(lessonId),
      videoId,
      startTimestamp,
      endTimestamp: typeof vs?.endTimestamp === "number" ? vs.endTimestamp : undefined,
    });

    return {
      success: true,
      data: {
        sessionId: session._id.toString(),
        conceptTag: item.conceptTag,
        startedAt: session.startedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[startRemediationSession]", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: err?.message || "Unexpected error" },
    };
  }
}

/**
 * @param {{ sessionId: string, watchDuration: number, completedSegment: boolean }} rawInput
 */
export async function endRemediationSession(rawInput) {
  await dbConnect();

  const parsed = endRemediationSessionSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Invalid input" },
    };
  }

  const { sessionId, watchDuration, completedSegment } = parsed.data;
  const gate = await getRemediationActor();
  if (!gate.ok) {
    return {
      success: false,
      error: { code: gate.error.code, message: gate.error.message },
    };
  }

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Invalid session" },
    };
  }

  const sid = new mongoose.Types.ObjectId(gate.user.id);
  const sessOid = new mongoose.Types.ObjectId(sessionId);

  try {
    const session = await RemediationSession.findOne({
      _id: sessOid,
      studentId: sid,
    }).exec();

    if (!session) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Session not found" },
      };
    }

    const endedAt = new Date();
    session.watchDuration = watchDuration;
    session.completedSegment = completedSegment;
    session.endedAt = endedAt;
    await session.save();

    return {
      success: true,
      data: {
        sessionId: session._id.toString(),
        watchDuration: session.watchDuration,
        completedSegment: session.completedSegment,
        endedAt: endedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[endRemediationSession]", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: err?.message || "Unexpected error" },
    };
  }
}

/**
 * Anonymized class-level weakness patterns (instructor or admin for the course).
 * @param {{ courseId: string, limit?: number }} rawInput
 */
export async function getClassWeaknessAggregation(rawInput) {
  await dbConnect();

  const parsed = aggregateClassWeaknessesSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Invalid input" },
    };
  }

  const { courseId, limit } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Invalid course ID" },
    };
  }

  const authResult = await getRemediationActor();
  if (!authResult.ok) {
    return {
      success: false,
      error: { code: authResult.error.code, message: authResult.error.message },
    };
  }

  const user = authResult.user;
  if (user.role !== "instructor" && user.role !== "admin") {
    return {
      success: false,
      error: { code: "NOT_AUTHORIZED", message: "Forbidden" },
    };
  }

  const canView = await verifyInstructorOwnsCourse(courseId, user.id, user);
  if (!canView) {
    return {
      success: false,
      error: { code: "NOT_AUTHORIZED", message: "Forbidden" },
    };
  }

  const courseOid = new mongoose.Types.ObjectId(courseId);
  const generatedAt = new Date().toISOString();

  try {
    const totalStudents = await Enrollment.countDocuments({ course: courseOid });
    const totalWithWeaknesses = await WeaknessProfile.countDocuments({
      courseId: courseOid,
      items: { $elemMatch: { status: "active" } },
    });

    const conceptRows = await WeaknessProfile.aggregate([
      { $match: { courseId: courseOid } },
      { $unwind: "$items" },
      { $match: { "items.status": "active" } },
      {
        $group: {
          _id: "$items.normalizedTag",
          conceptTag: { $min: "$items.conceptTag" },
          studentIds: { $addToSet: "$studentId" },
          totalOccurrences: { $sum: "$items.failureCount" },
          prioritySum: { $sum: "$items.priorityScore" },
          itemCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          conceptTag: 1,
          affectedStudents: { $size: "$studentIds" },
          totalOccurrences: 1,
          avgPriority: {
            $cond: [
              { $gt: ["$itemCount", 0] },
              { $divide: ["$prioritySum", "$itemCount"] },
              0,
            ],
          },
        },
      },
      { $sort: { affectedStudents: -1, totalOccurrences: -1, conceptTag: 1 } },
      { $limit: limit },
    ]);

    const concepts = conceptRows.map((row) => ({
      conceptTag: row.conceptTag,
      affectedStudents: row.affectedStudents,
      totalOccurrences: row.totalOccurrences,
      avgPriority: Math.round(row.avgPriority * 10) / 10,
    }));

    return {
      success: true,
      data: {
        courseId,
        totalStudents,
        totalWithWeaknesses,
        concepts,
        generatedAt,
      },
    };
  } catch (err) {
    console.error("[getClassWeaknessAggregation]", err);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: err?.message || "Unexpected error",
      },
    };
  }
}
