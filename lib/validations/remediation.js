import { z } from "zod";

export const weaknessItemSchema = z.object({
  conceptTag: z.string().min(1).max(200),
  priorityScore: z.number().min(0).max(100),
  failureCount: z.number().int().min(1),
  status: z.enum(["active", "resolved"]),
  viewedAt: z.date().nullable(),
  resolvedAt: z.date().nullable(),
  videoSegment: z
    .object({
      lessonId: z.string(),
      videoId: z.string(),
      startTimestamp: z.number().min(0),
      endTimestamp: z.number().min(0),
    })
    .nullable(),
});

export const getWeaknessProfileSchema = z.object({
  courseId: z.string().min(1),
  status: z.enum(["active", "resolved", "all"]).default("active"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const triggerProfileAggregationSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1).optional(),
});

export const markViewedSchema = z.object({
  weaknessItemId: z.string().min(1),
});

export const startRemediationSessionSchema = z.object({
  weaknessItemId: z.string().min(1),
  lessonId: z.string().min(1),
  startTimestamp: z.number().min(0),
});

export const endRemediationSessionSchema = z.object({
  sessionId: z.string().min(1),
  watchDuration: z.number().min(0),
  completedSegment: z.boolean(),
});

export const aggregateClassWeaknessesSchema = z.object({
  courseId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
