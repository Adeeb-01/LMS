import mongoose from "mongoose";
import { Quiz } from "@/model/quizv2-model";
import { Attempt } from "@/model/attemptv2-model";
import { StudentResponse } from "@/model/student-response.model";
import { OralAssessment } from "@/model/oral-assessment.model";
import { calculatePriorityScore } from "@/lib/remediation/priority-scorer";

/**
 * @param {string} tag
 * @returns {string}
 */
export function normalizeConceptTag(tag) {
  if (typeof tag !== "string") return "";
  return tag.trim().toLowerCase();
}

/**
 * @param {object} row
 * @param {"bat"|"oral"} type
 * @param {import("mongoose").Types.ObjectId} sourceId
 * @param {Date} failedAt
 */
function addSourceUnique(row, type, sourceId, failedAt) {
  const sid = sourceId.toString();
  const exists = row.sources.some(
    (s) => s.type === type && s.sourceId.toString() === sid
  );
  if (!exists) {
    row.sources.push({
      type,
      sourceId,
      failedAt: failedAt instanceof Date ? failedAt : new Date(failedAt),
    });
  }
}

/**
 * Merge raw failure events into per–concept-tag rows (for tests and internal use).
 * @param {Array<{ conceptTag: string, normalizedTag: string, sourceType: "bat"|"oral", sourceId: import("mongoose").Types.ObjectId, failedAt: Date }>} events
 * @returns {Array<{ conceptTag: string, normalizedTag: string, sources: object[], failureCount: number, priorityScore: number, lastFailedAt: Date }>}
 */
export function mergeWeaknessEvents(events) {
  /** @type {Map<string, object>} */
  const map = new Map();

  for (const ev of events) {
    const key = ev.normalizedTag;
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        conceptTag: ev.conceptTag,
        normalizedTag: key,
        sources: [],
      });
    }
    const row = map.get(key);
    if (ev.conceptTag && ev.conceptTag.length > row.conceptTag.length) {
      row.conceptTag = ev.conceptTag;
    }
    addSourceUnique(row, ev.sourceType, ev.sourceId, ev.failedAt);
  }

  const merged = [];
  for (const row of map.values()) {
    const priorityScore = calculatePriorityScore(row);
    const lastFailedAt = new Date(
      Math.max(...row.sources.map((s) => new Date(s.failedAt).getTime()))
    );
    merged.push({
      ...row,
      failureCount: row.sources.length,
      priorityScore,
      lastFailedAt,
    });
  }

  merged.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return b.lastFailedAt.getTime() - a.lastFailedAt.getTime();
  });

  return merged;
}

/**
 * @param {string} studentId
 * @param {string} courseId
 * @returns {Promise<{ items: object[], batAttemptCount: number, oralFailedResponseCount: number, oralResponseTotal: number }>}
 */
export async function aggregateWeaknessesForStudent(studentId, courseId) {
  if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
    return { items: [], batAttemptCount: 0, oralFailedResponseCount: 0, oralResponseTotal: 0 };
  }

  const cid = new mongoose.Types.ObjectId(courseId);
  const sid = new mongoose.Types.ObjectId(studentId);

  const batQuizzes = await Quiz.find({ courseId: cid, "batConfig.enabled": true })
    .select("_id")
    .lean();
  const quizIds = batQuizzes.map((q) => q._id);

  const batAttempts =
    quizIds.length === 0
      ? []
      : await Attempt.find({
          studentId: sid,
          quizId: { $in: quizIds },
          status: "submitted",
          "bat.enabled": true,
        }).lean();

  /** @type {Array<{ conceptTag: string, normalizedTag: string, sourceType: "bat"|"oral", sourceId: import("mongoose").Types.ObjectId, failedAt: Date }>} */
  const events = [];

  for (const attempt of batAttempts) {
    const failedAt = attempt.submittedAt || attempt.updatedAt || new Date();
    const tags = attempt.bat?.missedConceptTags || [];
    for (const raw of tags) {
      const normalizedTag = normalizeConceptTag(raw);
      if (!normalizedTag) continue;
      events.push({
        conceptTag: raw.trim() || normalizedTag,
        normalizedTag,
        sourceType: "bat",
        sourceId: attempt._id,
        failedAt,
      });
    }
  }

  const oralAssessments = await OralAssessment.find({ courseId: cid }).select("_id").lean();
  const assessmentIds = oralAssessments.map((a) => a._id);

  const oralResponses =
    assessmentIds.length === 0
      ? []
      : await StudentResponse.find({
          userId: sid,
          assessmentId: { $in: assessmentIds },
        }).lean();

  for (const response of oralResponses) {
    if (response.passed) continue;
    const missing = response.conceptsMissing || [];
    if (missing.length === 0) continue;
    const failedAt = response.createdAt || new Date();
    for (const raw of missing) {
      const normalizedTag = normalizeConceptTag(raw);
      if (!normalizedTag) continue;
      events.push({
        conceptTag: raw.trim() || normalizedTag,
        normalizedTag,
        sourceType: "oral",
        sourceId: response._id,
        failedAt,
      });
    }
  }

  const merged = mergeWeaknessEvents(events);

  const items = merged.map((row) => ({
    conceptTag: row.conceptTag,
    normalizedTag: row.normalizedTag,
    priorityScore: row.priorityScore,
    failureCount: row.failureCount,
    sources: row.sources.map((s) => ({
      type: s.type,
      sourceId: s.sourceId,
      failedAt: s.failedAt,
    })),
    status: "active",
    viewedAt: null,
    resolvedAt: null,
    lastFailedAt: row.lastFailedAt,
    createdAt: new Date(),
  }));

  return {
    items,
    batAttemptCount: batAttempts.length,
    oralFailedResponseCount: oralResponses.filter(
      (r) => !r.passed && (r.conceptsMissing || []).length > 0
    ).length,
    oralResponseTotal: oralResponses.length,
  };
}
