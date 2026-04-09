import mongoose from "mongoose";
import {
  enqueueRemediationAggregation,
  REMEDIATION_AGGREGATION_DEBOUNCE_MS,
  __clearRemediationAggregationTimersForTests,
} from "@/service/remediation-queue";
import { runStudentWeaknessAggregation } from "@/lib/remediation/run-aggregation";

jest.mock("@/lib/remediation/run-aggregation", () => ({
  runStudentWeaknessAggregation: jest.fn().mockResolvedValue({ profile: {}, aggregated: {} }),
}));

describe("remediation-queue", () => {
  const courseId = new mongoose.Types.ObjectId().toString();
  const studentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    __clearRemediationAggregationTimersForTests();
  });

  afterEach(() => {
    __clearRemediationAggregationTimersForTests();
    jest.useRealTimers();
  });

  it("debounces multiple enqueue calls into a single aggregation run", async () => {
    enqueueRemediationAggregation({ courseId, studentId });
    enqueueRemediationAggregation({ courseId, studentId });
    expect(runStudentWeaknessAggregation).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(REMEDIATION_AGGREGATION_DEBOUNCE_MS);
    expect(runStudentWeaknessAggregation).toHaveBeenCalledTimes(1);
    expect(runStudentWeaknessAggregation).toHaveBeenCalledWith(studentId, courseId, {});
  });

  it("passes resolution context to the aggregation runner", async () => {
    const assessmentId = new mongoose.Types.ObjectId();
    enqueueRemediationAggregation({
      courseId,
      studentId,
      resolution: { assessmentType: "oral", assessmentId },
    });
    await jest.advanceTimersByTimeAsync(REMEDIATION_AGGREGATION_DEBOUNCE_MS);
    expect(runStudentWeaknessAggregation).toHaveBeenCalledWith(studentId, courseId, {
      resolution: { assessmentType: "oral", assessmentId },
    });
  });
});
