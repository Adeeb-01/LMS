import mongoose from "mongoose";
import { mergeAggregatedWithExisting } from "@/lib/remediation/profile-merge";

describe("mergeAggregatedWithExisting", () => {
  it("marks a prior active weakness resolved when it no longer appears in aggregation", () => {
    const assessmentId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const existing = {
      items: [
        {
          _id: itemId,
          normalizedTag: "trees",
          conceptTag: "Trees",
          status: "active",
          priorityScore: 40,
          failureCount: 1,
          sources: [],
          lastFailedAt: new Date("2026-03-01"),
        },
      ],
    };

    const merged = mergeAggregatedWithExisting([], existing, {
      resolution: { assessmentType: "oral", assessmentId },
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe("resolved");
    expect(merged[0].resolvedBy?.assessmentType).toBe("oral");
    expect(merged[0].resolvedBy?.assessmentId?.toString()).toBe(assessmentId.toString());
  });

  it("re-opens a resolved weakness when the concept fails again", () => {
    const existing = {
      items: [
        {
          _id: new mongoose.Types.ObjectId(),
          normalizedTag: "trees",
          conceptTag: "Trees",
          status: "resolved",
          priorityScore: 10,
          failureCount: 1,
          sources: [{ type: "bat", sourceId: new mongoose.Types.ObjectId(), failedAt: new Date() }],
          lastFailedAt: new Date("2026-02-01"),
          resolvedAt: new Date("2026-02-15"),
        },
      ],
    };

    const aggregated = [
      {
        conceptTag: "Trees",
        normalizedTag: "trees",
        priorityScore: 50,
        failureCount: 1,
        sources: [
          { type: "oral", sourceId: new mongoose.Types.ObjectId(), failedAt: new Date() },
        ],
        status: "active",
        viewedAt: null,
        resolvedAt: null,
        lastFailedAt: new Date(),
        createdAt: new Date(),
      },
    ];

    const merged = mergeAggregatedWithExisting(aggregated, existing, {});
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe("active");
    expect(merged[0].resolvedAt).toBeNull();
  });

  it("retains resolved history rows that are still not failing", () => {
    const rid = new mongoose.Types.ObjectId();
    const existing = {
      items: [
        {
          _id: rid,
          normalizedTag: "graphs",
          conceptTag: "Graphs",
          status: "resolved",
          priorityScore: 20,
          failureCount: 1,
          sources: [],
          lastFailedAt: new Date("2026-01-01"),
          resolvedAt: new Date("2026-01-10"),
        },
      ],
    };

    const merged = mergeAggregatedWithExisting([], existing, {});
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe("resolved");
    expect(merged[0]._id.toString()).toBe(rid.toString());
  });
});
