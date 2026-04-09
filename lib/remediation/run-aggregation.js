import mongoose from "mongoose";
import { dbConnect } from "@/service/mongo";
import { WeaknessProfile } from "@/model/weakness-profile.model";
import { aggregateWeaknessesForStudent } from "@/lib/remediation/aggregator";
import { mergeAggregatedWithExisting } from "@/lib/remediation/profile-merge";
import { resolveTimestampForConcept } from "@/lib/remediation/timestamp-resolver";

/**
 * @param {string} courseId
 * @param {object[]} items
 */
async function ensureVideoSegments(courseId, items) {
  const out = [];
  for (const it of items) {
    if (it.videoSegment?.lessonId) {
      out.push(it);
      continue;
    }
    const resolved = await resolveTimestampForConcept(courseId, it.conceptTag);
    if (!resolved) {
      out.push(it);
      continue;
    }
    out.push({
      ...it,
      videoSegment: {
        lessonId: new mongoose.Types.ObjectId(resolved.lessonId),
        videoId: resolved.videoId,
        startTimestamp: resolved.startTimestamp,
        endTimestamp: resolved.endTimestamp,
      },
    });
  }
  return out;
}

/**
 * Recomputes and persists the student's weakness profile for a course.
 *
 * @param {string} studentId
 * @param {string} courseId
 * @param {{ resolution?: { assessmentType: "bat"|"oral", assessmentId: import("mongoose").Types.ObjectId|string } }} [options]
 * @returns {Promise<{ profile: import("mongoose").Document, aggregated: object }>}
 */
export async function runStudentWeaknessAggregation(studentId, courseId, options = {}) {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error("Invalid student or course id");
  }

  const cid = new mongoose.Types.ObjectId(courseId);
  const sid = new mongoose.Types.ObjectId(studentId);

  const existingProfile = await WeaknessProfile.findOne({
    studentId: sid,
    courseId: cid,
  }).lean();

  const aggregated = await aggregateWeaknessesForStudent(studentId, courseId);
  let mergedItems = mergeAggregatedWithExisting(aggregated.items, existingProfile, options);
  mergedItems = await ensureVideoSegments(courseId, mergedItems);

  const totalActive = mergedItems.filter((it) => it.status === "active").length;
  const totalResolved = mergedItems.filter((it) => it.status === "resolved").length;
  const averagePriority =
    totalActive === 0
      ? 0
      : mergedItems
          .filter((it) => it.status === "active")
          .reduce((acc, it) => acc + it.priorityScore, 0) / totalActive;

  const profile = await WeaknessProfile.findOneAndUpdate(
    { studentId: sid, courseId: cid },
    {
      $set: {
        items: mergedItems,
        lastAggregatedAt: new Date(),
        stats: {
          totalActive,
          totalResolved,
          averagePriority,
        },
      },
    },
    { upsert: true, new: true }
  ).exec();

  return { profile, aggregated };
}
