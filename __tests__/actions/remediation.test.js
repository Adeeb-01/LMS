import mongoose from "mongoose";
import {
  getWeaknessProfile,
  triggerProfileAggregation,
  markWeaknessViewed,
  getClassWeaknessAggregation,
} from "@/app/actions/remediation";
import { runStudentWeaknessAggregation } from "@/lib/remediation/run-aggregation";

jest.mock("@/service/mongo", () => ({
  dbConnect: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/loggedin-user", () => ({
  getLoggedInUser: jest.fn(),
}));

jest.mock("@/queries/enrollments", () => ({
  hasEnrollmentForCourse: jest.fn(),
}));

jest.mock("@/lib/remediation/run-aggregation", () => ({
  runStudentWeaknessAggregation: jest.fn(),
}));

jest.mock("@/lib/remediation/timestamp-resolver", () => ({
  resolveTimestampForConcept: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/remediation/lesson-deeplink", () => ({
  getLessonDeepLinkSlugs: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/authorization", () => ({
  verifyInstructorOwnsCourse: jest.fn(),
}));

jest.mock("@/model/enrollment-model", () => ({
  Enrollment: {
    countDocuments: jest.fn(),
  },
}));

jest.mock("@/model/weakness-profile.model", () => ({
  WeaknessProfile: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(() => ({ exec: jest.fn() })),
    updateOne: jest.fn(),
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

describe("remediation actions", () => {
  const courseId = new mongoose.Types.ObjectId().toString();
  const studentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    const { getLoggedInUser } = require("@/lib/loggedin-user");
    const { hasEnrollmentForCourse } = require("@/queries/enrollments");
    const { WeaknessProfile } = require("@/model/weakness-profile.model");
    const { verifyInstructorOwnsCourse } = require("@/lib/authorization");
    const { Enrollment } = require("@/model/enrollment-model");
    getLoggedInUser.mockResolvedValue({ id: studentId, role: "student" });
    hasEnrollmentForCourse.mockResolvedValue(true);
    WeaknessProfile.updateOne.mockResolvedValue({ matchedCount: 1 });
    verifyInstructorOwnsCourse.mockResolvedValue(false);
    Enrollment.countDocuments.mockResolvedValue(0);
    WeaknessProfile.countDocuments.mockResolvedValue(0);
    WeaknessProfile.aggregate.mockResolvedValue([]);

    const profileDoc = {
      _id: new mongoose.Types.ObjectId(),
      items: [
        {
          _id: new mongoose.Types.ObjectId(),
          conceptTag: "Trees",
          normalizedTag: "trees",
          priorityScore: 40,
          failureCount: 1,
          sources: [
            {
              type: "bat",
              sourceId: new mongoose.Types.ObjectId(),
              failedAt: new Date("2026-03-01"),
            },
          ],
          status: "active",
          viewedAt: null,
          resolvedAt: null,
          lastFailedAt: new Date("2026-03-01"),
        },
      ],
      lastAggregatedAt: new Date(),
      stats: { totalActive: 1, totalResolved: 0, averagePriority: 40 },
    };
    runStudentWeaknessAggregation.mockResolvedValue({
      profile: profileDoc,
      aggregated: {
        items: [],
        batAttemptCount: 1,
        oralFailedResponseCount: 0,
        oralResponseTotal: 0,
      },
    });
  });

  it("getWeaknessProfile returns profile and items when enrolled", async () => {
    const result = await getWeaknessProfile({ courseId, status: "active", page: 1, limit: 10 });
    expect(result.success).toBe(true);
    expect(result.data.items.length).toBe(1);
    expect(result.data.items[0].conceptTag).toBe("Trees");
    expect(result.data.pagination.total).toBe(1);
    expect(runStudentWeaknessAggregation).toHaveBeenCalledWith(studentId, courseId);
  });

  it("getWeaknessProfile fails when not enrolled", async () => {
    const { hasEnrollmentForCourse } = require("@/queries/enrollments");
    hasEnrollmentForCourse.mockResolvedValue(false);
    const result = await getWeaknessProfile({ courseId });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("NOT_ENROLLED");
  });

  it("triggerProfileAggregation succeeds for student", async () => {
    const result = await triggerProfileAggregation({ courseId });
    expect(result.success).toBe(true);
    expect(result.data.jobId).toBeDefined();
    expect(runStudentWeaknessAggregation).toHaveBeenCalledWith(studentId, courseId);
  });

  it("markWeaknessViewed sets viewedAt when item exists", async () => {
    const { WeaknessProfile } = require("@/model/weakness-profile.model");
    const wid = new mongoose.Types.ObjectId().toString();
    const result = await markWeaknessViewed({ weaknessItemId: wid });
    expect(result.success).toBe(true);
    expect(result.data.viewedAt).toBeDefined();
    expect(WeaknessProfile.updateOne).toHaveBeenCalled();
  });

  it("markWeaknessViewed fails when item not found", async () => {
    const { WeaknessProfile } = require("@/model/weakness-profile.model");
    WeaknessProfile.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
    const result = await markWeaknessViewed({ weaknessItemId: new mongoose.Types.ObjectId().toString() });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("NOT_FOUND");
  });

  it("getClassWeaknessAggregation returns anonymized concepts when instructor owns course", async () => {
    const { getLoggedInUser } = require("@/lib/loggedin-user");
    const { verifyInstructorOwnsCourse } = require("@/lib/authorization");
    const { Enrollment } = require("@/model/enrollment-model");
    const { WeaknessProfile } = require("@/model/weakness-profile.model");
    const instructorId = new mongoose.Types.ObjectId().toString();

    getLoggedInUser.mockResolvedValue({ id: instructorId, role: "instructor" });
    verifyInstructorOwnsCourse.mockResolvedValue(true);
    Enrollment.countDocuments.mockResolvedValue(10);
    WeaknessProfile.countDocuments.mockResolvedValue(3);
    WeaknessProfile.aggregate.mockResolvedValue([
      {
        conceptTag: "Recursion",
        affectedStudents: 2,
        totalOccurrences: 5,
        avgPriority: 42.5,
      },
    ]);

    const result = await getClassWeaknessAggregation({ courseId, limit: 20 });

    expect(result.success).toBe(true);
    expect(result.data.courseId).toBe(courseId);
    expect(result.data.totalStudents).toBe(10);
    expect(result.data.totalWithWeaknesses).toBe(3);
    expect(result.data.concepts).toHaveLength(1);
    expect(result.data.concepts[0]).toMatchObject({
      conceptTag: "Recursion",
      affectedStudents: 2,
      totalOccurrences: 5,
      avgPriority: 42.5,
    });
    expect(verifyInstructorOwnsCourse).toHaveBeenCalledWith(courseId, instructorId, expect.any(Object));
    expect(WeaknessProfile.aggregate).toHaveBeenCalled();
  });

  it("getClassWeaknessAggregation rejects students", async () => {
    const result = await getClassWeaknessAggregation({ courseId });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("NOT_AUTHORIZED");
  });

  it("getClassWeaknessAggregation rejects instructor without course access", async () => {
    const { getLoggedInUser } = require("@/lib/loggedin-user");
    const { verifyInstructorOwnsCourse } = require("@/lib/authorization");
    getLoggedInUser.mockResolvedValue({
      id: new mongoose.Types.ObjectId().toString(),
      role: "instructor",
    });
    verifyInstructorOwnsCourse.mockResolvedValue(false);

    const result = await getClassWeaknessAggregation({ courseId });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("NOT_AUTHORIZED");
  });
});
