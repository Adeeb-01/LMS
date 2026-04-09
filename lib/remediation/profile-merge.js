import mongoose from "mongoose";

/**
 * Merges freshly aggregated weakness rows with an existing WeaknessProfile document.
 * - Current failures from aggregation become active (re-opening a previously resolved tag if needed).
 * - Prior active rows whose concept no longer appears in aggregation become resolved (passed).
 * - Prior resolved rows are kept for history unless the concept fails again (handled by active branch).
 *
 * @param {object[]} aggregatedItems Output shape from aggregateWeaknessesForStudent().items
 * @param {import("mongoose").Document | object | null} existingProfileDoc
 * @param {{ resolution?: { assessmentType: "bat"|"oral", assessmentId: import("mongoose").Types.ObjectId|string } }} [options]
 * @returns {object[]}
 */
export function mergeAggregatedWithExisting(aggregatedItems, existingProfileDoc, options = {}) {
  /** @type {Map<string, object>} */
  const prevByTag = new Map();
  for (const it of existingProfileDoc?.items || []) {
    if (it?.normalizedTag) prevByTag.set(it.normalizedTag, it);
  }

  const newFailureTags = new Set(
    (aggregatedItems || []).map((r) => r.normalizedTag).filter(Boolean)
  );

  const resolution = options.resolution;
  let assessmentIdOid = null;
  if (resolution?.assessmentId) {
    const aid = resolution.assessmentId;
    assessmentIdOid =
      aid instanceof mongoose.Types.ObjectId ? aid : new mongoose.Types.ObjectId(String(aid));
  }

  /** @type {object[]} */
  const out = [];

  for (const row of aggregatedItems || []) {
    const prev = prevByTag.get(row.normalizedTag);
    const itemId = prev?._id ?? new mongoose.Types.ObjectId();
    out.push({
      ...row,
      _id: itemId,
      status: "active",
      viewedAt: prev?.viewedAt ?? null,
      resolvedAt: null,
      resolvedBy: undefined,
      videoSegment:
        prev?.videoSegment && prev.videoSegment.lessonId ? prev.videoSegment : row.videoSegment,
    });
  }

  for (const prev of existingProfileDoc?.items || []) {
    const tag = prev?.normalizedTag;
    if (!tag || newFailureTags.has(tag)) continue;

    if (prev.status === "active") {
      const resolvedAt = new Date();
      out.push({
        ...prev,
        status: "resolved",
        resolvedAt,
        resolvedBy:
          resolution?.assessmentType && assessmentIdOid
            ? { assessmentType: resolution.assessmentType, assessmentId: assessmentIdOid }
            : prev.resolvedBy,
      });
    } else if (prev.status === "resolved") {
      out.push(prev);
    }
  }

  return out;
}
