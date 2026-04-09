import mongoose, { Schema } from "mongoose";

const remediationSessionSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weaknessProfileId: {
      type: Schema.Types.ObjectId,
      ref: "WeaknessProfile",
      required: true,
    },
    weaknessItemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    conceptTag: {
      type: String,
      required: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    videoId: {
      type: String,
      required: true,
    },
    startTimestamp: {
      type: Number,
      required: true,
    },
    endTimestamp: {
      type: Number,
    },
    watchDuration: {
      type: Number,
      default: 0,
    },
    completedSegment: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

remediationSessionSchema.index({ studentId: 1, conceptTag: 1 });
remediationSessionSchema.index({ weaknessProfileId: 1, weaknessItemId: 1 });

export const RemediationSession =
  mongoose.models.RemediationSession ??
  mongoose.model("RemediationSession", remediationSessionSchema);
