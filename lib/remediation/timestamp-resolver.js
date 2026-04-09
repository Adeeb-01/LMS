import mongoose from "mongoose";
import { queryEmbeddings } from "@/service/chroma";
import { generateEmbedding } from "@/lib/embeddings/gemini";
import { VideoTranscript } from "@/model/video-transcript.model";
import { normalizeConceptTag } from "@/lib/remediation/aggregator";

/**
 * Maps Chroma chunk metadata + transcript alignments to video segment bounds (seconds).
 * @param {string} lessonId
 * @param {object} metadata
 * @returns {Promise<{ startTimestamp: number, endTimestamp: number, videoId: string } | null>}
 */
async function deriveTimestampsFromMetadataAndTranscript(lessonId, metadata) {
  const meta = metadata || {};
  let start =
    typeof meta.startTimestamp === "number" && !Number.isNaN(meta.startTimestamp)
      ? meta.startTimestamp
      : null;
  let end =
    typeof meta.endTimestamp === "number" && !Number.isNaN(meta.endTimestamp)
      ? meta.endTimestamp
      : null;

  const videoId =
    typeof meta.videoId === "string" && meta.videoId.length > 0
      ? meta.videoId
      : lessonId.toString();

  if (start != null && end != null) {
    return {
      startTimestamp: Math.max(0, start),
      endTimestamp: Math.max(Math.max(0, start), end),
      videoId,
    };
  }

  const transcript = await VideoTranscript.findOne({
    lessonId: new mongoose.Types.ObjectId(lessonId),
  }).lean();

  const chunkIdx = typeof meta.chunkIndex === "number" ? meta.chunkIndex : 0;

  if (transcript?.alignments?.length) {
    const byIndex = transcript.alignments.find((a) => a.blockIndex === chunkIdx);
    const align =
      byIndex ||
      transcript.alignments.find(
        (a) => typeof a.startSeconds === "number" && a.startSeconds != null
      ) ||
      transcript.alignments[0];

    if (align && typeof align.startSeconds === "number" && align.startSeconds != null) {
      const s = align.startSeconds;
      const e =
        typeof align.endSeconds === "number" && align.endSeconds != null
          ? align.endSeconds
          : s + 120;
      return {
        startTimestamp: Math.max(0, s),
        endTimestamp: Math.max(Math.max(0, s), e),
        videoId,
      };
    }
  }

  if (transcript?.segments?.length) {
    const text = (meta.document || "").toLowerCase();
    const hit = transcript.segments.find((seg) => text && seg.text?.toLowerCase().includes(text.slice(0, 40)));
    const seg = hit || transcript.segments[0];
    if (seg) {
      return {
        startTimestamp: Math.max(0, seg.start),
        endTimestamp: Math.max(seg.start, seg.end),
        videoId,
      };
    }
  }

  const duration = typeof transcript?.duration === "number" ? transcript.duration : null;
  start = 0;
  end = duration != null ? Math.min(duration, 120) : 120;
  return { startTimestamp: start, endTimestamp: end, videoId };
}

/**
 * Finds the best matching lecture chunk in Chroma for a concept and returns video segment bounds.
 * @param {string} courseId
 * @param {string} conceptTag
 * @returns {Promise<{ lessonId: string, videoId: string, startTimestamp: number, endTimestamp: number } | null>}
 */
export async function resolveTimestampForConcept(courseId, conceptTag) {
  const normalized = normalizeConceptTag(conceptTag);
  if (!normalized || !mongoose.Types.ObjectId.isValid(courseId)) {
    return null;
  }

  let embedding;
  try {
    const text = typeof conceptTag === "string" && conceptTag.trim() ? conceptTag.trim() : normalized;
    embedding = await generateEmbedding(text);
  } catch (err) {
    console.warn("[resolveTimestampForConcept] embedding failed:", err?.message || err);
    return null;
  }

  const hits = await queryEmbeddings(embedding, courseId, 8);
  if (!hits.length) {
    return null;
  }

  const best = hits.find((h) => h.metadata?.lessonId) || hits[0];
  const lessonId = best.metadata?.lessonId;
  if (!lessonId) {
    return null;
  }

  const times = await deriveTimestampsFromMetadataAndTranscript(lessonId, {
    ...best.metadata,
    document: best.document,
  });

  if (!times) {
    return null;
  }

  return {
    lessonId: lessonId.toString(),
    videoId: times.videoId,
    startTimestamp: times.startTimestamp,
    endTimestamp: times.endTimestamp,
  };
}
