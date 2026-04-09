import mongoose, { Schema } from "mongoose";

const weaknessItemSchema = new Schema(
  {
    conceptTag: {
      type: String,
      required: true,
      maxlength: 200,
    },
    normalizedTag: {
      type: String,
      required: true,
      index: true,
    },
    priorityScore: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    failureCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    sources: [
      {
        type: {
          type: String,
          enum: ["bat", "oral"],
          required: true,
        },
        sourceId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        failedAt: {
          type: Date,
          required: true,
        },
      },
    ],
    videoSegment: {
      lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" },
      videoId: { type: String },
      startTimestamp: { type: Number },
      endTimestamp: { type: Number },
      resolved: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
      index: true,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      assessmentType: { type: String, enum: ["bat", "oral"] },
      assessmentId: { type: Schema.Types.ObjectId },
    },
    lastFailedAt: {
      type: Date,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const weaknessProfileSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    items: {
      type: [weaknessItemSchema],
      default: [],
    },
    lastAggregatedAt: {
      type: Date,
      default: null,
    },
    stats: {
      totalActive: { type: Number, default: 0 },
      totalResolved: { type: Number, default: 0 },
      averagePriority: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

weaknessProfileSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
weaknessProfileSchema.index({ courseId: 1, "items.status": 1 });
weaknessProfileSchema.index({ "items.normalizedTag": 1, courseId: 1 });

export const WeaknessProfile =
  mongoose.models.WeaknessProfile ?? mongoose.model("WeaknessProfile", weaknessProfileSchema);
